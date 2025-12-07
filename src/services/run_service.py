from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
import uuid
from datetime import datetime, timezone

from ..repositories.run_repository import RunRepository
from ..db.models import Run, Message, NodeExecution, Edge, Evaluation
from ..core.schemas import TraceIngest, RunStatus

class RunService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = RunRepository(db)

    def get_run(self, run_id: str) -> Optional[Run]:
        return self.repo.get_with_details(run_id)
    
    def list_runs(self, limit: int = 50, offset: int = 0, **filters) -> List[Run]:
        return self.repo.list_runs(limit=limit, offset=offset, **filters)

    def delete_run(self, run_id: str):
        # Business logic: just delete for now, maybe logging later
        self.repo.delete_run_cascade(run_id)

    def ingest_trace(self, trace: TraceIngest) -> Dict[str, Any]:
        """Business logic for ingesting a trace."""
        # This was the massive function in server.py
        # Logic: 
        # 1. Check if run exists, delete if so (upsert)
        # 2. Create new Run
        # 3. Create Nodes, Messages, Edges
        # 4. Commit
        
        # Using repo methods? Repo methods for *bulk creation* might be useful.
        # But for now I'll do it here using the session, calling repo for basic things.
        # Ideally, `create_complete_run` should be in Repo to keep DB logic out of Service.
        # Let's refactor the massive ingest logic to here, but still directly accessing DB objects 
        # is acceptable in Service if Repo is too granular. 
        # Better: keep DB session management here.
        
        run_id = trace.run_id or str(uuid.uuid4())
        now = datetime.now(timezone.utc)
        
        # 1. Upsert Logic
        existing = self.repo.get(run_id)
        if existing:
            self.repo.delete_run_cascade(run_id)
            
        # Calculation Logic
        total_tokens = 0
        total_cost = 0.0
        total_latency = 0
        
        run_started_at = trace.started_at or now
        run_ended_at = trace.ended_at or (now if trace.status != RunStatus.RUNNING else None)
        
        # Create Run Object
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
        self.db.add(run) # Repo could wrap this, but batch adding children is complex
        
        # Process Nodes
        for idx, node_data in enumerate(trace.nodes):
            node_id = str(uuid.uuid4())
            node_latency = 0
            
            state_diff = None
            if node_data.state_in and node_data.state_out:
                state_diff = self._compute_state_diff(node_data.state_in, node_data.state_out)
            
            node_order = node_data.order if node_data.order is not None else idx
            node_started_at = node_data.started_at or now
            node_ended_at = node_data.ended_at or now
            
            node = NodeExecution(
                id=node_id,
                run_id=run_id,
                node_key=node_data.node_key,
                node_type=node_data.node_type,
                order=node_order,
                status=node_data.status or ("completed" if not node_data.error else "failed"),
                started_at=node_started_at,
                ended_at=node_ended_at,
                state_in=node_data.state_in,
                state_out=node_data.state_out,
                state_diff=state_diff,
                error=node_data.error
            )
            self.db.add(node)
            
            # Process Messages
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
                self.db.add(message)
                
                if msg_data.total_tokens:
                    total_tokens += msg_data.total_tokens
                if msg_data.cost:
                    total_cost += msg_data.cost
                if msg_data.latency_ms:
                    node_latency += msg_data.latency_ms
            
            node.latency_ms = node_latency
            total_latency += node_latency
            
        # Process Edges
        for edge_order, edge_data in enumerate(trace.edges):
            edge = Edge(
                id=str(uuid.uuid4()),
                run_id=run_id,
                from_node=edge_data.from_node,
                to_node=edge_data.to_node,
                condition_label=edge_data.condition_label,
                order=edge_order
            )
            self.db.add(edge)
            
        run.total_tokens = total_tokens
        run.total_cost = total_cost
        run.total_latency_ms = total_latency
        
        self.db.commit()
        
        return {
            "status": "ingested",
            "run_id": run_id,
            "node_count": len(trace.nodes),
            "edge_count": len(trace.edges)
        }

    def _compute_state_diff(self, state_in: dict, state_out: dict) -> dict:
        """Helper to compute diff."""
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

    def create_evaluation(self, eval_data):
        # Basic logic mapping to simple create
        # But we need to verify run_id exists
        run = self.repo.get(eval_data.run_id)
        if not run:
            return None # Or raise Error
        
        eval_record = Evaluation(
            id=str(uuid.uuid4()),
            run_id=eval_data.run_id,
            node_execution_id=eval_data.node_execution_id,
            evaluator=eval_data.evaluator,
            score=eval_data.score,
            label=eval_data.label,
            comment=eval_data.comment,
            is_automated=eval_data.is_automated
        )
        self.db.add(eval_record)
        self.db.commit()
        self.db.refresh(eval_record)
        return eval_record
