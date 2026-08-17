# Complete Cloud Deployment Guide

This repository contains a full-stack application:
- **Backend**: FastAPI / Python (located in `/backend`)
- **Frontend**: React / Vite / TypeScript (located in `/construction-negotiation-frontend`)

---

## 1. Backend Deployment (Render / Railway / Koyeb)

### Option A: Render (Recommended)

1. Log into [Render.com](https://render.com) and click **New +** -> **Web Service**.
2. Connect your GitHub repository: `Bolagani-Baby-Prasanna/MultiAgent_Negotiation_Simulator`.
3. Configure the service settings:
   - **Name**: `negotiation-backend`
   - **Root Directory**: `backend`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn -k uvicorn.workers.UvicornWorker main:app --bind 0.0.0.0:$PORT` (or `uvicorn main:app --host 0.0.0.0 --port $PORT`)
4. Add Environment Variable (Optional):
   - `GEMINI_API_KEY`: *(Your Google Gemini API Key - if not provided, backend automatically uses intelligent algorithmic fallback)*
5. Click **Create Web Service**. Your backend URL will be e.g. `https://negotiation-backend.onrender.com`.

### Option B: Railway

1. Log into [Railway.app](https://railway.app) and create a **New Project** from GitHub.
2. Select your repository and set the Root Directory to `backend`.
3. Railway automatically detects `requirements.txt` and `Procfile`.

---

## 2. Frontend Deployment (Vercel / Netlify / Render)

### Option A: Vercel (Recommended)

1. Log into [Vercel.com](https://vercel.com) and click **Add New Project**.
2. Import your GitHub repository `Bolagani-Baby-Prasanna/MultiAgent_Negotiation_Simulator`.
3. Configure Project Settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click *Edit* and select `construction-negotiation-frontend`.
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add Environment Variable:
   - `VITE_API_BASE_URL`: `https://negotiation-backend.onrender.com` *(Replace with your live deployed backend URL)*
5. Click **Deploy**.

---

## Quick Troubleshooting Checklist

| Issue | Cause | Solution |
|---|---|---|
| **CORS Error in Browser** | Backend blocking frontend URL | Backend `main.py` is configured with `allow_origins=["*"]`. Ensure backend URL in `VITE_API_BASE_URL` is correct without a trailing slash. |
| **404 on Page Refresh** | SPA routing not configured on Vercel | `construction-negotiation-frontend/vercel.json` is included to handle route rewrites automatically. |
| **Backend Startup Failure** | Missing API Key or wrong port | Backend handles missing `GEMINI_API_KEY` gracefully without crashing and binds dynamically to `$PORT`. |
