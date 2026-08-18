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
# Personality behavior descriptions
# (mirrors PERSONALITIES in the frontend's App.tsx — keep these in sync)
# ------------------------------------------------------------------
PERSONALITY_PROMPTS = {
    "Aggressive": (
        "You push hard for maximum gain on every point. You concede slowly "
        "and only when the alternative is clearly worse than holding firm. "
        "Your offers stay close to your ideal outcome for as long as possible."
    ),
    "Collaborative": (
        "You look for win-win outcomes and value reaching consensus. You are "
        "willing to make meaningful concessions early if it moves the group "
        "toward agreement, as long as your hard constraints are respected."
    ),
    "Risk-Averse": (
        "You prioritize safe, predictable outcomes over chasing the best "
        "possible deal. You avoid offers that could fall through and prefer "
        "modest, defensible terms that are unlikely to be rejected."
    ),
}

DEFAULT_PERSONALITY = "Collaborative"



def _format_history(history):
    if not history:
        return "No offers have been made yet. This is the opening move."

    lines = []
    for entry in history:
        offer_part = f" (offer: {entry['offer']})" if entry.get("offer") is not None else ""
        lines.append(
            f"Round {entry['round']} — {entry['agent']} [{entry['action']}]: "
            f"{entry['message']}{offer_part}"
        )
    return "\n".join(lines)


def _build_prompt(agent, personality, scenario, history, current_offer, round_num, max_rounds, evaluation=None):
    other_agents = [a for a in scenario.get("agents", []) if a.get("name") != agent.get("name")]
    other_names = ", ".join(a.get("name", "") for a in other_agents) or "the other parties"

    constraints = agent.get("constraints", [])
    constraints_text = "\n".join(f"- {c}" for c in constraints) or "- None specified"

    pressure_note = (
        "This is the final round — weigh the cost of no deal carefully."
        if round_num >= max_rounds
        else f"You are in round {round_num} of {max_rounds}."
    )

    # ── Evaluation advisory block ──
    eval_block = ""
    if evaluation is not None:
        ev = evaluation_to_dict(evaluation)
        score = ev["offer_score"]
        rec = ev["recommendation"]
        conc = ev["concession_data"]

        constraint_lines = []
        for cc in score["constraint_checks"]:
            icon = {"pass": "✅", "warn": "⚠️", "fail": "❌"}.get(cc["status"], "•")
            constraint_lines.append(f"  {icon} {cc['text']} — {cc['detail']}")
        constraint_analysis = "\n".join(constraint_lines) or "  (no constraints parsed)"

        counter_range = ""
        if rec.get("suggested_counter_low") is not None:
            counter_range = (
                f"\n  Suggested counter range: {rec['suggested_counter_low']:,.0f}"
                f" – {rec['suggested_counter_high']:,.0f}"
            )

        eval_block = f"""

── EVALUATION ADVISORY (from the analysis engine — use as guidance, not as a rule) ──
Offer Score: {score['score']}/100 — {score['summary']}
Constraint Analysis:
{constraint_analysis}

Your Concession Data:
  Opening offer: {conc['opening_offer']}
  Current position: {conc['current_offer']}
  Concession rate: {conc['concession_rate']:.1%}
  Remaining room: {conc['remaining_room']:.1%}

Engine Recommendation: {rec['action'].upper()} (confidence: {rec['confidence']:.0%})
  Reasoning: {rec['reasoning']}{counter_range}
── END ADVISORY ──
"""

    return f"""You are role-playing as "{agent.get('name')}" ({agent.get('role', 'Negotiator')}) in a
multi-agent construction-project negotiation simulation: "{scenario.get('name', 'Negotiation')}".

Scenario context: {scenario.get('description', 'No description provided.')}

YOUR GOAL:
{agent.get('goal', 'Reach a favorable outcome.')}

YOUR HARD CONSTRAINTS (never propose or accept terms that violate these):
{constraints_text}

YOUR NEGOTIATION PERSONALITY — {personality}:
{PERSONALITY_PROMPTS.get(personality, PERSONALITY_PROMPTS[DEFAULT_PERSONALITY])}

You are negotiating against: {other_names}.

NEGOTIATION HISTORY SO FAR:
{_format_history(history)}

CURRENT OUTSTANDING OFFER ON THE TABLE: {current_offer if current_offer is not None else "None yet"}
{pressure_note}
{eval_block}
Decide your next move. Choose exactly one action:
- "offer": propose fresh terms (use when no offer exists yet, i.e. you are opening).
- "counter": propose different terms in response to the current offer.
- "accept": agree to the current outstanding offer as-is (only if it satisfies your constraints and goal reasonably well).
- "reject": refuse the current offer outright without a counter (rare — only if it violates a hard constraint and no adjustment is possible).

Respond with ONLY a JSON object, no markdown, no extra text, in exactly this shape:
{{
  "action": "offer" | "counter" | "accept" | "reject",
  "offer": <number, or null if action is "reject">,
  "message": "<one or two sentences, in character, that you'd actually say to the other parties>",
  "reasoning": "<one short sentence of private reasoning explaining why, not shown to other agents>"
}}

The "offer" field must be a single numeric value relevant to this negotiation (e.g. price, quantity, days —
infer the right unit from the scenario and history). Stay strictly within your hard constraints.
"""


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
    # Accept if score is high (>=70), or if offer satisfies bounds & round pressure is active (>=round 3)
    is_acceptable = False
    if not has_hard_fail:
        if is_seller and min_limit is not None and current_offer >= min_limit:
            if score >= 65 or round_num >= 3:
                is_acceptable = True
        elif not is_seller and max_limit is not None and current_offer <= max_limit:
            if score >= 65 or round_num >= 3:
                is_acceptable = True
        elif score >= 75:
            is_acceptable = True

    if is_acceptable or (round_num >= max_rounds and not has_hard_fail and score >= 50):
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
        # Opening baseline
        last_my_offer = (min_limit * 1.15) if (is_seller and min_limit) else ((max_limit * 0.85) if max_limit else (current_offer * 1.10 if is_seller else current_offer * 0.90))

    # 4. Concession Step Calculation
    # Concession rate per step based on personality and round pressure
    concession_factor = 0.20 if personality == "Aggressive" else (0.35 if personality == "Collaborative" else 0.28)
    if round_num >= (max_rounds / 2):
        concession_factor += 0.10  # accelerate concessions as round limit approaches

    if is_seller:
        # Seller steps DOWN from last offer towards current_offer (buyer's bid), but never below min_limit
        distance = max(0.0, last_my_offer - current_offer)
        raw_offer = last_my_offer - (distance * concession_factor)
        if min_limit is not None:
            offer = round(max(min_limit, raw_offer), 2)
        else:
            offer = round(max(current_offer, raw_offer), 2)
    else:
        # Buyer steps UP from last offer towards current_offer (seller's ask), but never above max_limit
        distance = max(0.0, current_offer - last_my_offer)
        raw_offer = last_my_offer + (distance * concession_factor)
        if max_limit is not None:
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
                                "You are an expert negotiation AI agent participating in a simulated construction negotiation. "
                                "You MUST respond ONLY with a valid JSON object."
                            ),
                        },
                        {"role": "user", "content": prompt},
                    ],
                    model=model_name,
                    response_format={"type": "json_object"},
                    temperature=0.7,
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

        action = data.get("action")
        if action not in ("offer", "counter", "accept", "reject"):
            raise ValueError(f"Invalid action from model: {action!r}")


        return {
            "action": action,
            "offer": data.get("offer"),
            "message": data.get("message", ""),
            "reasoning": data.get("reasoning", ""),
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