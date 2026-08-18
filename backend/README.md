# Negotiation Backend (Python / FastAPI)

## Setup

1. Create a virtual environment and install dependencies:
   ```
   python -m venv .venv
   .venv\Scripts\python.exe -m pip install -r requirements.txt
   ```
2. Copy `.env.example` to `.env` and add your Groq API key (get one at https://console.groq.com).
3. Run the server:
   ```
   .venv\Scripts\python.exe main.py
   ```
   It listens on `http://localhost:4000`.

## Endpoints

- `GET /health` — returns `{"status": "ok"}` if the server is running.
- `POST /api/test` — body `{"prompt": "..."}`, forwards it to Groq AI and
  returns `{"reply": "..."}`. Used by the frontend's Settings page
  "AI Connection Test" card to verify the backend is reachable.

