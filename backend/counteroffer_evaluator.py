"""
Counteroffer Evaluation & Concession Module
============================================
Provides deterministic scoring, concession tracking, and decision
recommendations that augment the LLM-based agent reasoning.

Three main classes:
  • OfferEvaluator  — scores an offer 0-100 against agent constraints
  • ConcessionTracker — measures how much each agent has moved
  • DecisionEngine — combines score + concession + pressure → recommendation
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field


# ──────────────────────────────────────────────
# Data classes for structured results
# ──────────────────────────────────────────────

@dataclass
class ConstraintCheck:
    """Result of checking a single constraint against an offer."""
    text: str
    status: str          # "pass" | "fail" | "warn"
    detail: str = ""


@dataclass
class OfferScore:
    """Full evaluation result for a single offer from one agent's perspective."""
    score: int                           # 0-100
    constraints_met: int
    constraints_total: int
    constraint_checks: list[ConstraintCheck] = field(default_factory=list)
    distance_from_ideal: float = 0.0     # 0.0 (at ideal) – 1.0 (at walk-away)
    summary: str = ""


@dataclass
class ConcessionData:
    """Concession metrics for a single agent across the negotiation."""
    agent_name: str
    opening_offer: float | None = None
    current_offer: float | None = None
    concession_rate: float = 0.0       # 0.0 – 1.0 (pct moved from opening)
    concession_velocity: float = 0.0   # change in concession per round
    remaining_room: float = 1.0        # 0.0 – 1.0
    offer_history: list[float] = field(default_factory=list)


@dataclass
class DecisionRecommendation:
    """Structured recommendation produced by the DecisionEngine."""
    action: str                  # "accept" | "counter" | "reject"
    confidence: float            # 0.0 – 1.0
    reasoning: str
    suggested_counter_low: float | None = None
    suggested_counter_high: float | None = None


@dataclass
class EvaluationResult:
    """Complete evaluation bundle returned to the caller."""
    agent_name: str
    offer_score: OfferScore
    concession_data: ConcessionData
    recommendation: DecisionRecommendation
    all_concessions: list[ConcessionData] = field(default_factory=list)


# ──────────────────────────────────────────────
# Utility: extract numbers from constraint text
# ──────────────────────────────────────────────

_NUMBER_RE = re.compile(
    r"[₹$€£]?\s*([\d,]+(?:\.\d+)?)\s*"
    r"(?:Cr|Lakhs?|lakh|crore|per\s+ton|per\s+day|tons?|days?|hours?|workers?|%)?",
    re.IGNORECASE,
)

_DIRECTION_KEYWORDS = {
    "max": "upper",
    "maximum": "upper",
    "cap": "upper",
    "not exceed": "upper",
    "budget": "upper",
    "limit": "upper",
    "up to": "upper",
    "above": "upper",
    "min": "lower",
    "minimum": "lower",
    "at least": "lower",
    "fastest": "lower",
    "within": "upper",
    "below": "upper",
}


def _parse_numeric_bound(constraint_text: str) -> tuple[float | None, str]:
    """
    Extract the first meaningful number from a constraint string and infer
    whether it represents an upper or lower bound.

    Returns (value, direction)  where direction ∈ {"upper", "lower", "unknown"}.
    """
    numbers = _NUMBER_RE.findall(constraint_text)
    if not numbers:
        return None, "unknown"

    raw = numbers[0].replace(",", "")
    try:
        value = float(raw)
    except ValueError:
        return None, "unknown"

    lower_text = constraint_text.lower()

    # If the constraint is clearly a timeline/quality/logistics term (e.g. "5 business days", "3 days", "Fe-500", "2 sub-suppliers")
    # without currency/pricing/volume indicators, treat as qualitative term.
    is_monetary_or_volume = any(m in lower_text for m in ["₹", "rs", "cost", "price", "budget", "cr", "lakh", "crore", "fee", "penalty", "margin", "overrun", "fund", "rate", "ton", "tons", "capacity"])
    is_non_offer_term = any(t in lower_text for t in ["day", "days", "week", "weeks", "month", "months", "grade", "fe-", "sub-supplier", "sub-suppliers", "stock", "inspection"])

    if is_non_offer_term and not is_monetary_or_volume:
        return None, "unknown"

    # Handle "Cr" / "Lakhs" multiplier
    if "cr" in lower_text and value < 100:
        value *= 1_00_00_000          # 1 Cr = 10 000 000
    elif "lakh" in lower_text and value < 10_000:
        value *= 1_00_000

    direction = "unknown"
    for keyword, d in _DIRECTION_KEYWORDS.items():
        if keyword in lower_text:
            direction = d
            break

    return value, direction


# ──────────────────────────────────────────────
# OfferEvaluator
# ──────────────────────────────────────────────

class OfferEvaluator:
    """Scores an incoming offer against a specific agent's constraints."""

    @staticmethod
    def evaluate(
        agent: dict,
        current_offer: float | None,
        scenario: dict | None = None,
    ) -> OfferScore:
        """
        Produce a 0-100 score for `current_offer` from the perspective of
        `agent`.  Each constraint is checked individually; the final score
        is a weighted blend of constraint satisfaction.
        """
        constraints: list[str] = agent.get("constraints", [])

        if current_offer is None:
            checks: list[ConstraintCheck] = []
            for c_text in constraints:
                bound, direction = _parse_numeric_bound(c_text)
                if bound is None:
                    checks.append(ConstraintCheck(
                        text=c_text, status="pass",
                        detail="Qualitative constraint — pending proposal.",
                    ))
                else:
                    checks.append(ConstraintCheck(
                        text=c_text, status="warn",
                        detail=f"Target limit: {bound:,.0f} ({direction}). Awaiting opening offer.",
                    ))

            return OfferScore(
                score=50,
                constraints_met=len([c for c in checks if c.status == "pass"]),
                constraints_total=len(constraints),
                constraint_checks=checks,
                summary="No offer on the table yet — awaiting opening proposal.",
            )

        checks: list[ConstraintCheck] = []
        passed = 0

        for c_text in constraints:
            bound, direction = _parse_numeric_bound(c_text)

            if bound is None:
                # Non-numeric / qualitative constraint — assumed met
                checks.append(ConstraintCheck(
                    text=c_text, status="pass",
                    detail="Qualitative constraint — assumed satisfied.",
                ))
                passed += 1
                continue

            if direction == "upper":
                if current_offer <= bound:
                    checks.append(ConstraintCheck(
                        text=c_text, status="pass",
                        detail=f"Offer {current_offer:,.0f} ≤ limit {bound:,.0f}.",
                    ))
                    passed += 1
                elif current_offer <= bound * 1.05:
                    checks.append(ConstraintCheck(
                        text=c_text, status="warn",
                        detail=f"Offer {current_offer:,.0f} slightly exceeds limit {bound:,.0f} (within 5%).",
                    ))
                    passed += 0.5
                else:
                    checks.append(ConstraintCheck(
                        text=c_text, status="fail",
                        detail=f"Offer {current_offer:,.0f} exceeds limit {bound:,.0f}.",
                    ))

            elif direction == "lower":
                if current_offer >= bound:
                    checks.append(ConstraintCheck(
                        text=c_text, status="pass",
                        detail=f"Offer {current_offer:,.0f} ≥ minimum {bound:,.0f}.",
                    ))
                    passed += 1
                elif current_offer >= bound * 0.95:
                    checks.append(ConstraintCheck(
                        text=c_text, status="warn",
                        detail=f"Offer {current_offer:,.0f} slightly below minimum {bound:,.0f} (within 5%).",
                    ))
                    passed += 0.5
                else:
                    checks.append(ConstraintCheck(
                        text=c_text, status="fail",
                        detail=f"Offer {current_offer:,.0f} below minimum {bound:,.0f}.",
                    ))
            else:
                # Direction unknown — measure distance from number
                distance = abs(current_offer - bound) / max(bound, 1)
                if distance < 0.10:
                    checks.append(ConstraintCheck(
                        text=c_text, status="pass",
                        detail=f"Offer close to reference value {bound:,.0f}.",
                    ))
                    passed += 1
                elif distance < 0.25:
                    checks.append(ConstraintCheck(
                        text=c_text, status="warn",
                        detail=f"Offer somewhat far from reference {bound:,.0f}.",
                    ))
                    passed += 0.5
                else:
                    checks.append(ConstraintCheck(
                        text=c_text, status="fail",
                        detail=f"Offer far from reference value {bound:,.0f}.",
                    ))

        total = len(constraints) if constraints else 1
        raw_score = (passed / total) * 100
        score = max(0, min(100, round(raw_score)))

        has_fail = any(ch.status == "fail" for ch in checks)
        has_warn = any(ch.status == "warn" for ch in checks)

        if score >= 85:
            summary = "Offer strongly aligns with agent objectives."
        elif score >= 60:
            summary = "Offer partially meets objectives — room for improvement."
        elif has_fail:
            summary = "Offer violates one or more hard constraints."
        else:
            summary = "Offer is far from agent's desired position."

        if has_warn and not has_fail:
            summary += " Some constraints are borderline."

        return OfferScore(
            score=score,
            constraints_met=int(passed),
            constraints_total=total,
            constraint_checks=checks,
            distance_from_ideal=1.0 - (score / 100),
            summary=summary,
        )


# ──────────────────────────────────────────────
# ConcessionTracker
# ──────────────────────────────────────────────

class ConcessionTracker:
    """Tracks how much each agent has conceded over the negotiation history."""

    @staticmethod
    def compute(
        history: list[dict],
        agents: list[dict],
    ) -> list[ConcessionData]:
        """
        Walk through `history` and build concession metrics for every agent.
        """
        agent_offers: dict[str, list[float]] = {
            a.get("name", ""): [] for a in agents
        }

        for entry in history:
            name = entry.get("agent", "")
            offer = entry.get("offer")
            if offer is not None and name in agent_offers:
                agent_offers[name].append(float(offer))

        results: list[ConcessionData] = []

        for agent in agents:
            name = agent.get("name", "")
            offers = agent_offers.get(name, [])

            if len(offers) == 0:
                results.append(ConcessionData(
                    agent_name=name,
                    opening_offer=None,
                    current_offer=None,
                    concession_rate=0.0,
                    concession_velocity=0.0,
                    remaining_room=1.0,
                    offer_history=[0],
                ))
                continue

            opening = offers[0]
            current = offers[-1]

            if opening == 0:
                rate = 0.0
            else:
                rate = abs(current - opening) / abs(opening)

            # Velocity: average change per step
            if len(offers) >= 2:
                deltas = [
                    abs(offers[i] - offers[i - 1]) for i in range(1, len(offers))
                ]
                velocity = sum(deltas) / len(deltas)
                # Normalise against opening
                velocity = velocity / max(abs(opening), 1)
            else:
                velocity = 0.0

            # Remaining room: heuristic — assume max concession is ~40% from opening
            max_concession = 0.40
            remaining = max(0.0, 1.0 - (rate / max_concession))

            results.append(ConcessionData(
                agent_name=name,
                opening_offer=opening,
                current_offer=current,
                concession_rate=round(rate, 4),
                concession_velocity=round(velocity, 4),
                remaining_room=round(remaining, 4),
                offer_history=offers,
            ))

        return results

    @staticmethod
    def get_for_agent(
        agent_name: str,
        all_concessions: list[ConcessionData],
    ) -> ConcessionData:
        for cd in all_concessions:
            if cd.agent_name == agent_name:
                return cd
        return ConcessionData(agent_name=agent_name)


# ──────────────────────────────────────────────
# DecisionEngine
# ──────────────────────────────────────────────

_PERSONALITY_THRESHOLDS = {
    "Aggressive": {
        "accept_min": 90,
        "counter_comfort": 60,
        "pressure_accept": 75,
        "concession_step": 0.05,
    },
    "Collaborative": {
        "accept_min": 75,
        "counter_comfort": 45,
        "pressure_accept": 55,
        "concession_step": 0.12,
    },
    "Risk-Averse": {
        "accept_min": 70,
        "counter_comfort": 40,
        "pressure_accept": 50,
        "concession_step": 0.10,
    },
}

_DEFAULT_THRESHOLDS = _PERSONALITY_THRESHOLDS["Collaborative"]


class DecisionEngine:
    """
    Combines offer score, concession data, round pressure, and personality
    to produce an accept / counter / reject recommendation.
    """

    @staticmethod
    def recommend(
        offer_score: OfferScore,
        concession: ConcessionData,
        personality: str | None,
        round_num: int,
        max_rounds: int,
        current_offer: float | None,
    ) -> DecisionRecommendation:

        thresholds = _PERSONALITY_THRESHOLDS.get(
            personality or "", _DEFAULT_THRESHOLDS
        )

        score = offer_score.score
        has_hard_fail = any(
            c.status == "fail" for c in offer_score.constraint_checks
        )
        is_final_round = round_num >= max_rounds
        pressure = round_num / max(max_rounds, 1)   # 0.0 → 1.0

        # ── Reject: hard constraint violated ──
        if has_hard_fail and score < 40:
            return DecisionRecommendation(
                action="reject",
                confidence=0.90,
                reasoning=(
                    "The offer violates one or more hard constraints and is "
                    "far from acceptable. Rejection is warranted."
                ),
            )

        # ── Accept: score high enough ──
        accept_threshold = thresholds["accept_min"]
        # Soften threshold under pressure
        if pressure > 0.7:
            accept_threshold = thresholds["pressure_accept"]

        if score >= accept_threshold and not has_hard_fail:
            return DecisionRecommendation(
                action="accept",
                confidence=min(1.0, score / 100 + 0.1),
                reasoning=(
                    f"Offer score ({score}/100) meets the acceptance threshold "
                    f"({'under deadline pressure' if pressure > 0.7 else 'comfortably'}). "
                    f"All critical constraints are satisfied."
                ),
            )

        # ── Final round fallback ──
        if is_final_round and score >= thresholds["pressure_accept"] and not has_hard_fail:
            return DecisionRecommendation(
                action="accept",
                confidence=0.65,
                reasoning=(
                    f"Final round — score ({score}/100) is above the pressure-accept "
                    f"threshold. Accepting to avoid no-deal."
                ),
            )

        # ── Counter ──
        counter_low = None
        counter_high = None

        if current_offer is not None:
            step_pct = thresholds["concession_step"]
            # Adjust step based on remaining room
            if concession.remaining_room < 0.3:
                step_pct *= 0.5   # less room → smaller steps

            step = abs(current_offer) * step_pct
            # Suggest a range around the current offer
            counter_low = round(current_offer - step, 2)
            counter_high = round(current_offer + step, 2)

        confidence = 0.7
        if score >= thresholds["counter_comfort"]:
            confidence = 0.75
            reasoning = (
                f"Offer score ({score}/100) is moderate. Counter-proposing "
                f"with a targeted adjustment to improve constraint alignment."
            )
        elif has_hard_fail:
            confidence = 0.85
            reasoning = (
                f"Offer violates constraints but negotiation room exists. "
                f"A counter that addresses the violations is recommended."
            )
        else:
            confidence = 0.60
            reasoning = (
                f"Offer score ({score}/100) is below comfort zone. "
                f"An assertive counteroffer is recommended."
            )

        return DecisionRecommendation(
            action="counter",
            confidence=round(confidence, 2),
            reasoning=reasoning,
            suggested_counter_low=counter_low,
            suggested_counter_high=counter_high,
        )


# ──────────────────────────────────────────────
# Convenience: one-call evaluation
# ──────────────────────────────────────────────

def evaluate_offer(
    agent: dict,
    personality: str | None,
    scenario: dict,
    history: list[dict],
    current_offer: float | None,
    round_num: int,
    max_rounds: int,
) -> EvaluationResult:
    """
    Run the full evaluation pipeline for one agent at one point in time.
    Returns an `EvaluationResult` with score, concession data, and recommendation.
    """
    agents = scenario.get("agents", [])

    offer_score = OfferEvaluator.evaluate(agent, current_offer, scenario)

    all_concessions = ConcessionTracker.compute(history, agents)
    my_concession = ConcessionTracker.get_for_agent(
        agent.get("name", ""), all_concessions
    )

    recommendation = DecisionEngine.recommend(
        offer_score=offer_score,
        concession=my_concession,
        personality=personality,
        round_num=round_num,
        max_rounds=max_rounds,
        current_offer=current_offer,
    )

    return EvaluationResult(
        agent_name=agent.get("name", ""),
        offer_score=offer_score,
        concession_data=my_concession,
        recommendation=recommendation,
        all_concessions=all_concessions,
    )


# ──────────────────────────────────────────────
# Serialization helper
# ──────────────────────────────────────────────

def evaluation_to_dict(ev: EvaluationResult) -> dict:
    """Convert an EvaluationResult to a JSON-friendly dict."""
    return {
        "agent_name": ev.agent_name,
        "offer_score": {
            "score": ev.offer_score.score,
            "constraints_met": ev.offer_score.constraints_met,
            "constraints_total": ev.offer_score.constraints_total,
            "constraint_checks": [
                {"text": c.text, "status": c.status, "detail": c.detail}
                for c in ev.offer_score.constraint_checks
            ],
            "distance_from_ideal": ev.offer_score.distance_from_ideal,
            "summary": ev.offer_score.summary,
        },
        "concession_data": {
            "agent_name": ev.concession_data.agent_name,
            "opening_offer": ev.concession_data.opening_offer,
            "current_offer": ev.concession_data.current_offer,
            "concession_rate": ev.concession_data.concession_rate,
            "concession_velocity": ev.concession_data.concession_velocity,
            "remaining_room": ev.concession_data.remaining_room,
            "offer_history": ev.concession_data.offer_history,
        },
        "recommendation": {
            "action": ev.recommendation.action,
            "confidence": ev.recommendation.confidence,
            "reasoning": ev.recommendation.reasoning,
            "suggested_counter_low": ev.recommendation.suggested_counter_low,
            "suggested_counter_high": ev.recommendation.suggested_counter_high,
        },
        "all_concessions": [
            {
                "agent_name": cd.agent_name,
                "opening_offer": cd.opening_offer,
                "current_offer": cd.current_offer,
                "concession_rate": cd.concession_rate,
                "concession_velocity": cd.concession_velocity,
                "remaining_room": cd.remaining_room,
                "offer_history": cd.offer_history,
            }
            for cd in ev.all_concessions
        ],
    }
