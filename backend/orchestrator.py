class NegotiationOrchestrator:

    def __init__(self, scenario, max_rounds=10):

        self.scenario = scenario
        self.max_rounds = max_rounds

        # Negotiation state
        self.round = 1 
        self.current_agent_index = 0
        self.status = "active"

        # Conversation history
        self.history = []

        # Latest offer
        self.current_offer = None

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