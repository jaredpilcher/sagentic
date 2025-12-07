from fastapi import FastAPI, Depends, HTTPException, Query, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
from datetime import datetime
from pathlib import Path
import uuid
import tempfile
import os

from ..db.database import get_db
from ..db.models import Run, NodeExecution, Message, Edge, Evaluation, Extension, ExtensionData, ExtensionNetworkAudit
from ..extensions.manager import ExtensionManager, EXTENSIONS_DIR
from ..extensions.schemas import (
    ExtensionInfo, ExtensionManifest, ExtensionListResponse,
    ExtensionInstallResponse, ExtensionStatusUpdate, FrontendExtensionManifest
)
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


extension_manager = ExtensionManager(app)


@app.get("/api/extensions", response_model=ExtensionListResponse)
def list_extensions(
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """List all installed extensions."""
    query = db.query(Extension)
    if status:
        query = query.filter(Extension.status == status)
    
    extensions = query.order_by(Extension.name).all()
    
    return ExtensionListResponse(
        extensions=[ExtensionInfo(
            id=e.id,
            name=e.name,
            version=e.version,
            description=e.description,
            status=e.status,
            has_backend=e.has_backend or False,
            has_frontend=e.has_frontend or False,
            manifest=ExtensionManifest(**e.manifest),
            created_at=e.created_at,
            updated_at=e.updated_at
        ) for e in extensions],
        total=len(extensions)
    )


@app.get("/api/extensions/frontend-manifest")
def get_frontend_manifest(db: Session = Depends(get_db)):
    """Get manifest of enabled extensions with their UI contribution points."""
    extensions = db.query(Extension).filter(
        Extension.status == "enabled"
    ).all()
    
    manifests = []
    for ext in extensions:
        manifest = ext.manifest
        contributes = manifest.get("contributes")
        
        manifests.append(FrontendExtensionManifest(
            id=ext.id,
            name=ext.name,
            version=ext.version,
            description=ext.description,
            frontend_entry=manifest.get("frontend_entry"),
            contributes=contributes,
            base_url=f"/api/extensions/{ext.name}/assets",
            api_base_url=f"/api/extensions/{ext.name}"
        ))
    
    return {"extensions": [m.model_dump() for m in manifests]}


@app.post("/api/extensions/install", response_model=ExtensionInstallResponse)
async def install_extension(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Upload and install an extension package (zip file)."""
    if not file.filename.endswith('.zip'):
        raise HTTPException(status_code=400, detail="File must be a .zip archive")
    
    with tempfile.NamedTemporaryFile(delete=False, suffix='.zip') as temp_file:
        content = await file.read()
        temp_file.write(content)
        temp_path = temp_file.name
    
    try:
        success, message, manifest = extension_manager.install_from_zip(temp_path)
        
        if not success:
            return ExtensionInstallResponse(success=False, message=message)
        
        existing = db.query(Extension).filter(Extension.name == manifest["name"]).first()
        if existing:
            existing.version = manifest["version"]
            existing.description = manifest.get("description")
            existing.manifest = manifest
            existing.has_backend = bool(manifest.get("backend_entry"))
            existing.has_frontend = bool(manifest.get("frontend_entry"))
            existing.updated_at = datetime.utcnow()
            ext_id = existing.id
        else:
            ext_id = str(uuid.uuid4())
            ext = Extension(
                id=ext_id,
                name=manifest["name"],
                version=manifest["version"],
                description=manifest.get("description"),
                status="enabled",
                manifest=manifest,
                install_path=str(extension_manager.get_extension_path(manifest["name"], manifest["version"])),
                has_backend=bool(manifest.get("backend_entry")),
                has_frontend=bool(manifest.get("frontend_entry"))
            )
            db.add(ext)
        
        db.commit()
        
        if manifest.get("backend_entry"):
            load_success, load_msg = extension_manager.load_backend(
                ext_id, manifest["name"], manifest["version"], manifest["backend_entry"]
            )
            if not load_success:
                return ExtensionInstallResponse(
                    success=True,
                    extension_id=ext_id,
                    name=manifest["name"],
                    message=f"Installed but backend failed to load: {load_msg}"
                )
        
        return ExtensionInstallResponse(
            success=True,
            extension_id=ext_id,
            name=manifest["name"],
            message=message
        )
        
    finally:
        os.unlink(temp_path)


@app.delete("/api/extensions/{extension_id}", response_model=ExtensionInstallResponse)
def uninstall_extension(extension_id: str, db: Session = Depends(get_db)):
    """Uninstall an extension."""
    ext = db.query(Extension).filter(Extension.id == extension_id).first()
    if not ext:
        raise HTTPException(status_code=404, detail="Extension not found")
    
    extension_manager.unload_backend(extension_id)
    
    success, message = extension_manager.uninstall(ext.name, ext.version)
    
    db.delete(ext)
    db.commit()
    
    return ExtensionInstallResponse(
        success=success,
        extension_id=extension_id,
        name=ext.name,
        message=message
    )


@app.patch("/api/extensions/{extension_id}/status")
def update_extension_status(
    extension_id: str,
    update: ExtensionStatusUpdate,
    db: Session = Depends(get_db)
):
    """Enable or disable an extension."""
    ext = db.query(Extension).filter(Extension.id == extension_id).first()
    if not ext:
        raise HTTPException(status_code=404, detail="Extension not found")
    
    if update.status not in ["enabled", "disabled"]:
        raise HTTPException(status_code=400, detail="Status must be 'enabled' or 'disabled'")
    
    if update.status == "disabled" and ext.status == "enabled":
        extension_manager.unload_backend(extension_id)
    elif update.status == "enabled" and ext.status == "disabled":
        if ext.has_backend and ext.manifest.get("backend_entry"):
            extension_manager.load_backend(
                ext.id, ext.name, ext.version, ext.manifest["backend_entry"]
            )
    
    ext.status = update.status
    ext.updated_at = datetime.utcnow()
    db.commit()
    
    return {"success": True, "status": ext.status}


@app.get("/api/extensions/{extension_id}")
def get_extension(extension_id: str, db: Session = Depends(get_db)):
    """Get extension details."""
    ext = db.query(Extension).filter(Extension.id == extension_id).first()
    if not ext:
        raise HTTPException(status_code=404, detail="Extension not found")
    
    return ExtensionInfo(
        id=ext.id,
        name=ext.name,
        version=ext.version,
        description=ext.description,
        status=ext.status,
        has_backend=ext.has_backend or False,
        has_frontend=ext.has_frontend or False,
        manifest=ExtensionManifest(**ext.manifest),
        created_at=ext.created_at,
        updated_at=ext.updated_at
    )


EXTENSIONS_DIR.mkdir(parents=True, exist_ok=True)


@app.get("/api/extensions/{extension_id}/data")
def list_extension_data(
    extension_id: str,
    prefix: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """List all data keys for an extension, optionally filtered by prefix."""
    ext = db.query(Extension).filter(Extension.id == extension_id).first()
    if not ext:
        raise HTTPException(status_code=404, detail="Extension not found")
    
    query = db.query(ExtensionData).filter(ExtensionData.extension_id == extension_id)
    if prefix:
        query = query.filter(ExtensionData.key.startswith(prefix))
    
    entries = query.order_by(ExtensionData.key).all()
    
    return {
        "extension_id": extension_id,
        "extension_name": ext.name,
        "count": len(entries),
        "entries": [
            {
                "key": entry.key,
                "value": entry.value,
                "created_at": entry.created_at.isoformat() if entry.created_at else None,
                "updated_at": entry.updated_at.isoformat() if entry.updated_at else None
            }
            for entry in entries
        ]
    }


@app.get("/api/extensions/{extension_id}/data/{key:path}")
def get_extension_data(
    extension_id: str,
    key: str,
    db: Session = Depends(get_db)
):
    """Get a specific data value for an extension by key."""
    ext = db.query(Extension).filter(Extension.id == extension_id).first()
    if not ext:
        raise HTTPException(status_code=404, detail="Extension not found")
    
    entry = db.query(ExtensionData).filter(
        ExtensionData.extension_id == extension_id,
        ExtensionData.key == key
    ).first()
    
    if not entry:
        raise HTTPException(status_code=404, detail=f"Data key '{key}' not found")
    
    return {
        "key": entry.key,
        "value": entry.value,
        "created_at": entry.created_at.isoformat() if entry.created_at else None,
        "updated_at": entry.updated_at.isoformat() if entry.updated_at else None
    }


@app.put("/api/extensions/{extension_id}/data/{key:path}")
def set_extension_data(
    extension_id: str,
    key: str,
    body: dict,
    db: Session = Depends(get_db)
):
    """Set a data value for an extension. Creates or updates the key."""
    ext = db.query(Extension).filter(Extension.id == extension_id).first()
    if not ext:
        raise HTTPException(status_code=404, detail="Extension not found")
    
    value = body.get("value")
    
    entry = db.query(ExtensionData).filter(
        ExtensionData.extension_id == extension_id,
        ExtensionData.key == key
    ).first()
    
    if entry:
        entry.value = value
        entry.updated_at = datetime.utcnow()
    else:
        entry = ExtensionData(
            id=str(uuid.uuid4()),
            extension_id=extension_id,
            key=key,
            value=value
        )
        db.add(entry)
    
    db.commit()
    
    return {
        "success": True,
        "key": key,
        "created": entry.created_at == entry.updated_at if entry.updated_at else True
    }


@app.delete("/api/extensions/{extension_id}/data/{key:path}")
def delete_extension_data(
    extension_id: str,
    key: str,
    db: Session = Depends(get_db)
):
    """Delete a specific data key for an extension."""
    ext = db.query(Extension).filter(Extension.id == extension_id).first()
    if not ext:
        raise HTTPException(status_code=404, detail="Extension not found")
    
    entry = db.query(ExtensionData).filter(
        ExtensionData.extension_id == extension_id,
        ExtensionData.key == key
    ).first()
    
    if not entry:
        raise HTTPException(status_code=404, detail=f"Data key '{key}' not found")
    
    db.delete(entry)
    db.commit()
    
    return {"success": True, "key": key}


@app.get("/api/extensions/by-name/{extension_name}/data")
def list_extension_data_by_name(
    extension_name: str,
    prefix: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """List data for an extension by its name (for use by extension backends)."""
    ext = db.query(Extension).filter(Extension.name == extension_name).first()
    if not ext:
        raise HTTPException(status_code=404, detail="Extension not found")
    
    return list_extension_data(ext.id, prefix, db)


@app.get("/api/extensions/by-name/{extension_name}/data/{key:path}")
def get_extension_data_by_name(
    extension_name: str,
    key: str,
    db: Session = Depends(get_db)
):
    """Get data for an extension by its name."""
    ext = db.query(Extension).filter(Extension.name == extension_name).first()
    if not ext:
        raise HTTPException(status_code=404, detail="Extension not found")
    
    return get_extension_data(ext.id, key, db)


@app.put("/api/extensions/by-name/{extension_name}/data/{key:path}")
def set_extension_data_by_name(
    extension_name: str,
    key: str,
    body: dict,
    db: Session = Depends(get_db)
):
    """Set data for an extension by its name."""
    ext = db.query(Extension).filter(Extension.name == extension_name).first()
    if not ext:
        raise HTTPException(status_code=404, detail="Extension not found")
    
    return set_extension_data(ext.id, key, body, db)


@app.delete("/api/extensions/by-name/{extension_name}/data/{key:path}")
def delete_extension_data_by_name(
    extension_name: str,
    key: str,
    db: Session = Depends(get_db)
):
    """Delete data for an extension by its name."""
    ext = db.query(Extension).filter(Extension.name == extension_name).first()
    if not ext:
        raise HTTPException(status_code=404, detail="Extension not found")
    
    return delete_extension_data(ext.id, key, db)


@app.get("/api/extensions/{extension_id}/audit")
def get_extension_audit_log(
    extension_id: str,
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    allowed_only: Optional[bool] = None,
    blocked_only: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    """Get network audit log for an extension.
    
    Shows all HTTP requests made by the extension, both allowed and blocked.
    Useful for reviewing extension behavior and troubleshooting.
    """
    ext = db.query(Extension).filter(Extension.id == extension_id).first()
    if not ext:
        raise HTTPException(status_code=404, detail="Extension not found")
    
    query = db.query(ExtensionNetworkAudit).filter(
        ExtensionNetworkAudit.extension_id == extension_id
    )
    
    if allowed_only:
        query = query.filter(ExtensionNetworkAudit.allowed == True)
    elif blocked_only:
        query = query.filter(ExtensionNetworkAudit.allowed == False)
    
    total = query.count()
    
    entries = query.order_by(
        desc(ExtensionNetworkAudit.created_at)
    ).offset(offset).limit(limit).all()
    
    return {
        "extension_id": extension_id,
        "extension_name": ext.name,
        "total": total,
        "offset": offset,
        "limit": limit,
        "entries": [
            {
                "id": entry.id,
                "target_url": entry.target_url,
                "method": entry.method,
                "allowed": entry.allowed,
                "blocked_reason": entry.blocked_reason,
                "response_status": entry.response_status,
                "response_time_ms": entry.response_time_ms,
                "request_body_hash": entry.request_body_hash,
                "response_body_excerpt": entry.response_body_excerpt[:200] if entry.response_body_excerpt else None,
                "error": entry.error,
                "created_at": entry.created_at.isoformat() if entry.created_at else None
            }
            for entry in entries
        ]
    }


@app.get("/api/extensions/{extension_id}/audit/{audit_id}")
def get_audit_entry_detail(
    extension_id: str,
    audit_id: str,
    db: Session = Depends(get_db)
):
    """Get full details of a specific audit log entry."""
    ext = db.query(Extension).filter(Extension.id == extension_id).first()
    if not ext:
        raise HTTPException(status_code=404, detail="Extension not found")
    
    entry = db.query(ExtensionNetworkAudit).filter(
        ExtensionNetworkAudit.id == audit_id,
        ExtensionNetworkAudit.extension_id == extension_id
    ).first()
    
    if not entry:
        raise HTTPException(status_code=404, detail="Audit entry not found")
    
    return {
        "id": entry.id,
        "extension_id": entry.extension_id,
        "extension_name": entry.extension_name,
        "target_url": entry.target_url,
        "method": entry.method,
        "request_headers": entry.request_headers,
        "request_body_hash": entry.request_body_hash,
        "request_body_size": entry.request_body_size,
        "response_status": entry.response_status,
        "response_time_ms": entry.response_time_ms,
        "response_headers": entry.response_headers,
        "response_body_excerpt": entry.response_body_excerpt,
        "response_body_size": entry.response_body_size,
        "allowed": entry.allowed,
        "blocked_reason": entry.blocked_reason,
        "error": entry.error,
        "created_at": entry.created_at.isoformat() if entry.created_at else None
    }


@app.get("/api/audit/all")
def get_all_audit_logs(
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    extension_name: Optional[str] = None,
    allowed_only: Optional[bool] = None,
    blocked_only: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    """Get audit logs across all extensions (admin view).
    
    Provides a global view of all extension network activity.
    """
    query = db.query(ExtensionNetworkAudit)
    
    if extension_name:
        query = query.filter(ExtensionNetworkAudit.extension_name == extension_name)
    
    if allowed_only:
        query = query.filter(ExtensionNetworkAudit.allowed == True)
    elif blocked_only:
        query = query.filter(ExtensionNetworkAudit.allowed == False)
    
    total = query.count()
    
    entries = query.order_by(
        desc(ExtensionNetworkAudit.created_at)
    ).offset(offset).limit(limit).all()
    
    return {
        "total": total,
        "offset": offset,
        "limit": limit,
        "entries": [
            {
                "id": entry.id,
                "extension_name": entry.extension_name,
                "target_url": entry.target_url,
                "method": entry.method,
                "allowed": entry.allowed,
                "blocked_reason": entry.blocked_reason,
                "response_status": entry.response_status,
                "response_time_ms": entry.response_time_ms,
                "error": entry.error,
                "created_at": entry.created_at.isoformat() if entry.created_at else None
            }
            for entry in entries
        ]
    }


@app.get("/api/extensions/{extension_id}/permissions")
def get_extension_permissions(
    extension_id: str,
    db: Session = Depends(get_db)
):
    """Get the permissions requested by an extension.
    
    Returns the full permissions manifest including storage access
    and allowed network URLs. This is what the user should review
    before installing or enabling an extension.
    """
    ext = db.query(Extension).filter(Extension.id == extension_id).first()
    if not ext:
        raise HTTPException(status_code=404, detail="Extension not found")
    
    permissions = ext.manifest.get("permissions", {})
    
    storage_permission = permissions.get("storage", False)
    network_permissions = permissions.get("network", [])
    
    formatted_network = []
    for perm in network_permissions:
        if isinstance(perm, dict):
            formatted_network.append({
                "url": perm.get("url"),
                "description": perm.get("description", "No description provided"),
                "methods": perm.get("methods", ["ALL"])
            })
        else:
            formatted_network.append({
                "url": perm,
                "description": "No description provided",
                "methods": ["ALL"]
            })
    
    return {
        "extension_id": extension_id,
        "extension_name": ext.name,
        "permissions": {
            "storage": storage_permission,
            "network": formatted_network
        },
        "summary": {
            "requires_storage": storage_permission,
            "network_access_count": len(formatted_network),
            "network_urls": [p["url"] for p in formatted_network]
        }
    }


@app.on_event("startup")
async def load_enabled_extensions():
    """Load backend code for all enabled extensions on startup."""
    from ..db.database import SessionLocal
    db = SessionLocal()
    try:
        extensions = db.query(Extension).filter(
            Extension.status == "enabled",
            Extension.has_backend == True
        ).all()
        
        for ext in extensions:
            if ext.manifest.get("backend_entry"):
                success, msg = extension_manager.load_backend(
                    ext.id, ext.name, ext.version, ext.manifest["backend_entry"]
                )
                if success:
                    print(f"Loaded extension backend: {ext.name}")
                else:
                    print(f"Failed to load extension {ext.name}: {msg}")
    finally:
        db.close()
