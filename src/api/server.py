from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
from datetime import datetime
import uuid

from ..db.database import get_db
from ..db.models import Run, NodeExecution, Message, Edge, Evaluation
from ..core.schemas import (
    TraceIngest, RunCreate, EvaluationCreate,
    RunSummary, RunDetailResponse, RunGraphResponse,
    NodeExecutionResponse, MessageResponse, EdgeResponse,
    EvaluationResponse, IngestResponse, HealthResponse, RunStatus
)

app = FastAPI(
    title="Sagentic - LangGraph Observability",
    description="Lightweight observability for LangGraph agent workflows",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health", response_model=HealthResponse)
def health_check():
    return {"status": "ok", "version": "1.0.0"}


@app.post("/api/traces", response_model=IngestResponse)
def ingest_trace(trace: TraceIngest, db: Session = Depends(get_db)):
    """Ingest a complete workflow trace from LangGraph.
    
    Supports upsert: if run_id exists, existing data is replaced with new trace.
    Uses provided timestamps when available, otherwise defaults to current time.
    Preserves source ordering from trace payload.
    """
    run_id = trace.run_id or str(uuid.uuid4())
    now = datetime.utcnow()
    
    existing_run = db.query(Run).filter(Run.id == run_id).first()
    if existing_run:
        db.query(Edge).filter(Edge.run_id == run_id).delete()
        node_ids = db.query(NodeExecution.id).filter(NodeExecution.run_id == run_id).all()
        for (node_id,) in node_ids:
            db.query(Message).filter(Message.node_execution_id == node_id).delete()
        db.query(NodeExecution).filter(NodeExecution.run_id == run_id).delete()
        db.delete(existing_run)
        db.flush()
        db.expunge(existing_run)
    
    total_tokens = 0
    total_cost = 0.0
    total_latency = 0
    
    run_started_at = trace.started_at or now
    run_ended_at = trace.ended_at or (now if trace.status != RunStatus.RUNNING else None)
    
    run = Run(
        id=run_id,
        graph_id=trace.graph_id,
        graph_version=trace.graph_version,
        framework=trace.framework,
        agent_id=trace.agent_id,
        status=trace.status.value,
        started_at=run_started_at,
        ended_at=run_ended_at,
        input_state=trace.input_state,
        output_state=trace.output_state,
        error=trace.error,
        run_metadata=trace.run_metadata,
        tags=trace.tags
    )
    db.add(run)
    
    for idx, node_data in enumerate(trace.nodes):
        node_id = str(uuid.uuid4())
        node_latency = 0
        
        state_diff = None
        if node_data.state_in and node_data.state_out:
            state_diff = compute_state_diff(node_data.state_in, node_data.state_out)
        
        node_order = node_data.order if node_data.order is not None else idx
        node_started_at = node_data.started_at or now
        node_ended_at = node_data.ended_at or now
        
        node = NodeExecution(
            id=node_id,
            run_id=run_id,
            node_key=node_data.node_key,
            node_type=node_data.node_type,
            order=node_order,
            status="completed" if not node_data.error else "failed",
            started_at=node_started_at,
            ended_at=node_ended_at,
            state_in=node_data.state_in,
            state_out=node_data.state_out,
            state_diff=state_diff,
            error=node_data.error
        )
        db.add(node)
        
        for msg_order, msg_data in enumerate(node_data.messages):
            message = Message(
                id=str(uuid.uuid4()),
                node_execution_id=node_id,
                order=msg_order,
                role=msg_data.role.value,
                content=msg_data.content,
                model=msg_data.model,
                provider=msg_data.provider,
                input_tokens=msg_data.input_tokens,
                output_tokens=msg_data.output_tokens,
                total_tokens=msg_data.total_tokens,
                cost=msg_data.cost,
                latency_ms=msg_data.latency_ms,
                tool_calls=msg_data.tool_calls,
                tool_results=msg_data.tool_results,
                raw_request=msg_data.raw_request,
                raw_response=msg_data.raw_response
            )
            db.add(message)
            
            if msg_data.total_tokens:
                total_tokens += msg_data.total_tokens
            if msg_data.cost:
                total_cost += msg_data.cost
            if msg_data.latency_ms:
                node_latency += msg_data.latency_ms
        
        node.latency_ms = node_latency
        total_latency += node_latency
    
    for edge_order, edge_data in enumerate(trace.edges):
        edge = Edge(
            id=str(uuid.uuid4()),
            run_id=run_id,
            from_node=edge_data.from_node,
            to_node=edge_data.to_node,
            condition_label=edge_data.condition_label,
            order=edge_order
        )
        db.add(edge)
    
    run.total_tokens = total_tokens
    run.total_cost = total_cost
    run.total_latency_ms = total_latency
    
    db.commit()
    
    return IngestResponse(
        status="ingested",
        run_id=run_id,
        node_count=len(trace.nodes),
        edge_count=len(trace.edges)
    )


@app.get("/api/runs", response_model=List[RunSummary])
def list_runs(
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    framework: Optional[str] = None,
    status: Optional[str] = None,
    agent_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """List all workflow runs with summary info."""
    query = db.query(Run)
    
    if framework:
        query = query.filter(Run.framework == framework)
    if status:
        query = query.filter(Run.status == status)
    if agent_id:
        query = query.filter(Run.agent_id == agent_id)
    
    runs = query.order_by(desc(Run.started_at)).offset(offset).limit(limit).all()
    
    result = []
    for run in runs:
        node_count = db.query(NodeExecution).filter(NodeExecution.run_id == run.id).count()
        result.append(RunSummary(
            id=run.id,
            graph_id=run.graph_id,
            framework=run.framework,
            agent_id=run.agent_id,
            status=run.status,
            started_at=run.started_at,
            ended_at=run.ended_at,
            total_tokens=run.total_tokens or 0,
            total_cost=run.total_cost or 0.0,
            total_latency_ms=run.total_latency_ms or 0,
            node_count=node_count,
            tags=run.tags,
            error=run.error
        ))
    
    return result


@app.get("/api/runs/{run_id}", response_model=RunDetailResponse)
def get_run(run_id: str, db: Session = Depends(get_db)):
    """Get detailed run with all nodes, messages, and edges."""
    run = db.query(Run).filter(Run.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    
    nodes = db.query(NodeExecution).filter(
        NodeExecution.run_id == run_id
    ).order_by(NodeExecution.order).all()
    
    node_responses = []
    for node in nodes:
        messages = db.query(Message).filter(
            Message.node_execution_id == node.id
        ).order_by(Message.order).all()
        
        node_responses.append(NodeExecutionResponse(
            id=node.id,
            node_key=node.node_key,
            node_type=node.node_type,
            order=node.order,
            status=node.status,
            started_at=node.started_at,
            ended_at=node.ended_at,
            latency_ms=node.latency_ms,
            state_in=node.state_in,
            state_out=node.state_out,
            state_diff=node.state_diff,
            error=node.error,
            messages=[MessageResponse(
                id=m.id,
                order=m.order,
                role=m.role,
                content=m.content,
                model=m.model,
                provider=m.provider,
                input_tokens=m.input_tokens,
                output_tokens=m.output_tokens,
                total_tokens=m.total_tokens,
                cost=m.cost,
                latency_ms=m.latency_ms,
                tool_calls=m.tool_calls,
                tool_results=m.tool_results
            ) for m in messages]
        ))
    
    edges = db.query(Edge).filter(Edge.run_id == run_id).order_by(Edge.order).all()
    edge_responses = [EdgeResponse(
        id=e.id,
        from_node=e.from_node,
        to_node=e.to_node,
        condition_label=e.condition_label,
        order=e.order
    ) for e in edges]
    
    return RunDetailResponse(
        id=run.id,
        graph_id=run.graph_id,
        graph_version=run.graph_version,
        framework=run.framework,
        agent_id=run.agent_id,
        status=run.status,
        started_at=run.started_at,
        ended_at=run.ended_at,
        input_state=run.input_state,
        output_state=run.output_state,
        total_tokens=run.total_tokens or 0,
        total_cost=run.total_cost or 0.0,
        total_latency_ms=run.total_latency_ms or 0,
        error=run.error,
        tags=run.tags,
        run_metadata=run.run_metadata,
        nodes=node_responses,
        edges=edge_responses
    )


@app.get("/api/runs/{run_id}/graph", response_model=RunGraphResponse)
def get_run_graph(run_id: str, db: Session = Depends(get_db)):
    """Get graph visualization data for a run."""
    run = db.query(Run).filter(Run.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    
    nodes = db.query(NodeExecution).filter(
        NodeExecution.run_id == run_id
    ).order_by(NodeExecution.order).all()
    
    edges = db.query(Edge).filter(Edge.run_id == run_id).order_by(Edge.order).all()
    
    node_data = [{
        "id": n.node_key,
        "node_execution_id": n.id,
        "type": n.node_type or "default",
        "order": n.order,
        "status": n.status,
        "latency_ms": n.latency_ms,
        "has_error": bool(n.error)
    } for n in nodes]
    
    edge_data = [{
        "id": e.id,
        "source": e.from_node,
        "target": e.to_node,
        "label": e.condition_label
    } for e in edges]
    
    return RunGraphResponse(
        run_id=run_id,
        nodes=node_data,
        edges=edge_data
    )


@app.get("/api/runs/{run_id}/nodes/{node_id}")
def get_node_detail(run_id: str, node_id: str, db: Session = Depends(get_db)):
    """Get detailed info for a specific node execution."""
    node = db.query(NodeExecution).filter(
        NodeExecution.id == node_id,
        NodeExecution.run_id == run_id
    ).first()
    
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")
    
    messages = db.query(Message).filter(
        Message.node_execution_id == node.id
    ).order_by(Message.order).all()
    
    return {
        "id": node.id,
        "run_id": node.run_id,
        "node_key": node.node_key,
        "node_type": node.node_type,
        "order": node.order,
        "status": node.status,
        "started_at": node.started_at,
        "ended_at": node.ended_at,
        "latency_ms": node.latency_ms,
        "state_in": node.state_in,
        "state_out": node.state_out,
        "state_diff": node.state_diff,
        "error": node.error,
        "messages": [{
            "id": m.id,
            "order": m.order,
            "role": m.role,
            "content": m.content,
            "model": m.model,
            "provider": m.provider,
            "input_tokens": m.input_tokens,
            "output_tokens": m.output_tokens,
            "total_tokens": m.total_tokens,
            "cost": m.cost,
            "latency_ms": m.latency_ms,
            "tool_calls": m.tool_calls,
            "tool_results": m.tool_results,
            "raw_request": m.raw_request,
            "raw_response": m.raw_response
        } for m in messages]
    }


@app.post("/api/evaluations", response_model=EvaluationResponse)
def create_evaluation(evaluation: EvaluationCreate, db: Session = Depends(get_db)):
    """Create an evaluation/feedback for a run or node."""
    run = db.query(Run).filter(Run.id == evaluation.run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    
    if evaluation.node_execution_id:
        node = db.query(NodeExecution).filter(
            NodeExecution.id == evaluation.node_execution_id
        ).first()
        if not node:
            raise HTTPException(status_code=404, detail="Node not found")
    
    eval_record = Evaluation(
        id=str(uuid.uuid4()),
        run_id=evaluation.run_id,
        node_execution_id=evaluation.node_execution_id,
        evaluator=evaluation.evaluator,
        score=evaluation.score,
        label=evaluation.label,
        comment=evaluation.comment,
        is_automated=evaluation.is_automated
    )
    db.add(eval_record)
    db.commit()
    db.refresh(eval_record)
    
    return EvaluationResponse(
        id=eval_record.id,
        run_id=eval_record.run_id,
        node_execution_id=eval_record.node_execution_id,
        evaluator=eval_record.evaluator,
        score=eval_record.score,
        label=eval_record.label,
        comment=eval_record.comment,
        is_automated=eval_record.is_automated,
        created_at=eval_record.created_at
    )


@app.get("/api/runs/{run_id}/evaluations", response_model=List[EvaluationResponse])
def get_run_evaluations(run_id: str, db: Session = Depends(get_db)):
    """Get all evaluations for a run."""
    evaluations = db.query(Evaluation).filter(Evaluation.run_id == run_id).all()
    return [EvaluationResponse(
        id=e.id,
        run_id=e.run_id,
        node_execution_id=e.node_execution_id,
        evaluator=e.evaluator,
        score=e.score,
        label=e.label,
        comment=e.comment,
        is_automated=e.is_automated,
        created_at=e.created_at
    ) for e in evaluations]


def compute_state_diff(state_in: dict, state_out: dict) -> dict:
    """Compute the difference between input and output states."""
    diff = {
        "added": {},
        "removed": {},
        "modified": {}
    }
    
    all_keys = set(state_in.keys()) | set(state_out.keys())
    
    for key in all_keys:
        if key not in state_in:
            diff["added"][key] = state_out[key]
        elif key not in state_out:
            diff["removed"][key] = state_in[key]
        elif state_in[key] != state_out[key]:
            diff["modified"][key] = {
                "before": state_in[key],
                "after": state_out[key]
            }
    
    return diff
