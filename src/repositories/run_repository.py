from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc, func, case
from .base import BaseRepository
from ..db.models import Run, NodeExecution, Message, Edge

class RunRepository(BaseRepository[Run]):
    def __init__(self, db: Session):
        super().__init__(db, Run)

    def get_with_details(self, run_id: str) -> Optional[Run]:
        """Get run with all relations loaded if needed (lazy loading usually handles this, 
        but explicit join queries can be here if optimized)."""
        return self.get(run_id)

    def list_runs(
        self, 
        limit: int, 
        offset: int, 
        graph_id: Optional[str] = None, 
        framework: Optional[str] = None, 
        status: Optional[str] = None, 
        agent_id: Optional[str] = None
    ) -> List[Run]:
        query = self.db.query(Run)
        if graph_id:
            query = query.filter(Run.graph_id == graph_id)
        if framework:
            query = query.filter(Run.framework == framework)
        if status:
            query = query.filter(Run.status == status)
        if agent_id:
            query = query.filter(Run.agent_id == agent_id)
        
        return query.order_by(desc(Run.started_at)).offset(offset).limit(limit).all()

    def delete_run_cascade(self, run_id: str):
        """Manually delete related items if cascade setup isn't sufficient or for explicit control."""
        # Note: In models.py, relationships might not have cascade delete configured fully on DB level for all tables if not using foreign key cascades.
        # But typically we rely on ORM or DB cascades. 
        # The original code did manual deletion. I will replicate that to be safe or ensure models have cascade.
        # Original code manual delete:
        self.db.query(Edge).filter(Edge.run_id == run_id).delete()
        
        # Subquery or join delete for messages usually needed if not cascading
        node_ids = self.db.query(NodeExecution.id).filter(NodeExecution.run_id == run_id).all()
        for (node_id,) in node_ids:
            self.db.query(Message).filter(Message.node_execution_id == node_id).delete()
            
        self.db.query(NodeExecution).filter(NodeExecution.run_id == run_id).delete()
        
        run = self.get(run_id)
        if run:
            self.db.delete(run)
            self.db.commit()

    def get_agent_stats(self):
        """Aggregated stats for agents."""
        return self.db.query(
            Run.graph_id,
            func.count(Run.id).label('total_runs'),
            func.sum(case((Run.status == 'completed', 1), else_=0)).label('completed_runs'),
            func.sum(case((Run.status == 'failed', 1), else_=0)).label('failed_runs'),
            func.sum(case((Run.status == 'running', 1), else_=0)).label('running_runs'),
            func.sum(Run.total_tokens).label('total_tokens'),
            func.sum(Run.total_cost).label('total_cost'),
            func.avg(Run.total_latency_ms).label('avg_latency_ms'),
            func.max(Run.started_at).label('last_run_at'),
            func.min(Run.started_at).label('first_run_at')
        ).filter(
            Run.graph_id.isnot(None)
        ).group_by(Run.graph_id).all()

    def get_single_agent_stats(self, graph_id: str):
        return self.db.query(
            Run.graph_id,
            func.count(Run.id).label('total_runs'),
            func.sum(case((Run.status == 'completed', 1), else_=0)).label('completed_runs'),
            func.sum(case((Run.status == 'failed', 1), else_=0)).label('failed_runs'),
            func.sum(case((Run.status == 'running', 1), else_=0)).label('running_runs'),
            func.sum(Run.total_tokens).label('total_tokens'),
            func.sum(Run.total_cost).label('total_cost'),
            func.avg(Run.total_latency_ms).label('avg_latency_ms'),
            func.max(Run.started_at).label('last_run_at'),
            func.min(Run.started_at).label('first_run_at')
        ).filter(Run.graph_id == graph_id).group_by(Run.graph_id).first()
