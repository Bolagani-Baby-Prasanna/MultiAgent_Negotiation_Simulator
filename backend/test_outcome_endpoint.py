"""Tests for the negotiation outcome payload used by the Outcome Screen."""

import unittest

from fastapi.testclient import TestClient

from main import app

SAMPLE_SCENARIO = {
    "name": "Material Shortage",
    "description": "Steel supply negotiation.",
    "agents": [
        {
            "name": "Supplier Agent",
            "role": "Material Provider",
            "goal": "Maximize profit margin on steel supply.",
            "constraints": [
                "Maximum supply capacity: 600 tons",
                "Minimum price: ₹52,000 per ton",
                "Fastest delivery: 5 business days",
                "Cannot source from more than 2 sub-suppliers",
            ],
        },
        {
            "name": "Contractor Agent",
            "role": "Material Buyer",
            "goal": "Procure 600 tons of steel at the lowest possible cost.",
            "constraints": [
                "Budget cap for steel: ₹3.5 Cr",
                "Project deadline cannot extend beyond 3 days",
                "Quality grade must be Fe-500 or above",
                "Must maintain 50-ton safety stock",
            ],
        },
    ],
}

SAMPLE_HISTORY = [
    {"round": 1, "agent": "Supplier Agent", "action": "offer", "message": "Opening at 58000", "offer": 58000},
    {"round": 1, "agent": "Contractor Agent", "action": "counter", "message": "Counter at 50000", "offer": 50000},
    {"round": 2, "agent": "Supplier Agent", "action": "counter", "message": "Revised to 55000", "offer": 55000},
    {"round": 2, "agent": "Contractor Agent", "action": "counter", "message": "Counter at 52000", "offer": 52000},
]


class TestOutcomeEndpoint(unittest.TestCase):
    def test_outcome_includes_terms_rounds_and_agent_scores(self):
        client = TestClient(app)
        history = SAMPLE_HISTORY + [
            {
                "round": 3,
                "agent": "Supplier Agent",
                "action": "accept",
                "message": "We accept 52,000",
                "offer": 52000,
            }
        ]

        response = client.post(
            "/api/negotiation/outcome",
            json={
                "scenario": SAMPLE_SCENARIO,
                "max_rounds": 5,
                "personalities": {
                    "Supplier Agent": "Collaborative",
                    "Contractor Agent": "Aggressive",
                },
                "history": history,
                "round": 3,
                "current_offer": 52000,
                "current_offer_unit": "INR",
                "status": "agreement",
            },
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()["outcome"]
        self.assertEqual(payload["status"], "agreement")
        self.assertEqual(payload["rounds_elapsed"], 3)
        self.assertEqual(payload["max_rounds"], 5)
        self.assertEqual(payload["turns_elapsed"], 5)
        self.assertEqual(payload["final_offer"], 52000)
        self.assertEqual(payload["accepted_by"], "Supplier Agent")
        self.assertEqual(len(payload["evaluations"]), 2)
        names = {item["agent_name"] for item in payload["evaluations"]}
        self.assertEqual(names, {"Supplier Agent", "Contractor Agent"})
        for item in payload["evaluations"]:
            self.assertGreaterEqual(item["offer_score"]["score"], 0)
            self.assertLessEqual(item["offer_score"]["score"], 100)
            self.assertIn("concession_data", item)
            self.assertIsInstance(item["concession_data"]["offer_history"], list)


if __name__ == "__main__":
    unittest.main()
