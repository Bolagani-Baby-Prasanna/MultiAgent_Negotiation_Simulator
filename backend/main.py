import os

from orchestrator import NegotiationOrchestrator
from agent_reasoning import generate_agent_turn
from counteroffer_evaluator import evaluate_offer, evaluation_to_dict
import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional

load_dotenv()

groq_api_key = os.environ.get("GROQ_API_KEY")
groq_client = None
if groq_api_key:
    try:
        from groq import Groq
        groq_client = Groq(api_key=groq_api_key)
    except Exception as e:
        print(f"Warning: Failed to initialize Groq client: {e}")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class TestRequest(BaseModel):
    prompt: str

class NegotiationStartRequest(BaseModel):
    scenario: dict
    max_rounds: int = 10
    personalities: dict = {}

class AgentTurnRequest(BaseModel):
    scenario: dict
    max_rounds: int = 10
    personalities: dict = {}
    history: list = []
    round: int = 1
    current_agent_index: int = 0
    current_offer: Optional[float] = None
    current_offer_unit: Optional[str] = None
    status: str = "active"
    is_deadlocked: bool = False
    deadlock_rounds_remaining: Optional[int] = None

class HumanTurnRequest(BaseModel):
    scenario: dict
    max_rounds: int = 10
    personalities: dict = {}
    history: list = []
    round: int = 1
    current_agent_index: int = 0
    current_offer: Optional[float] = None
    current_offer_unit: Optional[str] = None
    status: str = "active"
    is_deadlocked: bool = False
    deadlock_rounds_remaining: Optional[int] = None
    agent_name: str
    action: str = "counter"
    offer: Optional[float] = None
    unit: Optional[str] = None
    message: str = ""

class EvaluateRequest(BaseModel):
    agent: dict
    personality: Optional[str] = "Collaborative"
    scenario: dict
    history: list = []
    current_offer: Optional[float] = None
    current_offer_unit: Optional[str] = None
    round: int = 1
    max_rounds: int = 10

@app.get("/health")
def health():
    return {"status": "ok"}


# Step 1 test endpoint: proves the backend can successfully reach the AI model.
@app.post("/api/test")
def test_ai(body: TestRequest):
    try:
        if not groq_client:
            return JSONResponse(
                status_code=500,
                content={"error": "GROQ_API_KEY is missing or Groq client is not initialized"},
            )

        candidate_models = ["groq/compound", "qwen/qwen3.6-27b", "openai/gpt-oss-120b"]
        last_err = None

        for model_name in candidate_models:
            try:
                response = groq_client.chat.completions.create(
                    messages=[{"role": "user", "content": body.prompt}],
                    model=model_name,
                )
                reply = response.choices[0].message.content
                return {"reply": reply}
            except Exception as model_err:
                last_err = model_err
                continue

        raise last_err or Exception("All candidate Groq models failed")

    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": f"Failed to get a response from Groq AI model: {str(e)}"},
        )


@app.post("/api/negotiation/start")
def start_negotiation(request: NegotiationStartRequest):
    try:
        orchestrator = NegotiationOrchestrator(
            scenario=request.scenario,
            max_rounds=request.max_rounds
        )

        return {
            "message": "Negotiation initialized successfully",
            "state": orchestrator.get_context()
        }

    except Exception as e:
        return JSONResponse(
            status_code=400,
            content={"error": str(e)}
        )

@app.post("/api/negotiation/test-turns")
def test_turns(request: NegotiationStartRequest):

    try:
        orchestrator = NegotiationOrchestrator(
            scenario=request.scenario,
            max_rounds=request.max_rounds,
            personalities=request.personalities,
        )

        # Agent A's real AI-reasoned turn
        agent_a = orchestrator.get_current_agent()

        turn_a = generate_agent_turn(
            agent=agent_a,
            personality=orchestrator.get_current_personality(),
            scenario=orchestrator.scenario,
            history=orchestrator.history,
            current_offer=orchestrator.current_offer,
            round_num=orchestrator.round,
            max_rounds=orchestrator.max_rounds,
        )

        orchestrator.add_message(
            agent_name=agent_a["name"],
            action=turn_a["action"],
            message=turn_a["message"],
            offer=turn_a["offer"]
        )

        # Move to Agent B
        orchestrator.advance_turn()

        agent_b = orchestrator.get_current_agent()

        turn_b = generate_agent_turn(
            agent=agent_b,
            personality=orchestrator.get_current_personality(),
            scenario=orchestrator.scenario,
            history=orchestrator.history,
            current_offer=orchestrator.current_offer,
            round_num=orchestrator.round,
            max_rounds=orchestrator.max_rounds,
        )

        orchestrator.add_message(
            agent_name=agent_b["name"],
            action=turn_b["action"],
            message=turn_b["message"],
            offer=turn_b["offer"]
        )

        # Move to next turn
        orchestrator.advance_turn()

        return {
            "message": "Turn management test successful (real AI)",
            "state": orchestrator.get_context()
        }

    except Exception as e:
        return JSONResponse(
            status_code=400,
            content={"error": str(e)}
        )

@app.post("/api/negotiation/next-turn")
def next_turn(request: AgentTurnRequest):
    """Generates one AI-reasoned turn for the current agent and returns the
    updated negotiation state. Stateless: the caller (frontend) is expected
    to send back the state this endpoint returns as the body of the next call.
    """
    try:
        orchestrator = NegotiationOrchestrator(
            scenario=request.scenario,
            max_rounds=request.max_rounds,
            personalities=request.personalities,
            round=request.round,
            current_agent_index=request.current_agent_index,
            status=request.status,
            history=request.history,
            current_offer=request.current_offer,
            current_offer_unit=request.current_offer_unit,
            is_deadlocked=request.is_deadlocked,
            deadlock_rounds_remaining=request.deadlock_rounds_remaining,
        )

        if not orchestrator.is_active():
            return {
                "message": "Negotiation has already ended",
                "turn": None,
                "state": orchestrator.get_context(),
            }

        agent = orchestrator.get_current_agent()
        personality = orchestrator.get_current_personality()

        turn = generate_agent_turn(
            agent=agent,
            personality=personality,
            scenario=orchestrator.scenario,
            history=orchestrator.history,
            current_offer=orchestrator.current_offer,
            round_num=orchestrator.round,
            max_rounds=orchestrator.max_rounds,
            current_offer_unit=orchestrator.current_offer_unit,
            is_deadlocked=orchestrator.is_deadlocked,
        )

        orchestrator.add_message(
            agent_name=agent["name"],
            action=turn["action"],
            message=turn["message"],
            offer=turn["offer"],
            unit=turn.get("unit"),
            is_human=False,
        )

        if turn["action"] == "accept":
            state = orchestrator.finish("agreement")
        else:
            orchestrator.advance_turn()
            # If the orchestrator detected a breakdown, report it.
            if orchestrator.status == "breakdown":
                state = orchestrator.finish("breakdown")
            else:
                state = orchestrator.get_context()

        return {
            "message": "Turn generated successfully",
            "turn": {**turn, "agent": agent["name"]},
            "state": state,
        }

    except Exception as e:
        return JSONResponse(
            status_code=400,
            content={"error": str(e)}
        )

@app.post("/api/negotiation/human-turn")
def human_turn(request: HumanTurnRequest):
    """Processes a human participant's turn, updates the negotiation state,
    and advances the turn index to the next AI agent.
    """
    try:
        orchestrator = NegotiationOrchestrator(
            scenario=request.scenario,
            max_rounds=request.max_rounds,
            personalities=request.personalities,
            round=request.round,
            current_agent_index=request.current_agent_index,
            status=request.status,
            history=request.history,
            current_offer=request.current_offer,
            current_offer_unit=request.current_offer_unit,
            is_deadlocked=request.is_deadlocked,
            deadlock_rounds_remaining=request.deadlock_rounds_remaining,
        )

        if not orchestrator.is_active():
            return {
                "message": "Negotiation has already ended",
                "turn": None,
                "state": orchestrator.get_context(),
            }

        unit = request.unit or orchestrator.current_offer_unit
        action = request.action.lower()
        if action not in ("offer", "counter", "accept", "reject"):
            action = "counter"

        offer = request.offer
        if action == "accept":
            offer = orchestrator.current_offer if orchestrator.current_offer is not None else offer

        orchestrator.add_message(
            agent_name=request.agent_name,
            action=action,
            message=request.message,
            offer=offer,
            unit=unit,
            is_human=True,
        )

        turn_payload = {
            "agent": request.agent_name,
            "action": action,
            "offer": offer,
            "unit": unit,
            "message": request.message,
            "reasoning": "Human participant strategic decision.",
            "is_human": True,
        }

        if action == "accept":
            state = orchestrator.finish("agreement")
        elif action == "reject":
            state = orchestrator.finish("breakdown")
        else:
            orchestrator.advance_turn()
            if orchestrator.status == "breakdown":
                state = orchestrator.finish("breakdown")
            else:
                state = orchestrator.get_context()

        return {
            "message": "Human turn recorded successfully",
            "turn": turn_payload,
            "state": state,
        }

    except Exception as e:
        return JSONResponse(
            status_code=400,
            content={"error": str(e)}
        )

@app.post("/api/negotiation/evaluate")
def evaluate_current_offer(request: EvaluateRequest):
    """On-demand evaluation of an offer from a specific agent's perspective.
    Returns structured scoring, concession data, and a recommendation
    without advancing the negotiation state.
    """
    try:
        result = evaluate_offer(
            agent=request.agent,
            personality=request.personality,
            scenario=request.scenario,
            history=request.history,
            current_offer=request.current_offer,
            round_num=request.round,
            max_rounds=request.max_rounds,
            offer_unit=request.current_offer_unit,
        )

        return {
            "message": "Evaluation completed successfully",
            "evaluation": evaluation_to_dict(result),
        }

    except Exception as e:
        return JSONResponse(
            status_code=400,
            content={"error": str(e)}
        )

class ConclusionRequest(BaseModel):
    scenario: dict
    history: list = []
    status: str = "agreement"
    final_offer: Optional[float] = None
    final_offer_unit: Optional[str] = None
    total_rounds: int = 1
    human_role: Optional[str] = None

@app.post("/api/negotiation/conclusion")
def get_negotiation_conclusion(request: ConclusionRequest):
    """Generates an executive-level summary and debrief of the completed negotiation."""
    try:
        from agent_reasoning import generate_negotiation_conclusion
        conclusion = generate_negotiation_conclusion(
            scenario=request.scenario,
            history=request.history,
            status=request.status,
            final_offer=request.final_offer,
            final_offer_unit=request.final_offer_unit,
            total_rounds=request.total_rounds,
            human_role=request.human_role,
        )
        return {
            "message": "Conclusion generated successfully",
            "conclusion": conclusion,
        }
    except Exception as e:
        return JSONResponse(
            status_code=400,
            content={"error": str(e)}
        )

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 4000))
    uvicorn.run(app, host="0.0.0.0", port=port)