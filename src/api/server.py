
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
from ..core.models import AgentStep, IngestResponse, Span, SpanIngestResponse
from ..core.service import TelemetryService
from ..db.database import get_db, init_db, Step as DBStep
import json

app = FastAPI(title="Agent Step Telemetry Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For dev only
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    init_db()

@app.post("/api/steps", response_model=IngestResponse)
async def ingest_step(step: AgentStep, db: Session = Depends(get_db)):
    service = TelemetryService(db)
    return await service.ingest_step(step)

@app.post("/api/spans", response_model=SpanIngestResponse)
async def ingest_span(span: Span, db: Session = Depends(get_db)):
    service = TelemetryService(db)
    return await service.ingest_span(span)

@app.get("/api/runs")
def list_runs(db: Session = Depends(get_db)):
    service = TelemetryService(db)
    runs = service.get_runs()
    return [{"id": r.id, "agent_id": r.agent_id, "created_at": r.created_at} for r in runs]

@app.get("/api/runs/{run_id}/steps")
def list_run_steps(run_id: str, db: Session = Depends(get_db)):
    service = TelemetryService(db)
    steps = service.get_run_steps(run_id)
    return [{"id": s.id, "timestamp": s.timestamp, "role": s.role} for s in steps]

@app.get("/api/runs/{run_id}/spans")
def list_run_spans(run_id: str, db: Session = Depends(get_db)):
    service = TelemetryService(db)
    spans = service.get_run_spans(run_id)
    return [
        {
            "span_id": s.span_id,
            "trace_id": s.trace_id,
            "parent_id": s.parent_id,
            "name": s.name,
            "start_time": s.start_time,
            "end_time": s.end_time,
            "span_kind": s.span_kind,
            "attributes": json.loads(s.attributes_json) if s.attributes_json else {},
            "status_code": s.status_code
        }
        for s in spans
    ]


@app.get("/api/steps/{step_id}")
def get_step_details(step_id: str, db: Session = Depends(get_db)):
    service = TelemetryService(db)
    step = service.get_step(step_id)
    if not step:
        raise HTTPException(status_code=404, detail="Step not found")
    
    # Format response
    analyses = []
    for a in step.analyses:
        analyses.append({
            "engine_id": a.engine_id,
            "metrics": json.loads(a.metrics),
            "summary": a.summary,
            "created_at": a.created_at
        })

    return {
        "id": step.id,
        "run_id": step.run_id,
        "agent_id": step.agent_id,
        "timestamp": step.timestamp,
        "role": step.role,
        "prompt": {
            "user": step.prompt_user,
            "system": step.prompt_system,
            "assistant_context": step.prompt_assistant_context,
            "tools_trace": json.loads(step.prompt_tools_trace) if step.prompt_tools_trace else []
        },
        "response": step.response,
        "metadata": json.loads(step.metadata_json) if step.metadata_json else {},
        "analyses": analyses
    }

@app.post("/api/spans", response_model=IngestResponse) # Should be SpanIngestResponse but reusing for simplicity or need to import
async def ingest_span(span: AgentStep, db: Session = Depends(get_db)): # Type hint wrong, need Span
    # Let's fix imports first
    pass

