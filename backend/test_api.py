"""
Comprehensive integration and unit tests for FastAPI backend API endpoints.
Run with:  python -m pytest test_api.py -v
"""

import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

SAMPLE_SCENARIO = {
    "name": "Material Shortage: Steel Supply Reallocation",
    "category": "Supply Chain",
    "difficulty": "Medium",
    "estimatedRounds": 5,
    "agents": [
        {
            "name": "Supplier Agent",
            "icon": "🚚",
            "role": "Material Provider",
            "goal": "Maximize profit margin on steel supply.",
            "constraints": [
                "Minimum price: ₹52,000 per ton",
                "Maximum supply capacity: 600 tons",
                "Fastest delivery: 5 business days",
            ],
        },
        {
            "name": "Contractor Agent",
            "icon": "👷",
            "role": "Material Buyer",
            "goal": "Procure 600 tons of steel at lowest cost.",
            "constraints": [
                "Budget cap for steel: ₹3.5 Cr",
                "Maximum acceptable price: ₹55,000 per ton",
                "Project deadline cannot extend beyond 3 days",
            ],
        },
    ],
}


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_start_negotiation():
    response = client.post(
        "/api/negotiation/start",
        json={"scenario": SAMPLE_SCENARIO, "max_rounds": 5},
    )
    assert response.status_code == 200
    data = response.json()
    assert "state" in data
    state = data["state"]
    assert state["status"] == "active"
    assert state["round"] == 1
    assert state["current_agent"]["name"] == "Supplier Agent"
    assert state["history"] == []


def test_start_negotiation_invalid():
    response = client.post(
        "/api/negotiation/start",
        json={"scenario": {"name": "Empty"}, "max_rounds": 5},
    )
    assert response.status_code == 400


def test_next_turn_flow():
    # 1. Start
    r_start = client.post(
        "/api/negotiation/start",
        json={"scenario": SAMPLE_SCENARIO, "max_rounds": 5},
    )
    state = r_start.json()["state"]

    # 2. First turn
    r_turn1 = client.post(
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
    assert r_turn1.status_code == 200
    data1 = r_turn1.json()
    assert data1["turn"] is not None
    assert data1["turn"]["action"] in ("offer", "counter")
    assert data1["turn"]["offer"] is not None
    assert len(data1["state"]["history"]) == 1

    # 3. Second turn
    state1 = data1["state"]
    r_turn2 = client.post(
        "/api/negotiation/next-turn",
        json={
            "scenario": SAMPLE_SCENARIO,
            "max_rounds": 5,
            "personalities": {
                "Supplier Agent": "Collaborative",
                "Contractor Agent": "Aggressive",
            },
            **state1,
        },
    )
    assert r_turn2.status_code == 200
    data2 = r_turn2.json()
    assert len(data2["state"]["history"]) == 2


def test_human_turn_flow():
    # Start negotiation
    r_start = client.post(
        "/api/negotiation/start",
        json={"scenario": SAMPLE_SCENARIO, "max_rounds": 5},
    )
    state = r_start.json()["state"]

    # Submit human counter-offer
    r_human = client.post(
        "/api/negotiation/human-turn",
        json={
            "scenario": SAMPLE_SCENARIO,
            "max_rounds": 5,
            "agent_name": "Contractor Agent",
            "action": "counter",
            "offer": 53500,
            "unit": "per ton",
            "message": "We propose 53,500 per ton with expedited delivery.",
            **state,
        },
    )
    assert r_human.status_code == 200
    data = r_human.json()
    assert data["turn"]["is_human"] is True
    assert data["turn"]["offer"] == 53500
    assert len(data["state"]["history"]) == 1


def test_human_turn_accept():
    r_start = client.post(
        "/api/negotiation/start",
        json={"scenario": SAMPLE_SCENARIO, "max_rounds": 5},
    )
    state = r_start.json()["state"]
    state["current_offer"] = 54000

    r_human = client.post(
        "/api/negotiation/human-turn",
        json={
            "scenario": SAMPLE_SCENARIO,
            "max_rounds": 5,
            "agent_name": "Contractor Agent",
            "action": "accept",
            "offer": 54000,
            "message": "We accept this offer.",
            **state,
        },
    )
    assert r_human.status_code == 200
    data = r_human.json()
    assert data["state"]["status"] == "agreement"


def test_evaluate_endpoint():
    response = client.post(
        "/api/negotiation/evaluate",
        json={
            "agent": SAMPLE_SCENARIO["agents"][0],
            "personality": "Collaborative",
            "scenario": SAMPLE_SCENARIO,
            "history": [
                {"round": 1, "agent": "Supplier Agent", "action": "offer", "offer": 58000, "message": "Opening"},
                {"round": 1, "agent": "Contractor Agent", "action": "counter", "offer": 53000, "message": "Counter"},
            ],
            "current_offer": 53000,
            "current_offer_unit": "per ton",
            "round": 2,
            "max_rounds": 5,
        },
    )
    assert response.status_code == 200
    eval_data = response.json().get("evaluation")
    assert eval_data is not None
    assert "offer_score" in eval_data
    assert "concession_data" in eval_data
    assert "recommendation" in eval_data
    assert 0 <= eval_data["offer_score"]["score"] <= 100
