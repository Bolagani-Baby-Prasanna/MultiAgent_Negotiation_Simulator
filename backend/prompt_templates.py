"""
Single Unified Prompt Template Module for Multi-Agent Construction Negotiation Simulator.
Consolidates all agent domain guidelines, personality modifiers, history & evaluation
formatters, and master prompt generation into a single, self-contained file.
"""

import json
from typing import Any, Dict, List, Optional
from counteroffer_evaluator import evaluation_to_dict

# ------------------------------------------------------------------
# Personality behavior descriptions
# ------------------------------------------------------------------
PERSONALITY_PROMPTS: Dict[str, str] = {
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


# ------------------------------------------------------------------
# Specialized Domain Guidelines for Each Agent Role
# ------------------------------------------------------------------
AGENT_DOMAIN_GUIDELINES: Dict[str, str] = {
    "contractor": """ROLE: General Contractor / Material Buyer / Workforce Manager
PRIORITIES & TRADE-OFF RULES:
- Material Pricing vs. Quality: Enforce specs (e.g. Fe-500 grade or above); push unit price down without sacrificing structural safety.
- Lead Time vs. Downtime: Fast delivery (3-5 days) prevents worker downtime; concede slightly on price if delivery is expedited.
- Workforce & Overtime: Balance overtime pay premiums (1.5x) with safety limits (max 10-12 hrs/week).
- Concession Tactic: Open conservatively; concede in measured increments; bridge gaps in late rounds to prevent site delays.""",

    "supplier": """ROLE: Material Supplier / Vendor / Fabricator
PRIORITIES & TRADE-OFF RULES:
- Floor Price Defense: Strictly defend your minimum unit price floor; open 10-20% above floor to allow tactical concession room.
- Volume Discounts: Offer marginal price concessions for larger order commitments or batched deliveries.
- Expedited Freight: If fast delivery (3-5 days) is demanded, hold firm on price or charge an expedited premium.
- Payment Terms: Favor guaranteed milestones and 30-60 day credit terms; step down towards buyer counters without breaching profit floor.""",

    "finance": """ROLE: Finance Manager / Budget Gatekeeper / Cost Controller
PRIORITIES & TRADE-OFF RULES:
- Budget Ceilings: Enforce approved total budget caps; strictly resist unneeded contingency reserve depletion.
- Cash Flow Optimization: Favor extended payment cycles (45-60 days) to keep monthly operational cash flow positive.
- Cost-Benefit Trade-offs: Compare material variance costs against the liability of client liquidated damages.
- Concession Tactic: Act as a financial anchor; concede on small increments only if offset by savings elsewhere.""",

    "project manager": """ROLE: Project Manager / Schedule Coordinator / Scope Mediator
PRIORITIES & TRADE-OFF RULES:
- Critical Path Integrity: Defend structural milestone dates vigorously; critical path delays ripple across the entire project.
- Scope & Schedule Mediation: Propose pragmatic trade-offs (re-sequencing non-critical tasks, phased deliveries, value engineering).
- Safety & Code Compliance: Never compromise safety inspections, structural integrity, or regulatory standards.
- Concession Tactic: Act as consensus builder; offer schedule flexibility on non-critical items to lock in critical commitments.""",

    "client": """ROLE: Client / Project Owner / Developer
PRIORITIES & TRADE-OFF RULES:
- Core Scope Preservation: Core deliverables and architectural finish standards are strictly non-negotiable.
- Milestone Enforcement: Hard handover dates are critical; enforce contractual delay penalties (liquidated damages) if deadlines slip.
- Quality Assurance: Require verified compliance certificates and audit reports before releasing milestone payments.
- Concession Tactic: Maintain authority; grant minor schedule grace only in exchange for binding price locks and completion guarantees.""",

    "default": """ROLE: Commercial Negotiator
PRIORITIES & TRADE-OFF RULES:
- Balance your primary goal with the hard constraints specified in your mandate.
- Evaluate the outstanding offer against your target range and adapt your strategy to the current round pressure."""
}


# ------------------------------------------------------------------
# Master Prompt Template
# ------------------------------------------------------------------
MASTER_PROMPT_TEMPLATE = """You are role-playing as "{agent_name}" ({role}) in a multi-agent construction negotiation simulation: "{scenario_name}".

SCENARIO CONTEXT:
{scenario_description}

YOUR PRIMARY GOAL:
{agent_goal}

YOUR HARD CONSTRAINTS (Strictly non-negotiable — never propose or accept terms that violate these):
{constraints_text}

YOUR NEGOTIATION PERSONALITY — {personality}:
{personality_description}

YOUR DOMAIN PLAYBOOK & TACTICAL GUIDELINES:
{domain_guidelines}

NEGOTIATING PARTIES:
You are actively negotiating against: {other_parties}.

NEGOTIATION TIMELINE & HISTORY:
{history_text}

CURRENT OUTSTANDING OFFER ON TABLE: {current_offer_text}
ROUND STATUS: {pressure_note}
{evaluation_advisory_text}
{deadlock_warning}
AGREEMENT & CONVERGENCE RULES (CRITICAL):
1. **Closing the Deal (Action: "accept")**:
   - The primary objective of this simulation is to REACH CONSENSUS, but only after sustained, realistic back-and-forth — a real negotiation does not settle in the first round or two.
   - Only choose "accept" if the current outstanding offer satisfies your hard constraints AND is virtually identical (within 1%) to your target position.
   - A high Evaluation Advisory score is NOT by itself a reason to accept early — keep countering with genuine concessions through the middle rounds even when an offer is workable, unless it is essentially identical to what you already asked for.
   - In the FINAL ROUND only: Deadlock causes project failure and severe delay penalties. If the offer does not violate a hard constraint, ACCEPT IT.

2. **Making Meaningful Progress (Action: "counter")**:
   - If you counter, your new offer MUST make a meaningful concession step (15% to 35% closer to the other party's position).
   - NEVER repeat your previous offer or make micro-adjustments that stall the negotiation.

3. **Opening Moves (Action: "offer")**:
   - Propose an initial realistic number that leaves reasonable room for negotiation.

4. **Walking Away (Action: "reject")**:
   - Use ONLY if the offer violates a non-negotiable hard constraint and no compromise is possible.

STAY ON THE SAME TOPIC (CRITICAL):
If there is a current offer on the table, your "unit" MUST match its unit above
(e.g. if the offer is in "workers", your counter must also be a number of
workers, not days or rupees). Multiple different quantities may be relevant
to this negotiation (price, days, workers) — do not silently switch which one
you're offering a number for. Only switch units if you are the one opening a
fresh line of negotiation and say so explicitly in your message.

DECISION INSTRUCTIONS:
Choose exactly one action:
- "offer": Propose fresh opening terms (only when no offer exists on the table yet).
- "counter": Propose modified terms moving significantly closer to the opponent to bridge the gap.
- "accept": Agree to the current outstanding offer as-is and finalize the deal.
- "reject": Walk away / terminate without agreement (rare).

SPOKEN DIALOGUE & CONVERSATIONAL STYLE INSTRUCTIONS (CRITICAL):
- Speak directly in the FIRST PERSON ("I", "we", "our team") as if speaking live in a high-stakes construction boardroom or project site coordination meeting.
- Address the other stakeholders directly by role or name (e.g., "Look, Contractor...", "From Finance's perspective...", "I hear your concerns, Supplier...").
- Do NOT write brief third-person summaries like "Contractor counters with 50,000".
- Provide a rich, detailed conversational response of 3 to 5 natural spoken sentences explaining your operational perspective, budget reality, schedule constraints, or supply chain trade-offs before clearly stating your proposed number.
- Sound like a seasoned construction professional with authentic industry vocabulary (e.g., site mobilization, lead times, critical path, overtime premiums, cash flow, contingency buffer, structural Fe-500 specs, liquidated damages).

OUTPUT REQUIREMENT:
Respond with ONLY a valid JSON object, no markdown formatting, no code fencing, no extra text.
Exact JSON schema:
{{
  "action": "offer" | "counter" | "accept" | "reject",
  "offer": <numeric value matching current offer if accepted or new counter number, or null if action is "reject">,
  "unit": "<short label for what the offer number measures, e.g. 'price per ton', 'workers', 'days' — must match the current offer's unit above unless you are deliberately changing topic>",
  "message": "<3 to 5 realistic, natural, in-character spoken sentences in first person ('I'/'we') directly addressing the other negotiating parties with rich reasoning and trade-offs>",
  "reasoning": "<2 to 3 sentences of internal private tactical chain-of-thought analysis explaining constraint score, concession math, and risk posture>"
}}

Note on the "offer" field: Provide a single clean numeric value matching the scenario's metric (e.g. price per unit, total budget, quantity, days).
"""


# ------------------------------------------------------------------
# Helper Functions
# ------------------------------------------------------------------
def format_history(history: Optional[List[Dict[str, Any]]]) -> str:
    """Formats negotiation message history into a readable timeline."""
    if not history:
        return "No offers have been made yet. This is the opening move."

    lines = []
    for entry in history:
        offer_part = ""
        if entry.get("offer") is not None:
            unit = entry.get("unit")
            offer_part = (
                f" (offer: {entry['offer']} {unit})" if unit
                else f" (offer: {entry['offer']})"
            )
        lines.append(
            f"Round {entry.get('round', 1)} — {entry.get('agent', 'Agent')} "
            f"[{entry.get('action', 'offer')}]: {entry.get('message', '')}{offer_part}"
        )
    return "\n".join(lines)


def format_evaluation_advisory(evaluation: Any) -> str:
    """Formats algorithmic evaluation engine recommendations into a clear advisory block."""
    if evaluation is None:
        return ""

    try:
        ev = evaluation_to_dict(evaluation)
        score = ev.get("offer_score", {})
        rec = ev.get("recommendation", {})
        conc = ev.get("concession_data", {})

        constraint_lines = []
        for cc in score.get("constraint_checks", []):
            icon = {"pass": "✅", "warn": "⚠️", "fail": "❌"}.get(cc.get("status"), "•")
            constraint_lines.append(f"  {icon} {cc.get('text', '')} — {cc.get('detail', '')}")
        constraint_analysis = "\n".join(constraint_lines) or "  (no constraints parsed)"

        counter_range = ""
        if rec.get("suggested_counter_low") is not None and rec.get("suggested_counter_high") is not None:
            counter_range = (
                f"\n  Suggested counter range: {rec['suggested_counter_low']:,.0f}"
                f" – {rec['suggested_counter_high']:,.0f}"
            )

        opening_str = f"{conc.get('opening_offer'):,.0f}" if isinstance(conc.get("opening_offer"), (int, float)) else str(conc.get("opening_offer"))
        current_str = f"{conc.get('current_offer'):,.0f}" if isinstance(conc.get("current_offer"), (int, float)) else str(conc.get("current_offer"))
        concession_rate = conc.get("concession_rate", 0.0)
        remaining_room = conc.get("remaining_room", 1.0)

        return f"""
── EVALUATION ADVISORY (from quantitative analysis engine — use as guidance) ──
Offer Score: {score.get('score', 0)}/100 — {score.get('summary', '')}
Constraint Analysis:
{constraint_analysis}

Your Concession Position:
  Opening offer: {opening_str}
  Current position: {current_str}
  Concession rate: {concession_rate:.1%}
  Remaining room: {remaining_room:.1%}

Engine Recommendation: {rec.get('action', 'COUNTER').upper()} (confidence: {rec.get('confidence', 0.0):.0%})
  Reasoning: {rec.get('reasoning', '')}{counter_range}
── END ADVISORY ──
"""
    except Exception:
        return ""


def get_domain_guidelines_for_agent(agent: Dict[str, Any]) -> str:
    """Selects the tailored domain guidelines based on the agent's name and role."""
    name = agent.get("name", "").lower()
    role = agent.get("role", "").lower()

    if "contractor" in name or "contractor" in role or "workforce" in role:
        return AGENT_DOMAIN_GUIDELINES["contractor"]
    elif "supplier" in name or "supplier" in role or "vendor" in role or "provider" in role:
        return AGENT_DOMAIN_GUIDELINES["supplier"]
    elif "finance" in name or "finance" in role or "cost" in role or "budget" in role:
        return AGENT_DOMAIN_GUIDELINES["finance"]
    elif "project manager" in name or "project manager" in role or "mediator" in role or "coordinator" in role:
        return AGENT_DOMAIN_GUIDELINES["project manager"]
    elif "client" in name or "client" in role or "owner" in role or "enforcer" in role:
        return AGENT_DOMAIN_GUIDELINES["client"]
    return AGENT_DOMAIN_GUIDELINES["default"]


def build_prompt_from_template(
    agent: Dict[str, Any],
    personality: str,
    scenario: Dict[str, Any],
    history: List[Dict[str, Any]],
    current_offer: Optional[float],
    round_num: int,
    max_rounds: int,
    evaluation: Optional[Any] = None,
    current_offer_unit: Optional[str] = None,
    is_deadlocked: bool = False,
) -> str:
    """Fills the MASTER_PROMPT_TEMPLATE with agent context, guidelines, and evaluation state."""
    agent_name = agent.get("name", "Negotiator")
    role = agent.get("role", "Negotiator")
    personality_key = personality or DEFAULT_PERSONALITY
    personality_description = PERSONALITY_PROMPTS.get(personality_key, PERSONALITY_PROMPTS[DEFAULT_PERSONALITY])

    other_agents = [a for a in scenario.get("agents", []) if a.get("name") != agent_name]
    other_parties = ", ".join(a.get("name", "") for a in other_agents) or "the other parties"

    constraints = agent.get("constraints", [])
    constraints_text = "\n".join(f"- {c}" for c in constraints) if constraints else "- None specified"

    pressure_note = (
        "⚠️ This is the FINAL ROUND — weigh the cost of deadlock carefully. A compromise is better than project failure."
        if round_num >= max_rounds
        else f"You are in round {round_num} of {max_rounds}."
    )

    if current_offer is not None:
        current_offer_text = f"{current_offer:,.0f}" + (f" {current_offer_unit}" if current_offer_unit else "")
    else:
        current_offer_text = "None yet (Opening round)"
    eval_block = format_evaluation_advisory(evaluation)
    domain_guidelines = get_domain_guidelines_for_agent(agent)

    # Build the deadlock warning block — injected as a high-priority
    # system alert only when the orchestrator has flagged a stall.
    if is_deadlocked:
        deadlock_warning = (
            "\n⚠️🚨 DEADLOCK DETECTED: The negotiation has stalled. "
            "You must make a significant concession this turn to resolve "
            "the deadlock, or the negotiation will permanently break down.\n"
        )
    else:
        deadlock_warning = ""

    return MASTER_PROMPT_TEMPLATE.format(
        agent_name=agent_name,
        role=role,
        scenario_name=scenario.get("name", "Negotiation"),
        scenario_description=scenario.get("description", "No description provided."),
        agent_goal=agent.get("goal", "Reach a favorable outcome within constraints."),
        constraints_text=constraints_text,
        personality=personality_key,
        personality_description=personality_description,
        domain_guidelines=domain_guidelines,
        other_parties=other_parties,
        history_text=format_history(history),
        current_offer_text=current_offer_text,
        pressure_note=pressure_note,
        evaluation_advisory_text=eval_block,
        deadlock_warning=deadlock_warning,
    )


# ------------------------------------------------------------------
# Entry Points & Role-Specific Builders
# ------------------------------------------------------------------
get_agent_prompt = build_prompt_from_template
build_base_prompt = build_prompt_from_template
build_contractor_prompt = build_prompt_from_template
build_supplier_prompt = build_prompt_from_template
build_finance_manager_prompt = build_prompt_from_template
build_project_manager_prompt = build_prompt_from_template
build_client_prompt = build_prompt_from_template

__all__ = [
    "PERSONALITY_PROMPTS",
    "DEFAULT_PERSONALITY",
    "AGENT_DOMAIN_GUIDELINES",
    "MASTER_PROMPT_TEMPLATE",
    "format_history",
    "format_evaluation_advisory",
    "get_domain_guidelines_for_agent",
    "build_prompt_from_template",
    "get_agent_prompt",
    "build_base_prompt",
    "build_contractor_prompt",
    "build_supplier_prompt",
    "build_finance_manager_prompt",
    "build_project_manager_prompt",
    "build_client_prompt",
]

