import os

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


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 4000))
    uvicorn.run(app, host="0.0.0.0", port=port)
