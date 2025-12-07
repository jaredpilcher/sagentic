from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from ...db.database import get_db
from ...services.run_service import RunService
from ...core.schemas import (
    TraceIngest, RunSummary, RunDetailResponse, RunGraphResponse, 
    NodeExecutionResponse, MessageResponse, EdgeResponse, IngestResponse,
    EvaluationCreate, EvaluationResponse
)

router = APIRouter(prefix="/api/runs", tags=["runs"])

def get_service(db: Session = Depends(get_db)) -> RunService:
    return RunService(db)



@router.get("", response_model=List[RunSummary])
def list_runs(
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    framework: Optional[str] = None,
    status: Optional[str] = None,
    agent_id: Optional[str] = None,
    graph_id: Optional[str] = None,
    service: RunService = Depends(get_service)
):
    """List runs with summary."""
    runs = service.list_runs(
        limit=limit, offset=offset, 
        framework=framework, status=status, 
        agent_id=agent_id, graph_id=graph_id
    )
    
    # Mapper logic (could be in service, but View Model mapping in Router is OK)
    result = []
    for run in runs:
        # Node count specific query might be needed if not eager loaded
        # Ideally service returns what we need. 
        # For Refactor, let's keep it simple: access relation if loaded, 
        # or service should have attached it. Run model has node_executions relationship.
        node_count = len(run.node_executions) 
        
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
            error=run.error,
            input_state=run.input_state,
            output_state=run.output_state
        ))
    return result

@router.get("/{run_id}", response_model=RunDetailResponse)
def get_run(run_id: str, service: RunService = Depends(get_service)):
    """Get full run details."""
    run = service.get_run(run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    
    # Mapping
    node_responses = []
    for node in run.node_executions:
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
            ) for m in node.messages]
        ))
        
    edge_responses = [EdgeResponse(
        id=e.id,
        from_node=e.from_node,
        to_node=e.to_node,
        condition_label=e.condition_label,
        order=e.order
    ) for e in run.edges]
    
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

# Note: Ingest is actually /api/traces, so we probably want a separate router or include it here
