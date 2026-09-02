from counteroffer_evaluator import detect_deadlock


class NegotiationOrchestrator:

    def __init__(
        self,
        scenario,
        max_rounds=10,
        personalities=None,
        round=1,
        current_agent_index=0,
        status="active",
        history=None,
        current_offer=None,
        current_offer_unit=None,
        is_deadlocked=False,
        deadlock_rounds_remaining=None,
    ):

        self.scenario = scenario
        self.max_rounds = max_rounds

        # Personality per agent name, e.g. {"Supplier Agent": "Aggressive"}
        self.personalities = personalities or {}

        # Negotiation state — defaults start a fresh negotiation, but callers
        # (e.g. a stateless API endpoint) can pass in the previous turn's
        # state to resume exactly where it left off.
        self.round = round
        self.current_agent_index = current_agent_index
        self.status = status

        # Conversation history
        self.history = list(history) if history else []

        # Latest offer, and what it's actually measuring (e.g. "workers",
        # "days", "price per ton") — tracked alongside the number so
        # agents and the evaluator can tell what's being negotiated,
        # instead of just comparing bare numbers.
        self.current_offer = current_offer
        self.current_offer_unit = current_offer_unit

        # Deadlock tracking — persisted across stateless calls so the
        # frontend can pass it back and the countdown survives round-trips.
        self.is_deadlocked = is_deadlocked
        self.deadlock_rounds_remaining = deadlock_rounds_remaining

        # Agents participating in negotiation
        self.agents = scenario.get("agents", [])

        if not self.agents:
            raise ValueError("Scenario must contain at least one agent.")

    # ------------------------------------------------
    # Get current agent
    # ------------------------------------------------

    def get_current_agent(self):

        return self.agents[self.current_agent_index]

    # ------------------------------------------------
    # Get personality for the current agent
    # ------------------------------------------------

    def get_current_personality(self):

        agent_name = self.get_current_agent().get("name")
        return self.personalities.get(agent_name)

    # ------------------------------------------------
    # Add message to conversation history
    # ------------------------------------------------

    def add_message(
        self,
        agent_name,
        action,
        message,
        offer=None,
        unit=None
    ):

        entry = {
            "round": self.round,
            "agent": agent_name,
            "action": action,
            "message": message,
            "offer": offer,
            "unit": unit
        }

        self.history.append(entry)

        # Update latest offer (and what it's measuring)
        if offer is not None:
            self.current_offer = offer
            self.current_offer_unit = unit

        return entry

    # ------------------------------------------------
    # Move to next agent
    # ------------------------------------------------

    def advance_turn(self):

        self.current_agent_index += 1

        # If all agents have completed their turn
        if self.current_agent_index >= len(self.agents):

            self.current_agent_index = 0

            # ── Deadlock check (runs once per completed round) ──
            # Evaluate *before* incrementing the round counter so the
            # check reflects the round that just finished.
            stalled = detect_deadlock(self.history, n_rounds=3)

            if stalled and not self.is_deadlocked:
                # First detection — flag deadlock, start 2-round grace period.
                self.is_deadlocked = True
                self.deadlock_rounds_remaining = 2
            elif stalled and self.is_deadlocked:
                # Still stalled — count down grace rounds.
                if self.deadlock_rounds_remaining is not None:
                    self.deadlock_rounds_remaining -= 1
                if self.deadlock_rounds_remaining is not None and self.deadlock_rounds_remaining <= 0:
                    # Grace period exhausted — force breakdown.
                    self.status = "breakdown"
            elif not stalled and self.is_deadlocked:
                # Agents made meaningful progress — clear the flag.
                self.is_deadlocked = False
                self.deadlock_rounds_remaining = None

            # Start next round
            self.round += 1

        # Check maximum rounds
        if self.round > self.max_rounds:

            self.status = "max_rounds"

    # ------------------------------------------------
    # Get current negotiation state
    # ------------------------------------------------

    def get_context(self):

        return {
            "scenario": self.scenario,
            "round": self.round,
            "current_agent": self.get_current_agent(),
            "current_offer": self.current_offer,
            "current_offer_unit": self.current_offer_unit,
            "history": self.history,
            "status": self.status,
            "is_deadlocked": self.is_deadlocked,
            "deadlock_rounds_remaining": self.deadlock_rounds_remaining,
        }

    # ------------------------------------------------
    # Check whether negotiation is still active
    # ------------------------------------------------

    def is_active(self):

        return self.status == "active"

    # ------------------------------------------------
    # End negotiation
    # ------------------------------------------------

    def finish(self, status):

        self.status = status

        return {
            "status": self.status,
            "round": self.round,
            "current_agent": self.get_current_agent(),
            "current_offer": self.current_offer,
            "current_offer_unit": self.current_offer_unit,
            "history": self.history,
            "is_deadlocked": self.is_deadlocked,
            "deadlock_rounds_remaining": self.deadlock_rounds_remaining,
        }