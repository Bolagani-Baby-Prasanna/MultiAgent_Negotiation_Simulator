import sys
from pathlib import Path

# Make backend modules importable when pytest is run from project root.
BACKEND_DIR = Path(__file__).resolve().parent
if BACKEND_DIR.name != "backend":
    # When this file is temporarily run from outside the project, this is harmless.
    BACKEND_DIR = Path(__file__).resolve().parent / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

import pytest
from fastapi.testclient import TestClient

from counteroffer_evaluator import detect_deadlock
from orchestrator import NegotiationOrchestrator


SAMPLE_SCENARIO = {
    "name": "Milestone 3 Construction Negotiation",
    "category": "Construction",
    "difficulty": "Medium",
    "estimatedRounds": 5,
    "agents": [
        {
            "name": "Supplier Agent",
            "icon": "🚚",
            "role": "Material Provider",
            "goal": "Maximize profit margin.",
            "constraints": ["Minimum price: ₹52,000 per ton"],
        },
        {
            "name": "Contractor Agent",
            "icon": "👷",
            "role": "Material Buyer",
            "goal": "Buy materials at the lowest acceptable price.",
            "constraints": ["Maximum acceptable price: ₹55,000 per ton"],
        },
    ],
}


def test_task1_negotiation_arena_state_and_turn_data(monkeypatch):
    """Task 1: Arena receives dynamic state plus reasoning/evaluation data."""
    import main

    client = TestClient(main.app)

    # Avoid a real Groq call in this dedicated structural test.
    def fake_generate_agent_turn(**kwargs):
        return {
            "action": "offer",
            "offer": 54000,
            "unit": "per ton",
            "message": "I can offer ₹54,000 per ton based on the project constraints.",
            "reasoning": "The offer balances the supplier minimum with the contractor ceiling.",
            "evaluation": {
                "offer_score": {"score": 75},
                "recommendation": {"action": "counter"},
            },
        }

    monkeypatch.setattr(main, "generate_agent_turn", fake_generate_agent_turn)

    start = client.post(
        "/api/negotiation/start",
        json={"scenario": SAMPLE_SCENARIO, "max_rounds": 5},
    )
    assert start.status_code == 200

    state = start.json()["state"]
    assert state["history"] == []
    assert state["round"] == 1
    assert state["status"] == "active"
    assert "current_offer" in state
    assert "is_deadlocked" in state

    turn = client.post(
        "/api/negotiation/next-turn",
        json={
            "scenario": SAMPLE_SCENARIO,
            "max_rounds": 5,
            "personalities": {
                "Supplier Agent": "Collaborative",
                "Contractor Agent": "Aggressive",
            },
            **state,
        },
    )
    assert turn.status_code == 200

    data = turn.json()
    assert data["turn"]["reasoning"]
    assert data["turn"]["evaluation"]
    assert len(data["state"]["history"]) == 1


def test_task2_human_practice_mode_records_user_move():
    """Task 2: Human offer/message is stored and the state advances."""
    import main

    client = TestClient(main.app)

    start = client.post(
        "/api/negotiation/start",
        json={"scenario": SAMPLE_SCENARIO, "max_rounds": 5},
    )
    assert start.status_code == 200
    state = start.json()["state"]

    message = "I can offer ₹53,500 per ton with expedited delivery."
    human = client.post(
        "/api/negotiation/human-turn",
        json={
            "scenario": SAMPLE_SCENARIO,
            "max_rounds": 5,
            "agent_name": "Supplier Agent",
            "action": "counter",
            "offer": 53500,
            "unit": "per ton",
            "message": message,
            **state,
        },
    )

    assert human.status_code == 200
    data = human.json()
    assert data["turn"]["is_human"] is True
    assert data["turn"]["offer"] == 53500
    assert data["turn"]["message"] == message
    assert len(data["state"]["history"]) == 1
    assert data["state"]["history"][-1]["message"] == message
    assert data["state"]["current_offer"] == 53500


def test_task3_deadlock_detection_triggers_on_stalled_offers():
    """Task 3: Nearly unchanged recent offers are detected as deadlock."""
    history = [
        {"round": 1, "agent": "Supplier Agent", "offer": 54000},
        {"round": 1, "agent": "Contractor Agent", "offer": 54020},
        {"round": 2, "agent": "Supplier Agent", "offer": 54010},
    ]

    assert detect_deadlock(history, n_rounds=3) is True


def test_task3_no_deadlock_when_offers_move():
    """Task 3: Meaningful offer movement should not trigger deadlock."""
    history = [
        {"round": 1, "agent": "Supplier Agent", "offer": 60000},
        {"round": 1, "agent": "Contractor Agent", "offer": 50000},
        {"round": 2, "agent": "Supplier Agent", "offer": 57000},
    ]

    assert detect_deadlock(history, n_rounds=3) is False


def test_task3_orchestrator_persists_deadlock_state():
    """Task 3: Orchestrator persists the deadlock flag and grace countdown."""
    orchestrator = NegotiationOrchestrator(
        scenario=SAMPLE_SCENARIO,
        max_rounds=10,
        personalities={
            "Supplier Agent": "Collaborative",
            "Contractor Agent": "Collaborative",
        },
    )

    # Three nearly identical offers are enough for the detector to flag a stall.
    orchestrator.add_message("Supplier Agent", "offer", "Opening", 54000, "per ton")
    orchestrator.add_message("Contractor Agent", "counter", "Counter", 54020, "per ton")
    orchestrator.add_message("Supplier Agent", "counter", "Small move", 54010, "per ton")

    # Finish the current agent cycle.
    orchestrator.current_agent_index = len(SAMPLE_SCENARIO["agents"]) - 1
    orchestrator.advance_turn()

    state = orchestrator.get_context()
    assert state["is_deadlocked"] is True
    assert state["deadlock_rounds_remaining"] == 2
    assert state["status"] == "active"