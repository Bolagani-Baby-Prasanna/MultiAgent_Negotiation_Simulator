"""
Tests for the Counteroffer Evaluation & Concession Module.
Run with:  python -m pytest test_counteroffer_evaluator.py -v
"""

import pytest

from counteroffer_evaluator import (
    ConcessionData,
    ConcessionTracker,
    DecisionEngine,
    OfferEvaluator,
    OfferScore,
    evaluate_offer,
    evaluation_to_dict,
)


# ──────────────────────────────────────────────
# Fixtures
# ──────────────────────────────────────────────

SUPPLIER_AGENT = {
    "name": "Supplier Agent",
    "role": "Material Provider",
    "goal": "Maximize profit margin on steel supply.",
    "constraints": [
        "Maximum supply capacity: 600 tons",
        "Minimum price: ₹52,000 per ton",
        "Fastest delivery: 5 business days",
        "Cannot source from more than 2 sub-suppliers",
    ],
}

CONTRACTOR_AGENT = {
    "name": "Contractor Agent",
    "role": "Material Buyer",
    "goal": "Procure 600 tons of steel at the lowest possible cost.",
    "constraints": [
        "Budget cap for steel: ₹3.5 Cr",
        "Project deadline cannot extend beyond 3 days",
        "Quality grade must be Fe-500 or above",
        "Must maintain 50-ton safety stock",
    ],
}

SAMPLE_SCENARIO = {
    "name": "Material Shortage",
    "description": "Steel supply negotiation.",
    "agents": [SUPPLIER_AGENT, CONTRACTOR_AGENT],
}

SAMPLE_HISTORY = [
    {"round": 1, "agent": "Supplier Agent", "action": "offer", "message": "Opening at 58000", "offer": 58000},
    {"round": 1, "agent": "Contractor Agent", "action": "counter", "message": "Counter at 50000", "offer": 50000},
    {"round": 2, "agent": "Supplier Agent", "action": "counter", "message": "Revised to 55000", "offer": 55000},
    {"round": 2, "agent": "Contractor Agent", "action": "counter", "message": "Counter at 52000", "offer": 52000},
]


# ──────────────────────────────────────────────
# OfferEvaluator tests
# ──────────────────────────────────────────────

class TestOfferEvaluator:

    def test_no_offer_returns_neutral(self):
        result = OfferEvaluator.evaluate(SUPPLIER_AGENT, None)
        assert result.score == 50
        assert "No offer" in result.summary

    def test_supplier_happy_with_high_price(self):
        # 55000 is above the supplier's minimum of 52000
        result = OfferEvaluator.evaluate(SUPPLIER_AGENT, 55000)
        assert result.score >= 50
        passed = sum(1 for c in result.constraint_checks if c.status == "pass")
        assert passed >= 2

    def test_supplier_unhappy_with_low_price(self):
        # 45000 is below the supplier's minimum of 52000
        result = OfferEvaluator.evaluate(SUPPLIER_AGENT, 45000)
        failed = sum(1 for c in result.constraint_checks if c.status == "fail")
        assert failed >= 1

    def test_contractor_happy_within_budget(self):
        # Contractor has budget cap of 3.5 Cr
        result = OfferEvaluator.evaluate(CONTRACTOR_AGENT, 50000)
        assert result.score >= 25  # qualitative constraints pass automatically

    def test_all_constraints_checked(self):
        result = OfferEvaluator.evaluate(SUPPLIER_AGENT, 55000)
        assert result.constraints_total == 4
        assert len(result.constraint_checks) == 4

    def test_warn_zone_near_boundary(self):
        # 52500 is just above 52000 — within 5%, should be pass or warn
        result = OfferEvaluator.evaluate(SUPPLIER_AGENT, 52500)
        statuses = [c.status for c in result.constraint_checks]
        # At minimum, no hard fail expected for the min-price constraint
        assert "fail" not in statuses or result.score > 0


# ──────────────────────────────────────────────
# ConcessionTracker tests
# ──────────────────────────────────────────────

class TestConcessionTracker:

    def test_empty_history(self):
        results = ConcessionTracker.compute([], SAMPLE_SCENARIO["agents"])
        assert len(results) == 2
        assert all(cd.opening_offer is None for cd in results)

    def test_computes_supplier_concession(self):
        results = ConcessionTracker.compute(SAMPLE_HISTORY, SAMPLE_SCENARIO["agents"])
        supplier = ConcessionTracker.get_for_agent("Supplier Agent", results)
        assert supplier.opening_offer == 58000
        assert supplier.current_offer == 55000
        assert supplier.concession_rate > 0  # they moved from 58000 to 55000

    def test_computes_contractor_concession(self):
        results = ConcessionTracker.compute(SAMPLE_HISTORY, SAMPLE_SCENARIO["agents"])
        contractor = ConcessionTracker.get_for_agent("Contractor Agent", results)
        assert contractor.opening_offer == 50000
        assert contractor.current_offer == 52000
        assert contractor.concession_rate > 0  # they moved from 50000 to 52000

    def test_offer_history_tracked(self):
        results = ConcessionTracker.compute(SAMPLE_HISTORY, SAMPLE_SCENARIO["agents"])
        supplier = ConcessionTracker.get_for_agent("Supplier Agent", results)
        assert supplier.offer_history == [58000, 55000]

    def test_remaining_room_positive(self):
        results = ConcessionTracker.compute(SAMPLE_HISTORY, SAMPLE_SCENARIO["agents"])
        for cd in results:
            assert 0.0 <= cd.remaining_room <= 1.0

    def test_get_for_missing_agent(self):
        results = ConcessionTracker.compute(SAMPLE_HISTORY, SAMPLE_SCENARIO["agents"])
        unknown = ConcessionTracker.get_for_agent("Ghost Agent", results)
        assert unknown.agent_name == "Ghost Agent"
        assert unknown.opening_offer is None


# ──────────────────────────────────────────────
# DecisionEngine tests
# ──────────────────────────────────────────────

class TestDecisionEngine:

    def _make_score(self, score, has_fail=False):
        checks = []
        if has_fail:
            checks.append(type("C", (), {"text": "x", "status": "fail", "detail": ""})())
        return OfferScore(
            score=score,
            constraints_met=3,
            constraints_total=4,
            constraint_checks=checks,
        )

    def test_high_score_leads_to_accept(self):
        score = self._make_score(92)
        concession = ConcessionData(agent_name="Test", remaining_room=0.5)
        rec = DecisionEngine.recommend(score, concession, "Collaborative", 2, 5, 55000)
        assert rec.action == "accept"

    def test_hard_fail_low_score_leads_to_reject(self):
        score = self._make_score(30, has_fail=True)
        concession = ConcessionData(agent_name="Test", remaining_room=0.8)
        rec = DecisionEngine.recommend(score, concession, "Aggressive", 1, 5, 45000)
        assert rec.action == "reject"

    def test_mid_score_leads_to_counter(self):
        score = self._make_score(65)
        concession = ConcessionData(agent_name="Test", remaining_room=0.6)
        rec = DecisionEngine.recommend(score, concession, "Collaborative", 2, 5, 55000)
        assert rec.action == "counter"
        assert rec.suggested_counter_low is not None
        assert rec.suggested_counter_high is not None

    def test_final_round_pressure_accept(self):
        score = self._make_score(62)
        concession = ConcessionData(agent_name="Test", remaining_room=0.3)
        rec = DecisionEngine.recommend(score, concession, "Collaborative", 5, 5, 55000)
        assert rec.action == "accept"

    def test_aggressive_personality_harder_to_accept(self):
        score = self._make_score(80)
        concession = ConcessionData(agent_name="Test", remaining_room=0.5)
        rec = DecisionEngine.recommend(score, concession, "Aggressive", 2, 5, 55000)
        # Aggressive threshold is 90, so 80 should trigger counter
        assert rec.action == "counter"

    def test_confidence_is_bounded(self):
        score = self._make_score(95)
        concession = ConcessionData(agent_name="Test", remaining_room=0.5)
        rec = DecisionEngine.recommend(score, concession, "Collaborative", 2, 5, 55000)
        assert 0.0 <= rec.confidence <= 1.0


# ──────────────────────────────────────────────
# Integration: evaluate_offer
# ──────────────────────────────────────────────

class TestEvaluateOffer:

    def test_full_pipeline_runs(self):
        result = evaluate_offer(
            agent=SUPPLIER_AGENT,
            personality="Collaborative",
            scenario=SAMPLE_SCENARIO,
            history=SAMPLE_HISTORY,
            current_offer=54000,
            round_num=3,
            max_rounds=5,
        )
        assert result.agent_name == "Supplier Agent"
        assert 0 <= result.offer_score.score <= 100
        assert result.recommendation.action in ("accept", "counter", "reject")
        assert len(result.all_concessions) == 2

    def test_serialization(self):
        result = evaluate_offer(
            agent=SUPPLIER_AGENT,
            personality="Aggressive",
            scenario=SAMPLE_SCENARIO,
            history=SAMPLE_HISTORY,
            current_offer=54000,
            round_num=3,
            max_rounds=5,
        )
        d = evaluation_to_dict(result)
        assert isinstance(d, dict)
        assert "offer_score" in d
        assert "concession_data" in d
        assert "recommendation" in d
        assert isinstance(d["all_concessions"], list)

    def test_no_history(self):
        result = evaluate_offer(
            agent=SUPPLIER_AGENT,
            personality="Risk-Averse",
            scenario=SAMPLE_SCENARIO,
            history=[],
            current_offer=None,
            round_num=1,
            max_rounds=5,
        )
        assert result.offer_score.score == 50
        assert result.concession_data.opening_offer is None
