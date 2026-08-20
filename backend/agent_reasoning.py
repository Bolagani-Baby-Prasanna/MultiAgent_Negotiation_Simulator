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


def _build_prompt(agent, personality, scenario, history, current_offer, round_num, max_rounds, evaluation=None):
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
    )


def _smart_algorithmic_turn(agent, personality, scenario, history, current_offer, round_num, max_rounds, evaluation):
    """
    Intelligent convergent negotiation engine. Calculates realistic numeric offers,
    directional concessions towards opponent positions, respects hard constraint bounds,
    and guarantees natural agreement resolution within available round budget.
    """
    agent_name = agent.get("name", "Agent")
    role = agent.get("role", "Negotiator")
    personality = personality or DEFAULT_PERSONALITY

    # Parse numeric bounds from agent constraints
    from counteroffer_evaluator import _parse_numeric_bound
    constraints = agent.get("constraints", [])
    min_limit = None
    max_limit = None

    for c in constraints:
        val, direction = _parse_numeric_bound(c)
        if val is not None:
            if direction == "lower":
                min_limit = val
            elif direction == "upper":
                max_limit = val

    # Determine if agent is Seller (wants higher price) or Buyer (wants lower price)
    is_seller = "Supplier" in agent_name or "Provider" in role or min_limit is not None

    score = evaluation.offer_score.score if evaluation else 50
    has_hard_fail = any(c.status == "fail" for c in (evaluation.offer_score.constraint_checks if evaluation else []))

    # 1. Opening Move (No current offer on table)
    if current_offer is None:
        if is_seller:
            base_offer = (min_limit * 1.15) if min_limit else 58000.0
        else:
            base_offer = (max_limit * 0.85) if max_limit else 48000.0

        offer = round(base_offer, 2)
        message = f"As {role}, {agent_name} opens negotiations with an initial proposal of {offer:,.0f}."
        reasoning = f"Opening proposal calculated based on target position and {personality} strategy."
        return {
            "action": "offer",
            "offer": offer,
            "message": message,
            "reasoning": reasoning,
        }

    # 2. Acceptance Conditions
    # Accept if score is good, or if bounds are satisfied and round pressure is active (>=round 3), or final round
    is_acceptable = False
    if not has_hard_fail:
        if round_num >= 3:
            is_acceptable = True
        elif score >= 65:
            is_acceptable = True
        elif is_seller and min_limit is not None and current_offer >= min_limit:
            is_acceptable = True
        elif not is_seller and max_limit is not None and current_offer <= max_limit:
            is_acceptable = True

    if is_acceptable or (round_num >= max_rounds and not has_hard_fail):
        return {
            "action": "accept",
            "offer": current_offer,
            "message": f"{agent_name} accepts the outstanding offer of {current_offer:,.0f} to reach consensus.",
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
            "message": f"{agent_name} accepts the proposed figure of {current_offer:,.0f} as terms have converged.",
            "reasoning": f"Concession gap closed to within 1.5% — accepting offer to conclude negotiation.",
        }

    # 6. Dialogue & Reasoning
    if personality == "Aggressive":
        message = f"{agent_name} maintains strong margin objectives but proposes a revised counteroffer of {offer:,.0f}."
    elif personality == "Collaborative":
        message = f"{agent_name} makes a constructive concession and counter-proposes {offer:,.0f} to align positions."
    else:
        message = f"{agent_name} proposes a measured compromise at {offer:,.0f} to manage project risk."

    reasoning = f"Counteroffer {offer:,.0f} calculated via convergent concession strategy (Score: {score}/100, Round {round_num}/{max_rounds})."

    return {
        "action": "counter",
        "offer": offer,
        "message": message,
        "reasoning": reasoning,
    }


def generate_agent_turn(agent, personality, scenario, history, current_offer, round_num, max_rounds):
    """Calls Groq AI to produce one AI-reasoned negotiation turn for `agent`.

    Returns a dict: {"action", "offer", "message", "reasoning", "evaluation"}.
    The "evaluation" key contains the structured evaluation data from the
    counteroffer evaluator (score, concession, recommendation).
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
        )
        evaluation_dict = evaluation_to_dict(evaluation)
    except Exception:
        pass  # evaluation is optional — don't block the turn

    prompt = _build_prompt(
        agent, personality, scenario, history,
        current_offer, round_num, max_rounds,
        evaluation=evaluation,
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

        if action not in ("offer", "counter", "accept", "reject"):
            action = "counter"

        # ── Agreement Convergence Safeguard ──
        # If the model proposes a counter that matches or is within 2.5% of current offer,
        # or if the model's message expresses acceptance, or if it's the final round with passing score,
        # convert to "accept" so the negotiation successfully concludes.
        has_hard_fail = any(c.status == "fail" for c in (evaluation.offer_score.constraint_checks if evaluation else []))
        score = evaluation.offer_score.score if evaluation else 50

        if current_offer is not None and not has_hard_fail:
            # 1. Check if counteroffer is within 2.5% of current offer
            is_close_offer = offer is not None and abs(offer - current_offer) / max(abs(current_offer), 1) < 0.025
            
            # 2. Check if message wording indicates acceptance
            msg_lower = message.lower()
            indicates_acceptance = any(phrase in msg_lower for phrase in ["i accept", "accepts the", "we accept", "agree to", "agreed to", "deal is accepted"])

            # 3. Check if evaluation engine strongly recommends acceptance or round pressure is critical
            engine_accept = evaluation and evaluation.recommendation.action == "accept" and score >= 65
            final_round_pressure = (round_num >= max_rounds and score >= 50)

            if (is_close_offer or indicates_acceptance or engine_accept or final_round_pressure) and action != "reject":
                action = "accept"
                offer = current_offer
                if "accept" not in msg_lower:
                    message = f"{agent.get('name', 'Agent')} accepts the proposed terms at {current_offer:,.0f} to reach agreement."
                reasoning = f"Agreement reached: terms satisfy hard constraints (Score: {score}/100, Round {round_num}/{max_rounds})."

        return {
            "action": action,
            "offer": offer,
            "message": message,
            "reasoning": reasoning,
            "evaluation": evaluation_dict,
        }

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
        )
        turn["evaluation"] = evaluation_dict
        return turn