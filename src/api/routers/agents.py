
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
import statistics

from ...db.database import get_db
from ...db.models import Run

router = APIRouter(
    prefix="/api/agents",
    tags=["agents"]
)

@router.get("")
def list_agents(db: Session = Depends(get_db)):
    """
    Get aggregated agent metrics grouped by graph_id.
    Since we don't have an explicit Agents table, we derive existence from Runs.
    """
    # Get all runs
    # In a real app with millions of runs, we'd use SQL aggregation.
    # For now, fetching all runs and aggregating in python is fine for MVP/PoC 
    # OR we can write a smart query. Let's do a smart query.
    
    # We want to group by graph_id
    # But graph_id can be null? We should probably filter nulls or treating them as "adhoc".
    
    # Let's just fetch all runs for now to keep logic simple and robust, 
    # as SQL grouping with complex metrics (avg latency of completed only?) can be tricky in pure alchemy quickly.
    # Actually, SQL alchemy isn't too hard.
    
    # However, to match the frontend 'Agent' interface:
    # interface Agent {
    #     graph_id: string
    #     total_runs: number
    #     completed_runs: number
    #     failed_runs: number
    #     running_runs: number
    #     success_rate: number
    #     total_tokens: number
    #     total_cost: number
    #     avg_latency_ms: number
    #     last_run_at: string | null
    #     first_run_at: string | null
    # }
    
    runs = db.query(Run).all()
    
    agents_map = {}
    
    for run in runs:
        gid = run.graph_id or "adhoc"
        
        if gid not in agents_map:
            agents_map[gid] = {
                "graph_id": gid,
                "total_runs": 0,
                "completed_runs": 0,
                "failed_runs": 0,
                "running_runs": 0,
                "total_tokens": 0,
                "total_cost": 0.0,
                "latencies": [],
                "last_run_at": None,
                "first_run_at": None
            }
        
        agent = agents_map[gid]
        agent["total_runs"] += 1
        agent["total_tokens"] += (run.total_tokens or 0)
        agent["total_cost"] += (run.total_cost or 0.0)
        
        if run.status == "completed":
            agent["completed_runs"] += 1
            if run.total_latency_ms:
                agent["latencies"].append(run.total_latency_ms)
        elif run.status == "failed":
            agent["failed_runs"] += 1
        elif run.status == "running":
            agent["running_runs"] += 1
            
        # Dates
        if run.started_at:
            if not agent["first_run_at"] or run.started_at < agent["first_run_at"]:
                agent["first_run_at"] = run.started_at
            if not agent["last_run_at"] or run.started_at > agent["last_run_at"]:
                agent["last_run_at"] = run.started_at

    # Finalize
    results = []
    for gid, data in agents_map.items():
        total = data["total_runs"]
        success_rate = (data["completed_runs"] / total * 100) if total > 0 else 0
        avg_latency = statistics.mean(data["latencies"]) if data["latencies"] else 0
        
        results.append({
            "graph_id": gid,
            "total_runs": total,
            "completed_runs": data["completed_runs"],
            "failed_runs": data["failed_runs"],
            "running_runs": data["running_runs"],
            "success_rate": round(success_rate, 1),
            "total_tokens": data["total_tokens"],
            "total_cost": data["total_cost"],
            "avg_latency_ms": int(avg_latency),
            "last_run_at": data["last_run_at"],
            "first_run_at": data["first_run_at"]
        })
        
    return {"agents": results}

@router.get("/{graph_id}")
def get_agent(graph_id: str, db: Session = Depends(get_db)):
    """Get single agent stats (same logic, filtered)."""
    # Reuse list logic for consistency or optimize.
    # List logic is fast enough for <1000 runs.
    all_agents = list_agents(db)["agents"]
    
    # Decode if needed, though requests handle it.
    # graph_id might need decoding from URL? FastAPI handles it.
    
    for agent in all_agents:
        if agent["graph_id"] == graph_id:
            return agent
            
    # If not found but runs might exist? 
    # If logic implies existence from Runs, and we iterated all Runs, then it truly doesn't exist.
    return JSONResponse(status_code=404, content={"message": "Agent not found"})
