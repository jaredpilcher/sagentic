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

### Development Mode
Both services are configured to run automatically via workflows:
- **Frontend**: Runs on port 5000 via "Frontend" workflow
- **Backend**: Runs on port 3000 via "Backend" workflow

The frontend proxies `/api` requests to the backend on port 3000.

### Production Mode (Deployment)
When deployed, both services run automatically:
- Backend: uvicorn on 0.0.0.0:3000
- Frontend: vite preview on 0.0.0.0:5000
- Startup script: `start_production.sh`

The deployment is configured to:
1. Build the frontend (`npm run build`)
2. Start both backend and frontend using `start_production.sh`
3. Use VM deployment target for stateful operation

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
