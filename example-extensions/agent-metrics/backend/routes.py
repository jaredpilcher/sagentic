"""
Agent Metrics Extension - Backend Routes

This extension adds analytics endpoints to compute aggregate metrics
from the workflow runs data.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta


def register(router: APIRouter):
    """Register extension routes with the FastAPI router.
    
    This function is called when the extension is loaded.
    Returns a cleanup function if needed.
    """
    
    @router.get("/stats")
    def get_agent_stats(
        days: int = 7,
    ):
        """Get aggregate statistics for agents over the specified period."""
        from src.db.database import SessionLocal
        from src.db.models import Run, NodeExecution, Message
        
        db = SessionLocal()
        try:
            cutoff = datetime.utcnow() - timedelta(days=days)
            
            total_runs = db.query(func.count(Run.id)).filter(Run.started_at >= cutoff).scalar() or 0
            completed_runs = db.query(func.count(Run.id)).filter(
                Run.started_at >= cutoff,
                Run.status == 'completed'
            ).scalar() or 0
            failed_runs = db.query(func.count(Run.id)).filter(
                Run.started_at >= cutoff,
                Run.status == 'failed'
            ).scalar() or 0
            
            avg_latency = db.query(func.avg(Run.total_latency_ms)).filter(
                Run.started_at >= cutoff
            ).scalar() or 0
            
            total_tokens = db.query(func.sum(Run.total_tokens)).filter(
                Run.started_at >= cutoff
            ).scalar() or 0
            
            total_cost = db.query(func.sum(Run.total_cost)).filter(
                Run.started_at >= cutoff
            ).scalar() or 0
            
            unique_graphs = db.query(func.count(func.distinct(Run.graph_id))).filter(
                Run.started_at >= cutoff
            ).scalar() or 0
            
            total_nodes = db.query(func.count(NodeExecution.id)).join(Run).filter(
                Run.started_at >= cutoff
            ).scalar() or 0
            
            total_messages = db.query(func.count(Message.id)).join(NodeExecution).join(Run).filter(
                Run.started_at >= cutoff
            ).scalar() or 0
            
            return {
                "period_days": days,
                "total_runs": total_runs,
                "completed_runs": completed_runs,
                "failed_runs": failed_runs,
                "completion_rate": round(completed_runs / max(total_runs, 1) * 100, 1),
                "avg_latency_ms": round(float(avg_latency), 2),
                "total_tokens": total_tokens,
                "total_cost": round(float(total_cost), 4),
                "unique_graphs": unique_graphs,
                "total_nodes": total_nodes,
                "total_messages": total_messages
            }
        finally:
            db.close()
    
    @router.get("/daily")
    def get_daily_metrics(
        days: int = 7,
    ):
        """Get daily breakdown of metrics."""
        from src.db.database import SessionLocal
        from src.db.models import Run
        
        db = SessionLocal()
        try:
            cutoff = datetime.utcnow() - timedelta(days=days)
            
            daily_stats = db.query(
                func.date(Run.started_at).label('date'),
                func.count(Run.id).label('runs'),
                func.sum(Run.total_tokens).label('tokens'),
                func.sum(Run.total_cost).label('cost'),
                func.avg(Run.total_latency_ms).label('avg_latency')
            ).filter(
                Run.started_at >= cutoff
            ).group_by(
                func.date(Run.started_at)
            ).order_by(
                func.date(Run.started_at)
            ).all()
            
            return {
                "period_days": days,
                "daily": [
                    {
                        "date": str(row.date),
                        "runs": row.runs,
                        "tokens": row.tokens or 0,
                        "cost": round(float(row.cost or 0), 4),
                        "avg_latency_ms": round(float(row.avg_latency or 0), 2)
                    }
                    for row in daily_stats
                ]
            }
        finally:
            db.close()
    
    @router.get("/graphs")
    def get_graph_stats():
        """Get statistics grouped by graph_id."""
        from src.db.database import SessionLocal
        from src.db.models import Run
        
        db = SessionLocal()
        try:
            graph_stats = db.query(
                Run.graph_id,
                func.count(Run.id).label('runs'),
                func.sum(Run.total_tokens).label('tokens'),
                func.sum(Run.total_cost).label('cost'),
                func.avg(Run.total_latency_ms).label('avg_latency'),
                func.count(Run.id).filter(Run.status == 'completed').label('completed'),
                func.count(Run.id).filter(Run.status == 'failed').label('failed')
            ).group_by(
                Run.graph_id
            ).order_by(
                func.count(Run.id).desc()
            ).limit(20).all()
            
            return {
                "graphs": [
                    {
                        "graph_id": row.graph_id or "unknown",
                        "runs": row.runs,
                        "tokens": row.tokens or 0,
                        "cost": round(float(row.cost or 0), 4),
                        "avg_latency_ms": round(float(row.avg_latency or 0), 2),
                        "completed": row.completed,
                        "failed": row.failed,
                        "success_rate": round(row.completed / max(row.runs, 1) * 100, 1)
                    }
                    for row in graph_stats
                ]
            }
        finally:
            db.close()
    
    def cleanup():
        """Cleanup function called when extension is unloaded."""
        pass
    
    return cleanup
