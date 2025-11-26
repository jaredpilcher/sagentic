
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
from ..core.models import AgentStep, IngestResponse, Span, SpanIngestResponse, Score, ScoreIngestResponse, PromptTemplate, Dataset, DatasetItem
from pydantic import BaseModel
from ..core.service import TelemetryService
from ..db.database import get_db, init_db, Step as DBStep
import json
from ..core.logging_config import configure_logging
import structlog
from ..engines.evaluator import Evaluator

configure_logging()
logger = structlog.get_logger()

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

@app.post("/api/scores", response_model=ScoreIngestResponse)
async def ingest_score(score: Score, db: Session = Depends(get_db)):
    service = TelemetryService(db)
    return await service.ingest_score(score)

@app.get("/api/runs")
def list_runs(db: Session = Depends(get_db)):
    service = TelemetryService(db)
    runs = service.get_runs()
    return [{
        "id": r.id, 
        "agent_id": r.agent_id, 
        "created_at": r.created_at,
        "tags": json.loads(r.tags_json) if r.tags_json else []
    } for r in runs]


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

@app.get("/api/runs/{run_id}/scores")
def list_run_scores(run_id: str, db: Session = Depends(get_db)):
    service = TelemetryService(db)
    scores = service.get_run_scores(run_id)
    return [
        {
            "score_id": s.score_id,
            "trace_id": s.trace_id,
            "span_id": s.span_id,
            "name": s.name,
            "value": s.value,
            "comment": s.comment,
            "timestamp": s.timestamp
        }
        for s in scores
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




@app.get("/api/generations")
def list_generations(db: Session = Depends(get_db)):
    service = TelemetryService(db)
    spans = service.get_generations()
    return [
        {
            "span_id": s.span_id,
            "trace_id": s.trace_id,
            "name": s.name,
            "start_time": s.start_time,
            "end_time": s.end_time,
            "attributes": json.loads(s.attributes_json) if s.attributes_json else {},
            "status_code": s.status_code
        }
        for s in spans
    ]

@app.post("/api/prompts")
def create_prompt(prompt: PromptTemplate, db: Session = Depends(get_db)):
    service = TelemetryService(db)
    return service.create_prompt(prompt)

@app.get("/api/prompts")
def list_prompts(db: Session = Depends(get_db)):
    service = TelemetryService(db)
    prompts = service.get_prompts()
    return [
        {
            "id": p.id,
            "name": p.name,
            "version": p.version,
            "template": p.template,
            "input_variables": json.loads(p.input_variables_json) if p.input_variables_json else [],
            "created_at": p.created_at
        }
        for p in prompts
    ]

@app.get("/api/prompts/{name}")
def get_prompt_history(name: str, db: Session = Depends(get_db)):
    service = TelemetryService(db)
    prompts = service.get_prompt_history(name)
    return [
        {
            "id": p.id,
            "name": p.name,
            "version": p.version,
            "template": p.template,
            "input_variables": json.loads(p.input_variables_json) if p.input_variables_json else [],
            "created_at": p.created_at
        }
        for p in prompts
    ]

@app.post("/api/datasets", response_model=Dataset)
def create_dataset(dataset: Dataset, db: Session = Depends(get_db)):
    service = TelemetryService(db)
    return service.create_dataset(dataset)

@app.get("/api/datasets", response_model=List[Dataset])
def list_datasets(db: Session = Depends(get_db)):
    service = TelemetryService(db)
    datasets = service.get_datasets()
    return datasets # SQLAlchemy models, Pydantic will adapt

@app.get("/api/datasets/{dataset_id}", response_model=Dataset)
def get_dataset(dataset_id: str, db: Session = Depends(get_db)):
    service = TelemetryService(db)
    dataset = service.get_dataset(dataset_id)
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return dataset

@app.post("/api/datasets/{dataset_id}/items", response_model=DatasetItem)
def add_dataset_item(dataset_id: str, item: DatasetItem, db: Session = Depends(get_db)):
    service = TelemetryService(db)
    # Ensure dataset exists
    if not service.get_dataset(dataset_id):
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    item.dataset_id = dataset_id # Override from URL
    return service.add_dataset_item(item)

@app.post("/api/evaluations/run")
def run_evaluation(run_id: str, dataset_id: str, db: Session = Depends(get_db)):
    evaluator = Evaluator(db)
    results = evaluator.evaluate_run(run_id, dataset_id)
    return {"status": "ok", "count": len(results)}

@app.get("/api/runs/{run_id}/evaluations")
def get_run_evaluations(run_id: str, db: Session = Depends(get_db)):
    evaluator = Evaluator(db)
    return evaluator.get_evaluations(run_id)

@app.get("/api/comparisons")
def compare_runs(base_run_id: str, candidate_run_id: str, db: Session = Depends(get_db)):
    # Mock comparison logic
    # In a real app, this would diff the traces and scores
    return {
        "id": str(uuid.uuid4()),
        "base_run_id": base_run_id,
        "candidate_run_id": candidate_run_id,
        "metrics": {
            "latency_diff_ms": -50,
            "score_diff": 0.1
        },
        "created_at": datetime.utcnow()
    }

class PlaygroundRequest(BaseModel):
    prompt: str
    model: str

@app.post("/api/playground/run")
async def run_playground(req: PlaygroundRequest, db: Session = Depends(get_db)):
    service = TelemetryService(db)
    return await service.run_playground_prompt(req.prompt, req.model)
