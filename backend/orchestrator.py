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

        # Latest offer
        self.current_offer = current_offer

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
        offer=None
    ):

        entry = {
            "round": self.round,
            "agent": agent_name,
            "action": action,
            "message": message,
            "offer": offer
        }

        self.history.append(entry)

        # Update latest offer
        if offer is not None:
            self.current_offer = offer

        return entry

    # ------------------------------------------------
    # Move to next agent
    # ------------------------------------------------

    def advance_turn(self):

        self.current_agent_index += 1

        # If all agents have completed their turn
        if self.current_agent_index >= len(self.agents):

            self.current_agent_index = 0

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
            "history": self.history,
            "status": self.status
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
            "history": self.history
        }