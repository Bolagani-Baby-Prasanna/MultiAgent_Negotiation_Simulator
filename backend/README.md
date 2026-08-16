# Negotiation Backend (Python / FastAPI)

## Setup

1. Create a virtual environment and install dependencies:
   ```
   python -m venv .venv
   .venv\Scripts\python.exe -m pip install -r requirements.txt
   ```
2. Copy `.env.example` to `.env` and add your own Gemini API key (free, no
   credit card — get one at https://aistudio.google.com).
3. Run the server:
   ```
   .venv\Scripts\python.exe main.py
   ```
   It listens on `http://localhost:4000`.

## Endpoints

- `GET /health` — returns `{"status": "ok"}` if the server is running.
- `POST /api/test` — body `{"prompt": "..."}`, forwards it to Gemini and
  returns `{"reply": "..."}`. Used by the frontend's Settings page
  "AI Connection Test" card to verify the backend is reachable.
