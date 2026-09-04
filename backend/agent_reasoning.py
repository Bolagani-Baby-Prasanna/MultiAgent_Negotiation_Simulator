import json
import os

from dotenv import load_dotenv
from counteroffer_evaluator import evaluate_offer, evaluation_to_dict

load_dotenv()

# ------------------------------------------------------------------
# Groq AI Client setup
# ------------------------------------------------------------------
groq_api_key = os.environ.get("GROQ_API_KEY")
_groq_client = None
if groq_api_key:
    try:
        from groq import Groq
        _groq_client = Groq(api_key=groq_api_key)
    except Exception as e:
        print(f"Warning: Failed to initialize Groq client in agent_reasoning: {e}")

# ------------------------------------------------------------------
# Prompts & Personality setup (single unified prompt template module)
# ------------------------------------------------------------------
from prompt_templates import (
    DEFAULT_PERSONALITY,
    PERSONALITY_PROMPTS,
    format_history as _format_history,
    get_agent_prompt,
)


# Negotiations must show sustained back-and-forth before settling. The LLM does not
# always honour the "don't settle early" prompt rule, so this floor is enforced in code:
# no agent may accept before this round unless the round budget itself is smaller.
MIN_ROUNDS_BEFORE_ACCEPT = 5


def _forced_counter_offer(agent, history, current_offer):
    """
    Pick a counter value for an agent that wanted to accept too early.

    Concedes a quarter of the way from the agent's own last offer toward the
    current one, so the move is a genuine (and correctly directed) concession.
    Agents with no position on the table yet fall back to a small step in the
    direction that favours their side.
    """
    agent_name = agent.get("name", "")
    my_last = None
    for entry in reversed(history):
        if entry.get("agent") == agent_name and entry.get("offer") is not None:
            my_last = entry["offer"]
            break

    if my_last is not None and abs(my_last - current_offer) > 1e-9:
        return round(my_last + 0.25 * (current_offer - my_last), 2)

    is_seller = "Supplier" in agent_name or "Provider" in agent.get("role", "")
    return round(current_offer * (1.03 if is_seller else 0.97), 2)


def _enforce_min_rounds(turn, agent, history, current_offer, round_num, max_rounds):
    """Downgrade a premature "accept" into a real counter so negotiations run their course."""
    floor = min(MIN_ROUNDS_BEFORE_ACCEPT, max_rounds)
    if turn.get("action") != "accept" or round_num >= floor or current_offer is None:
        return turn

    counter_offer = _forced_counter_offer(agent, history, current_offer)
    turn["action"] = "counter"
    turn["offer"] = counter_offer
    unit_str = f" {turn.get('unit')}" if turn.get("unit") else ""
    turn["message"] = (
        f"I see merit in the proposal of {current_offer:,.0f}{unit_str}, and we are certainly moving in the right direction. "
        f"However, given our current project constraints and operational margins, we cannot close prematurely without protecting our core requirements. "
        f"I am putting forward a revised counter-proposal of {counter_offer:,.0f}{unit_str} so we can continue working toward a balanced consensus."
    )
    turn["reasoning"] = (
        f"Terms are workable, but as we are only in round {round_num} of {max_rounds}, "
        f"we are making a progressive concession ({counter_offer:,.0f}) to secure optimal terms rather than settling early."
    )
    return turn


def _build_prompt(agent, personality, scenario, history, current_offer, round_num, max_rounds, evaluation=None, current_offer_unit=None, is_deadlocked=False):
    """Builds the agent-specific prompt using the specialized prompts module."""
    return get_agent_prompt(
        agent=agent,
        personality=personality,
        scenario=scenario,
        history=history,
        current_offer=current_offer,
        round_num=round_num,
        max_rounds=max_rounds,
        evaluation=evaluation,
        current_offer_unit=current_offer_unit,
        is_deadlocked=is_deadlocked,
    )


def _smart_algorithmic_turn(agent, personality, scenario, history, current_offer, round_num, max_rounds, evaluation, current_offer_unit=None):
    """
    Intelligent convergent negotiation engine. Calculates realistic numeric offers,
    directional concessions towards opponent positions, respects hard constraint bounds,
    and guarantees natural agreement resolution within available round budget.
    """
    agent_name = agent.get("name", "Agent")
    role = agent.get("role", "Negotiator")
    personality = personality or DEFAULT_PERSONALITY

    # Parse numeric bounds from agent constraints
    from counteroffer_evaluator import _parse_numeric_bound, parse_unit_label
    constraints = agent.get("constraints", [])
    min_limit = None
    max_limit = None
    limit_unit = None  # what min_limit/max_limit actually measures

    for c in constraints:
        val, direction = _parse_numeric_bound(c)
        if val is not None:
            if direction == "lower":
                min_limit = val
                limit_unit = parse_unit_label(c) or limit_unit
            elif direction == "upper":
                max_limit = val
                limit_unit = parse_unit_label(c) or limit_unit

    # Determine if agent is Seller (wants higher price) or Buyer (wants lower price)
    is_seller = "Supplier" in agent_name or "Provider" in role or min_limit is not None

    score = evaluation.offer_score.score if evaluation else 50
    has_hard_fail = any(c.status == "fail" for c in (evaluation.offer_score.constraint_checks if evaluation else []))

    # 1. Opening Move (No current offer on table)
    unit_str = f" {limit_unit}" if limit_unit else ""
    if current_offer is None:
        if is_seller:
            base_offer = (min_limit * 1.15) if min_limit else 58000.0
        else:
            base_offer = (max_limit * 0.85) if max_limit else 48000.0

        offer = round(base_offer, 2)
        
        # Natural spoken opening based on role
        if "supplier" in agent_name.lower() or "provider" in role.lower():
            message = (
                f"Thank you everyone for joining today's session. Speaking on behalf of our logistics and production team, "
                f"our current manufacturing commitments and raw material costs require a solid commercial baseline. "
                f"To guarantee dedicated factory capacity and priority dispatch, I am proposing an opening figure of {offer:,.0f}{unit_str}. "
                f"Let's discuss how we can schedule deliveries to keep your job site operating seamlessly."
            )
        elif "contractor" in agent_name.lower():
            message = (
                f"Good morning everyone. Looking closely at our active work-fronts and structural deadlines, securing these resources without downtime is our highest priority. "
                f"We have analyzed our allocated project budget and manpower requirements, and I am putting an opening proposal of {offer:,.0f}{unit_str} on the table. "
                f"We are prepared to collaborate on flexible delivery windows and milestones to ensure this is feasible for all parties."
            )
        elif "finance" in agent_name.lower():
            message = (
                f"From the financial management perspective, our primary obligation is ensuring all project commitments remain strictly within our approved baseline. "
                f"We cannot afford unbudgeted variances or premature depletion of our contingency reserve. "
                f"I am opening our allocation at {offer:,.0f}{unit_str}, and we will require structured milestone-based billing to proceed."
            )
        elif "project manager" in agent_name.lower():
            message = (
                f"Looking at our master construction schedule, maintaining the critical path sequence is essential to avoid compounding milestone delays. "
                f"We need an aligned arrangement where work does not stall on-site while respecting our cost framework. "
                f"I'd like to table an opening target of {offer:,.0f}{unit_str} to establish our baseline for discussion."
            )
        else:
            message = (
                f"As {role}, our objective is to ensure quality deliverables while respecting our milestone and cost constraints. "
                f"I am opening our formal proposal at {offer:,.0f}{unit_str}. "
                f"I look forward to constructive dialogue so we can achieve a workable consensus."
            )

        reasoning = f"Opening proposal calculated based on target position and {personality} strategy."
        return {
            "action": "offer",
            "offer": offer,
            "unit": limit_unit,
            "message": message,
            "reasoning": reasoning,
        }

    # 2. Acceptance Conditions
    # Accept if score is very good, or if round pressure is active near the final round, or final round
    is_acceptable = False
    if not has_hard_fail:
        if round_num >= max_rounds - 1:
            is_acceptable = True
        elif score >= 90:
            is_acceptable = True
        elif is_seller and min_limit is not None and current_offer >= min_limit:
            is_acceptable = True
        elif not is_seller and max_limit is not None and current_offer <= max_limit:
            is_acceptable = True

    effective_unit = current_offer_unit or limit_unit
    effective_unit_str = f" {effective_unit}" if effective_unit else ""

    if is_acceptable or (round_num >= max_rounds and not has_hard_fail):
        return {
            "action": "accept",
            "offer": current_offer,
            "unit": effective_unit,
            "message": (
                f"I've thoroughly reviewed the latest terms with our team, and the current proposal of {current_offer:,.0f}{effective_unit_str} "
                f"satisfies our core requirements while keeping the project on schedule. "
                f"I appreciate everyone's willingness to make meaningful concessions over these discussions. "
                f"We accept this offer and are ready to finalize the agreement and proceed with execution."
            ),
            "reasoning": f"Accepted terms as evaluation score ({score}/100) satisfies constraints and meets agreement target.",
        }

    # 3. Find agent's previous offer from history
    agent_previous_offers = [
        float(h["offer"]) for h in history
        if h.get("agent") == agent_name and h.get("offer") is not None
    ]
    
    if agent_previous_offers:
        last_my_offer = agent_previous_offers[-1]
    else:
        # Opening baseline anchored to current offer scale
        if current_offer is not None:
            last_my_offer = current_offer * 1.10 if is_seller else current_offer * 0.90
        else:
            last_my_offer = (min_limit * 1.15) if (is_seller and min_limit) else ((max_limit * 0.85) if max_limit else 50000.0)

    # 4. Concession Step Calculation
    # Concession rate per step based on personality and round pressure
    concession_factor = 0.25 if personality == "Aggressive" else (0.40 if personality == "Collaborative" else 0.30)
    if round_num >= (max_rounds / 2):
        concession_factor += 0.15  # accelerate concessions as round limit approaches

    if is_seller:
        # Seller steps DOWN from last offer towards current_offer (buyer's bid), but never below min_limit
        distance = max(0.0, last_my_offer - current_offer)
        raw_offer = last_my_offer - (distance * concession_factor)
        if min_limit is not None and min_limit <= current_offer * 2:
            offer = round(max(min_limit, raw_offer), 2)
        else:
            offer = round(max(current_offer, raw_offer), 2)
    else:
        # Buyer steps UP from last offer towards current_offer (seller's ask), but never above max_limit
        distance = max(0.0, current_offer - last_my_offer)
        raw_offer = last_my_offer + (distance * concession_factor)
        if max_limit is not None and max_limit >= current_offer * 0.5:
            offer = round(min(max_limit, raw_offer), 2)
        else:
            offer = round(min(current_offer, raw_offer), 2)

    # 5. Check if calculated offer is virtually equal to current_offer -> ACCEPT instead of echoing
    if abs(offer - current_offer) < (current_offer * 0.015) and not has_hard_fail:
        return {
            "action": "accept",
            "offer": current_offer,
            "unit": effective_unit,
            "message": (
                f"We are now virtually aligned on terms, and the proposed figure of {current_offer:,.0f}{effective_unit_str} represents a workable balance for our side. "
                f"Rather than continuing back-and-forth on minor margins, I am pleased to accept this offer so we can mobilize our teams immediately."
            ),
            "reasoning": f"Concession gap closed to within 1.5% — accepting offer to conclude negotiation.",
        }

    # 6. Dialogue & Reasoning
    offer_unit_str = f" {effective_unit}" if effective_unit else ""
    if personality == "Aggressive":
        message = (
            f"I hear what you're proposing, but that figure cuts too heavily into our operational margins and ignores the true costs on our end. "
            f"We have strict quality and safety thresholds that cannot be compromised. "
            f"However, in the spirit of making progress, I am willing to adjust our counter-offer to {offer:,.0f}{offer_unit_str}. "
            f"This is a fair, defensible position that reflects our commitment to delivering without cutting corners."
        )
    elif personality == "Collaborative":
        message = (
            f"I appreciate the flexibility you've demonstrated in your recent proposals, and I agree we need to bridge this gap to keep the site moving. "
            f"We've reassessed our internal cost buffers and are prepared to take a meaningful step towards your numbers. "
            f"I would like to counter with {offer:,.0f}{offer_unit_str}. "
            f"If we can meet at this level, it creates a genuine win-win that protects the schedule and meets everyone's expectations."
        )
    else:
        message = (
            f"We've analyzed the outstanding proposal against our risk limits and contingency allocations. "
            f"Moving too quickly or stretching our bounds could expose the project to downstream compliance issues. "
            f"To keep risk strictly managed while showing steady progress, I am putting forward a counter of {offer:,.0f}{offer_unit_str}. "
            f"This gives us a safe, predictable baseline that all stakeholders can rely on."
        )

    reasoning = (
        f"Counteroffer {offer:,.0f}{offer_unit_str} calculated via convergent concession strategy "
        f"(Score: {score}/100, Round {round_num}/{max_rounds}, personality: {personality})."
    )

    return {
        "action": "counter",
        "offer": offer,
        "unit": effective_unit,
        "message": message,
        "reasoning": reasoning,
    }


def generate_agent_turn(agent, personality, scenario, history, current_offer, round_num, max_rounds, current_offer_unit=None, is_deadlocked=False):
    """Calls Groq AI to produce one AI-reasoned negotiation turn for `agent`.

    Returns a dict: {"action", "offer", "unit", "message", "reasoning", "evaluation"}.
    The "unit" key is a short label for what "offer" actually measures (e.g.
    "workers", "days", "price per ton") — tracked so agents stay anchored to
    the same topic instead of silently drifting between different
    quantities across turns. The "evaluation" key contains the structured
    evaluation data from the counteroffer evaluator (score, concession,
    recommendation).
    Never raises — uses smart algorithmic negotiation generation on fallback
    so the API endpoint always returns a fully realistic turn response.
    """
    personality = personality or DEFAULT_PERSONALITY

    # ── Run the evaluation engine ──
    evaluation = None
    evaluation_dict = None
    try:
        evaluation = evaluate_offer(
            agent=agent,
            personality=personality,
            scenario=scenario,
            history=history,
            current_offer=current_offer,
            round_num=round_num,
            max_rounds=max_rounds,
            offer_unit=current_offer_unit,
        )
        evaluation_dict = evaluation_to_dict(evaluation)
    except Exception:
        pass  # evaluation is optional — don't block the turn

    prompt = _build_prompt(
        agent, personality, scenario, history,
        current_offer, round_num, max_rounds,
        evaluation=evaluation,
        current_offer_unit=current_offer_unit,
        is_deadlocked=is_deadlocked,
    )

    try:
        if not _groq_client:
            raise ValueError("Groq client not initialized")

        candidate_models = ["groq/compound", "qwen/qwen3.6-27b", "openai/gpt-oss-120b"]
        response = None
        last_err = None

        for model_name in candidate_models:
            try:
                response = _groq_client.chat.completions.create(
                    messages=[
                        {
                            "role": "system",
                            "content": (
                                "You are an expert commercial negotiation AI agent in a simulated construction project. "
                                "Your goal is to reach a binding, mutually acceptable agreement within the allocated rounds. "
                                "If the current offer satisfies your non-negotiable hard constraints and is reasonably close, "
                                "choose 'accept' to finalize the deal. "
                                "You MUST respond ONLY with a valid JSON object."
                            ),
                        },
                        {"role": "user", "content": prompt},
                    ],
                    model=model_name,
                    response_format={"type": "json_object"},
                    temperature=0.6,
                )
                if response:
                    break
            except Exception as model_err:
                last_err = model_err
                continue

        if not response:
            raise last_err or ValueError("All Groq candidate models failed")

        content = response.choices[0].message.content
        data = json.loads(content)

        action = data.get("action", "counter")
        offer = data.get("offer")
        message = data.get("message", "")
        reasoning = data.get("reasoning", "")

        # The model should echo a "unit" every turn. If it forgets: when
        # continuing an existing offer, assume it meant to stay on the same
        # topic; when opening fresh, guess from the agent's own constraints.
        unit = data.get("unit")
        if not unit:
            if current_offer_unit:
                unit = current_offer_unit
            else:
                from counteroffer_evaluator import parse_unit_label
                for c in agent.get("constraints", []):
                    guess = parse_unit_label(c)
                    if guess:
                        unit = guess
                        break

        if action not in ("offer", "counter", "accept", "reject"):
            action = "counter"

        # ── Agreement Convergence Safeguard ──
        # If the model proposes a counter that is virtually identical to the current offer,
        # or if the model's message expresses acceptance, or if the evaluation engine scores the
        # offer very highly, or if it's the final round with a passing score, convert to "accept"
        # so the negotiation successfully concludes rather than looping forever.
        has_hard_fail = any(c.status == "fail" for c in (evaluation.offer_score.constraint_checks if evaluation else []))
        score = evaluation.offer_score.score if evaluation else 50

        if current_offer is not None and not has_hard_fail:
            # 1. Check if counteroffer is within 1% of current offer (virtually identical)
            is_close_offer = offer is not None and abs(offer - current_offer) / max(abs(current_offer), 1) < 0.01

            # 2. Check if message wording indicates acceptance
            msg_lower = message.lower()
            indicates_acceptance = any(phrase in msg_lower for phrase in ["i accept", "accepts the", "we accept", "agree to", "agreed to", "deal is accepted"])

            # 3. Only true final-round pressure forces a close — a high score alone is not enough,
            # since a comfortable score can legitimately occur well before both sides are done negotiating.
            final_round_pressure = (round_num >= max_rounds and score >= 50)

            if (is_close_offer or indicates_acceptance or final_round_pressure) and action != "reject":
                action = "accept"
                offer = current_offer
                if "accept" not in msg_lower:
                    unit_str = f" {unit}" if unit else ""
                    message = (
                        f"We have reached a sensible alignment on terms. The proposed figure of {current_offer:,.0f}{unit_str} "
                        f"satisfies our project requirements and provides the stability we need to move forward. "
                        f"I am pleased to formally accept this proposal so we can finalize our agreement and proceed with execution immediately."
                    )
                reasoning = f"Agreement reached: terms satisfy hard constraints (Score: {score}/100, Round {round_num}/{max_rounds})."

        turn = {
            "action": action,
            "offer": offer,
            "unit": unit,
            "message": message,
            "reasoning": reasoning,
            "evaluation": evaluation_dict,
        }
        return _enforce_min_rounds(turn, agent, history, current_offer, round_num, max_rounds)

    except Exception as e:
        # Fallback to smart algorithmic turn generator
        turn = _smart_algorithmic_turn(
            agent=agent,
            personality=personality,
            scenario=scenario,
            history=history,
            current_offer=current_offer,
            round_num=round_num,
            max_rounds=max_rounds,
            evaluation=evaluation,
            current_offer_unit=current_offer_unit,
        )
        turn["evaluation"] = evaluation_dict
        return _enforce_min_rounds(turn, agent, history, current_offer, round_num, max_rounds)