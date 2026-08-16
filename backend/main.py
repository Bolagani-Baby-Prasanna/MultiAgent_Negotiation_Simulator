import os

from orchestrator import NegotiationOrchestrator
import google.generativeai as genai
import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

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
    
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 4000))
    uvicorn.run(app, host="0.0.0.0", port=port)
