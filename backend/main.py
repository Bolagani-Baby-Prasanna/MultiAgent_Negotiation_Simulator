import os

from orchestrator import NegotiationOrchestrator
from agent_reasoning import generate_agent_turn
from counteroffer_evaluator import evaluate_offer, evaluation_to_dict
import google.generativeai as genai
import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional

load_dotenv()

genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))
model = genai.GenerativeModel("gemini-flash-latest")

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

class AgentTurnRequest(BaseModel):
    scenario: dict
    max_rounds: int = 10
    personalities: dict = {}
    history: list = []
    round: int = 1
    current_agent_index: int = 0
    current_offer: Optional[float] = None
    status: str = "active"

class EvaluateRequest(BaseModel):
    agent: dict
    personality: Optional[str] = "Collaborative"
    scenario: dict
    history: list = []
    current_offer: Optional[float] = None
    round: int = 1
    max_rounds: int = 10

@app.get("/health")
def health():
    return {"status": "ok"}


# Step 1 test endpoint: proves the backend can successfully reach the AI model.
@app.post("/api/test")
def test_ai(body: TestRequest):
    try:
        result = model.generate_content(body.prompt)
        return {"reply": result.text}
    except Exception:
        return JSONResponse(
            status_code=500,
            content={"error": "Failed to get a response from the AI model"},
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
            max_rounds=request.max_rounds
        )

        # Agent A makes a test offer
        agent_a = orchestrator.get_current_agent()

        orchestrator.add_message(
            agent_name=agent_a["name"],
            action="offer",
            message="Agent A makes an initial offer.",
            offer=800
        )

        # Move to Agent B
        orchestrator.advance_turn()

        agent_b = orchestrator.get_current_agent()

        orchestrator.add_message(
            agent_name=agent_b["name"],
            action="counter",
            message="Agent B makes a counteroffer.",
            offer=850
        )

        # Move to next turn
        orchestrator.advance_turn()

        return {
            "message": "Turn management test successful",
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
        )

        orchestrator.add_message(
            agent_name=agent["name"],
            action=turn["action"],
            message=turn["message"],
            offer=turn["offer"],
        )

        if turn["action"] == "accept":
            state = orchestrator.finish("agreement")
        else:
            orchestrator.advance_turn()
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

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 4000))
    uvicorn.run(app, host="0.0.0.0", port=port)