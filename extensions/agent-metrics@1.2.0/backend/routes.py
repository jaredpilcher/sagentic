"""
Agent Metrics Extension - Backend Routes

This extension adds analytics endpoints to compute aggregate metrics
from the workflow runs data.

Demonstrates:
- Querying the main database (runs, nodes, messages)
- Using ExtensionStorage for persistent extension-specific data
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta


EXTENSION_NAME = "agent-metrics"


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
    
    @router.get("/settings")
    def get_settings():
        """Get extension settings from persistent storage."""
        from src.extensions.storage import ExtensionStorage
        
        storage = ExtensionStorage(EXTENSION_NAME)
        return {
            "default_period_days": storage.get("default_period_days", 7),
            "refresh_interval_seconds": storage.get("refresh_interval_seconds", 60),
            "show_cost_data": storage.get("show_cost_data", True)
        }
    
    @router.put("/settings")
    def update_settings(body: dict):
        """Update extension settings in persistent storage."""
        from src.extensions.storage import ExtensionStorage
        
        storage = ExtensionStorage(EXTENSION_NAME)
        
        if "default_period_days" in body:
            storage.set("default_period_days", body["default_period_days"])
        if "refresh_interval_seconds" in body:
            storage.set("refresh_interval_seconds", body["refresh_interval_seconds"])
        if "show_cost_data" in body:
            storage.set("show_cost_data", body["show_cost_data"])
        
        return {"success": True, "settings": get_settings()}
    
    @router.post("/bookmark")
    def bookmark_run(body: dict):
        """Bookmark a run for later review (demonstrates list storage)."""
        from src.extensions.storage import ExtensionStorage
        
        storage = ExtensionStorage(EXTENSION_NAME)
        run_id = body.get("run_id")
        note = body.get("note", "")
        
        if not run_id:
            return {"success": False, "error": "run_id required"}
        
        bookmarks = storage.get("bookmarks", [])
        bookmarks.append({
            "run_id": run_id,
            "note": note,
            "bookmarked_at": datetime.utcnow().isoformat()
        })
        storage.set("bookmarks", bookmarks)
        
        return {"success": True, "count": len(bookmarks)}
    
    @router.get("/bookmarks")
    def list_bookmarks():
        """List all bookmarked runs."""
        from src.extensions.storage import ExtensionStorage
        
        storage = ExtensionStorage(EXTENSION_NAME)
        return {"bookmarks": storage.get("bookmarks", [])}
    
    @router.delete("/bookmark/{run_id}")
    def remove_bookmark(run_id: str):
        """Remove a bookmarked run."""
        from src.extensions.storage import ExtensionStorage
        
        storage = ExtensionStorage(EXTENSION_NAME)
        bookmarks = storage.get("bookmarks", [])
        bookmarks = [b for b in bookmarks if b.get("run_id") != run_id]
        storage.set("bookmarks", bookmarks)
        
        return {"success": True, "count": len(bookmarks)}
    
    @router.get("/pages/settings")
    def get_settings_page():
        """Return structured data for the settings page."""
        from src.extensions.storage import ExtensionStorage
        
        storage = ExtensionStorage(EXTENSION_NAME)
        return {
            "title": "Settings",
            "sections": [
                {
                    "id": "preferences",
                    "title": "Preferences",
                    "type": "stats",
                    "data": {
                        "default_period_days": storage.get("default_period_days", 7),
                        "refresh_interval_seconds": storage.get("refresh_interval_seconds", 60),
                        "show_cost_data": storage.get("show_cost_data", True)
                    }
                }
            ]
        }
    
    @router.get("/pages/bookmarks")
    def get_bookmarks_page():
        """Return structured data for the bookmarks page."""
        from src.extensions.storage import ExtensionStorage
        
        storage = ExtensionStorage(EXTENSION_NAME)
        bookmarks = storage.get("bookmarks", [])
        
        if not bookmarks:
            return {
                "title": "Bookmarks",
                "sections": [
                    {
                        "id": "empty",
                        "title": "No Bookmarks",
                        "type": "custom",
                        "data": "<p class='text-muted-foreground'>You haven't bookmarked any runs yet. Use the 'Bookmark' action on a run to save it here.</p>"
                    }
                ]
            }
        
        return {
            "title": "Bookmarks",
            "sections": [
                {
                    "id": "bookmarks-list",
                    "title": f"Bookmarked Runs ({len(bookmarks)})",
                    "type": "table",
                    "data": [
                        {
                            "Run ID": b.get("run_id", "")[:8] + "...",
                            "Note": b.get("note", "No note"),
                            "Bookmarked": b.get("bookmarked_at", "")[:10] if b.get("bookmarked_at") else ""
                        }
                        for b in bookmarks
                    ]
                }
            ]
        }
    
    @router.get("/pages/trends")
    def get_trends_page():
        """Return structured data for the trends page."""
        from src.db.database import SessionLocal
        from src.db.models import Run
        
        db = SessionLocal()
        try:
            cutoff_7d = datetime.utcnow() - timedelta(days=7)
            cutoff_14d = datetime.utcnow() - timedelta(days=14)
            
            runs_last_7d = db.query(func.count(Run.id)).filter(Run.started_at >= cutoff_7d).scalar() or 0
            runs_prev_7d = db.query(func.count(Run.id)).filter(
                Run.started_at >= cutoff_14d,
                Run.started_at < cutoff_7d
            ).scalar() or 0
            
            tokens_last_7d = db.query(func.sum(Run.total_tokens)).filter(Run.started_at >= cutoff_7d).scalar() or 0
            tokens_prev_7d = db.query(func.sum(Run.total_tokens)).filter(
                Run.started_at >= cutoff_14d,
                Run.started_at < cutoff_7d
            ).scalar() or 0
            
            cost_last_7d = db.query(func.sum(Run.total_cost)).filter(Run.started_at >= cutoff_7d).scalar() or 0
            cost_prev_7d = db.query(func.sum(Run.total_cost)).filter(
                Run.started_at >= cutoff_14d,
                Run.started_at < cutoff_7d
            ).scalar() or 0
            
            def calc_trend(current, previous):
                if previous == 0:
                    return "+100%" if current > 0 else "0%"
                change = ((current - previous) / previous) * 100
                return f"+{change:.1f}%" if change >= 0 else f"{change:.1f}%"
            
            return {
                "title": "Trends",
                "sections": [
                    {
                        "id": "week-over-week",
                        "title": "Week over Week Comparison",
                        "type": "stats",
                        "data": {
                            "runs_this_week": runs_last_7d,
                            "runs_last_week": runs_prev_7d,
                            "runs_trend": calc_trend(runs_last_7d, runs_prev_7d),
                            "tokens_this_week": tokens_last_7d,
                            "tokens_last_week": tokens_prev_7d,
                            "tokens_trend": calc_trend(tokens_last_7d, tokens_prev_7d),
                            "cost_this_week": round(float(cost_last_7d), 4),
                            "cost_last_week": round(float(cost_prev_7d), 4),
                            "cost_trend": calc_trend(float(cost_last_7d), float(cost_prev_7d))
                        }
                    }
                ]
            }
        finally:
            db.close()
    
    @router.post("/modals/bookmark-run")
    def handle_bookmark_modal(context: dict):
        """Handle the bookmark modal content."""
        run_id = context.get("run_id", "")
        graph_id = context.get("graph_id", "Unknown")
        
        return {
            "title": "Bookmark Run",
            "html": f"""
                <div class="space-y-4">
                    <p>Add a bookmark for this run to review later.</p>
                    <div>
                        <label class="text-sm text-muted-foreground">Run ID</label>
                        <p class="font-mono text-sm">{run_id}</p>
                    </div>
                    <div>
                        <label class="text-sm text-muted-foreground">Agent</label>
                        <p>{graph_id}</p>
                    </div>
                </div>
            """,
            "data": {"run_id": run_id, "graph_id": graph_id},
            "actions": [
                {"id": "cancel", "label": "Cancel"},
                {"id": "save", "label": "Save Bookmark", "primary": True}
            ]
        }
    
    @router.post("/modals/bookmark-run/actions/save")
    def save_bookmark_from_modal(context: dict):
        """Save a bookmark from the modal."""
        from src.extensions.storage import ExtensionStorage
        
        storage = ExtensionStorage(EXTENSION_NAME)
        run_id = context.get("run_id")
        
        if run_id:
            bookmarks = storage.get("bookmarks", [])
            if not any(b.get("run_id") == run_id for b in bookmarks):
                bookmarks.append({
                    "run_id": run_id,
                    "note": f"Bookmarked from {context.get('graph_id', 'unknown')}",
                    "bookmarked_at": datetime.utcnow().isoformat()
                })
                storage.set("bookmarks", bookmarks)
        
        return {"close": True, "message": "Bookmark saved!"}
    
    @router.post("/modals/bookmark-run/actions/cancel")
    def cancel_bookmark_modal(context: dict):
        """Cancel the bookmark modal."""
        return {"close": True}
    
    def cleanup():
        """Cleanup function called when extension is unloaded."""
        pass
    
    return cleanup
