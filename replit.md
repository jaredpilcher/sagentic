# Sagentic - Agent Step Telemetry Service

## Overview
A lightweight, open-source telemetry service for LLM agents, built with Python, FastAPI, SQLite, and a React frontend.

## Project Structure
- **Frontend**: React + Vite + TypeScript (in `frontend/`)
  - Dashboard for viewing agent telemetry
  - Configured to run on port 5000
- **Backend**: FastAPI + Python (in `src/`)
  - REST API for agent telemetry ingestion
  - Runs on port 3000
  - Uses SQLite database for persistence

## Setup Status
✅ Python 3.11 installed
✅ Node.js 20 installed  
✅ Python dependencies installed
✅ Frontend dependencies installed
✅ Vite configured for 0.0.0.0:5000 with proxy to backend
✅ Frontend workflow configured and running
✅ Database initialized
✅ Missing imports (uuid, datetime) added to server.py

## Running the Application

### Frontend (Already Running)
The frontend is configured to run automatically via the "Frontend" workflow on port 5000.

### Backend
To start the backend server manually:
```bash
uvicorn src.api.server:app --host localhost --port 3000
```

Or use the provided script:
```bash
./start_backend.sh
```

The frontend proxies `/api` requests to the backend on port 3000.

## Recent Changes (Dec 4, 2025)
- Configured Vite to bind to 0.0.0.0:5000 with host verification bypass
- Added missing imports (uuid, datetime) to src/api/server.py
- Created frontend workflow for automatic startup
- Initialized SQLite database
- Created backend startup script

## Database
- Uses SQLite (sagentic.db)
- Auto-initialized on backend startup
- Schema includes: runs, steps, spans, scores, prompts, datasets, feedback, evaluations, comparisons

## API Endpoints
- POST `/api/steps` - Ingest agent step
- POST `/api/spans` - Ingest span
- POST `/api/scores` - Ingest score
- POST `/api/feedback` - Ingest feedback
- GET `/api/runs` - List runs
- GET `/api/generations` - List generations
- And more...
