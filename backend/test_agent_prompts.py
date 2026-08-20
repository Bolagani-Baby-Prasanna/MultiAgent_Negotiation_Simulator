"""
Unit tests for the AI Agent Negotiation Prompts Package.
Verifies prompt construction, dispatcher routing, history formatting,
personality traits, evaluation advisory injection, and fallback behaviors.
"""

import pytest
from prompt_templates import (
    DEFAULT_PERSONALITY,
    PERSONALITY_PROMPTS,
    format_evaluation_advisory,
    format_history,
    get_agent_prompt,
    build_prompt_from_template,
    MASTER_PROMPT_TEMPLATE,
    AGENT_DOMAIN_GUIDELINES,
)


@pytest.fixture
def mock_scenario():
    return {
        "name": "Steel Material Shortage",
        "description": "Steel prices surged 20% and delivery is delayed.",
        "agents": [
            {
                "name": "Supplier Agent",
                "role": "Material Provider",
                "goal": "Maximize profit margin.",
                "constraints": ["Minimum price ₹52,000 per ton", "Delivery 5 days"],
            },
            {
                "name": "Contractor Agent",
                "role": "Material Buyer",
                "goal": "Procure 600 tons of steel at minimum cost.",
                "constraints": ["Budget cap ₹3.5 Cr", "Deadline 3 days"],
            },
            {
                "name": "Finance Manager Agent",
                "role": "Budget Gatekeeper",
                "goal": "Keep total procurement within budget.",
                "constraints": ["Approved budget ₹3.4 Cr", "60-day credit cycle"],
            },
        ],
    }


@pytest.fixture
def mock_history():
    return [
        {
            "round": 1,
            "agent": "Contractor Agent",
            "action": "offer",
            "message": "We propose 600 tons at 50,000.",
            "offer": 50000.0,
        },
        {
            "round": 1,
            "agent": "Supplier Agent",
            "action": "counter",
            "message": "Raw material costs are high, best is 55,000.",
            "offer": 55000.0,
        },
    ]


def test_format_history_empty():
    assert "No offers have been made yet" in format_history([])
    assert "No offers have been made yet" in format_history(None)


def test_format_history_populated(mock_history):
    formatted = format_history(mock_history)
    assert "Round 1 — Contractor Agent [offer]" in formatted
    assert "offer: 50000.0" in formatted
    assert "Round 1 — Supplier Agent [counter]" in formatted
    assert "offer: 55000.0" in formatted


def test_get_agent_prompt_contractor(mock_scenario, mock_history):
    agent = mock_scenario["agents"][1]
    prompt = get_agent_prompt(
        agent=agent,
        personality="Aggressive",
        scenario=mock_scenario,
        history=mock_history,
        current_offer=55000.0,
        round_num=2,
        max_rounds=5,
    )
    assert 'role-playing as "Contractor Agent"' in prompt
    assert "Fe-500" in prompt or "Workforce" in prompt or "General Contractor" in prompt
    assert "YOUR NEGOTIATION PERSONALITY — Aggressive" in prompt
    assert 'Respond with ONLY a valid JSON object' in prompt


def test_get_agent_prompt_supplier(mock_scenario, mock_history):
    agent = mock_scenario["agents"][0]
    prompt = get_agent_prompt(
        agent=agent,
        personality="Collaborative",
        scenario=mock_scenario,
        history=mock_history,
        current_offer=50000.0,
        round_num=2,
        max_rounds=5,
    )
    assert 'role-playing as "Supplier Agent"' in prompt
    assert "Floor Price & Margin Defense" in prompt or "Material Supplier" in prompt
    assert "YOUR NEGOTIATION PERSONALITY — Collaborative" in prompt


def test_get_agent_prompt_finance_manager(mock_scenario, mock_history):
    agent = mock_scenario["agents"][2]
    prompt = get_agent_prompt(
        agent=agent,
        personality="Risk-Averse",
        scenario=mock_scenario,
        history=mock_history,
        current_offer=52000.0,
        round_num=2,
        max_rounds=5,
    )
    assert 'role-playing as "Finance Manager Agent"' in prompt
    assert "Budget Ceilings & Contingency" in prompt or "Finance Manager" in prompt
    assert "YOUR NEGOTIATION PERSONALITY — Risk-Averse" in prompt


def test_get_agent_prompt_project_manager(mock_scenario, mock_history):
    agent = {
        "name": "Project Manager Agent",
        "role": "Schedule Coordinator",
        "goal": "Re-sequence activities to minimize project delay.",
        "constraints": ["Critical path cannot be deferred"],
    }
    prompt = get_agent_prompt(
        agent=agent,
        personality="Collaborative",
        scenario=mock_scenario,
        history=mock_history,
        current_offer=52000.0,
        round_num=3,
        max_rounds=5,
    )
    assert 'role-playing as "Project Manager Agent"' in prompt
    assert "Critical Path Protection" in prompt or "Project Manager" in prompt


def test_get_agent_prompt_client(mock_scenario, mock_history):
    agent = {
        "name": "Client Agent",
        "role": "Project Owner",
        "goal": "Preserve deliverables and enforce milestone handover.",
        "constraints": ["Milestone 1 date is fixed", "Penalty ₹50,000/day"],
    }
    prompt = get_agent_prompt(
        agent=agent,
        personality="Aggressive",
        scenario=mock_scenario,
        history=mock_history,
        current_offer=52000.0,
        round_num=5,
        max_rounds=5,
    )
    assert 'role-playing as "Client Agent"' in prompt
    assert "Core Scope Integrity" in prompt or "Liquidated Damages" in prompt or "Project Owner" in prompt
    assert "FINAL ROUND" in prompt


def test_get_agent_prompt_custom_fallback(mock_scenario, mock_history):
    agent = {
        "name": "Subcontractor Electrician",
        "role": "Electrical Installer",
        "goal": "Secure safety wiring contract.",
        "constraints": ["Requires high-voltage license"],
    }
    prompt = get_agent_prompt(
        agent=agent,
        personality="Collaborative",
        scenario=mock_scenario,
        history=mock_history,
        current_offer=12000.0,
        round_num=1,
        max_rounds=4,
    )
    assert 'role-playing as "Subcontractor Electrician"' in prompt
    assert 'DECISION INSTRUCTIONS' in prompt


def test_evaluation_advisory_integration(mock_scenario, mock_history):
    from counteroffer_evaluator import evaluate_offer
    agent = mock_scenario["agents"][0]
    evaluation = evaluate_offer(
        agent=agent,
        personality="Collaborative",
        scenario=mock_scenario,
        history=mock_history,
        current_offer=50000.0,
        round_num=2,
        max_rounds=5,
    )
    advisory_text = format_evaluation_advisory(evaluation)
    assert "EVALUATION ADVISORY" in advisory_text
    assert "Offer Score:" in advisory_text
    assert "Engine Recommendation:" in advisory_text


def test_convergence_directives_in_prompt(mock_scenario, mock_history):
    agent = mock_scenario["agents"][0]
    prompt = get_agent_prompt(
        agent=agent,
        personality="Collaborative",
        scenario=mock_scenario,
        history=mock_history,
        current_offer=52000.0,
        round_num=3,
        max_rounds=5,
    )
    assert "AGREEMENT & CONVERGENCE RULES" in prompt
    assert 'Action: "accept"' in prompt
    assert "within the given rounds" in prompt


def test_all_scenario_templates_reach_agreement():
    """Verifies that all standard scenario templates reach agreement within their estimated rounds."""
    from agent_reasoning import _smart_algorithmic_turn
    from counteroffer_evaluator import evaluate_offer

    scenarios = [
        {
            "name": "Material Shortage",
            "agents": [
                {
                    "name": "Supplier Agent",
                    "role": "Material Provider",
                    "goal": "Maximize profit margin on steel supply.",
                    "constraints": ["Minimum price: ₹52,000 per ton", "Fastest delivery: 5 business days"],
                },
                {
                    "name": "Contractor Agent",
                    "role": "Material Buyer",
                    "goal": "Procure steel at lowest cost.",
                    "constraints": ["Budget cap: ₹58,000 per ton", "Quality grade must be Fe-500"],
                },
            ],
            "max_rounds": 4,
        },
        {
            "name": "Budget Overrun",
            "agents": [
                {
                    "name": "Client Agent",
                    "role": "Project Owner",
                    "goal": "Keep additional budget low.",
                    "constraints": ["Maximum additional budget: ₹45 Lakhs"],
                },
                {
                    "name": "Finance Manager Agent",
                    "role": "Cost Controller",
                    "goal": "Reallocate funds.",
                    "constraints": ["Cannot reallocate more than 40 Lakhs"],
                },
            ],
            "max_rounds": 5,
        },
    ]

    for sc in scenarios:
        history = []
        current_offer = None
        max_rounds = sc["max_rounds"]
        agreement = False

        for r in range(1, max_rounds + 1):
            for ag in sc["agents"]:
                ev = evaluate_offer(ag, "Collaborative", sc, history, current_offer, r, max_rounds)
                turn = _smart_algorithmic_turn(ag, "Collaborative", sc, history, current_offer, r, max_rounds, ev)
                history.append({
                    "round": r,
                    "agent": ag["name"],
                    "action": turn["action"],
                    "message": turn["message"],
                    "offer": turn.get("offer"),
                })
                if turn.get("offer") is not None:
                    current_offer = turn["offer"]
                if turn["action"] == "accept":
                    agreement = True
                    break
            if agreement:
                break

        assert agreement is True, f"Scenario '{sc['name']}' failed to reach agreement."

