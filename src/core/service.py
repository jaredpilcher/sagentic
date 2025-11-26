
import json
import uuid
from datetime import datetime
from sqlalchemy.orm import Session
from ..core.models import AgentStep, AnalysisResult
from ..core.analysis import registry
from ..db.database import Run, Step, AnalysisResultDB
from ..engines.basic_stats import BasicStatsEngine

# Register engines
registry.register(BasicStatsEngine())

class TelemetryService:
    def __init__(self, db: Session):
        self.db = db

    async def ingest_step(self, step: AgentStep):
        # 1. Ensure Run exists
        run = self.db.query(Run).filter(Run.id == step.run_id).first()
        if not run:
            run = Run(id=step.run_id, agent_id=step.agent_id, created_at=datetime.utcnow())
            self.db.add(run)
            self.db.commit()

        # 2. Create Step
        db_step = Step(
            id=step.step_id,
            run_id=step.run_id,
            agent_id=step.agent_id,
            timestamp=step.timestamp,
            role=step.role,
            prompt_system=step.prompt.system,
            prompt_user=step.prompt.user,
            prompt_assistant_context=step.prompt.assistant_context,
            prompt_tools_trace=json.dumps([t.dict() for t in step.prompt.tools_trace]),
            response=step.response,
            metadata_json=json.dumps(step.metadata)
        )
        self.db.add(db_step)
        self.db.commit()

        # 3. Run Analyses
        analysis_results = []
        for engine in registry.get_all_engines():
            try:
                result = await engine.analyze_step(step)
                analysis_results.append(result)

                db_analysis = AnalysisResultDB(
                    id=str(uuid.uuid4()),
                    step_id=step.step_id,
                    engine_id=result.engine_id,
                    metrics=json.dumps(result.metrics),
                    summary=result.summary
                )
                self.db.add(db_analysis)
            except Exception as e:
                print(f"Error running analysis engine {engine.id}: {e}")
        
        self.db.commit()

        return {
            "status": "logged",
            "step_id": step.step_id,
            "analyses": analysis_results
        }

    def get_runs(self):
        return self.db.query(Run).order_by(Run.created_at.desc()).limit(100).all()

    def get_run_steps(self, run_id: str):
        steps = self.db.query(Step).filter(Step.run_id == run_id).order_by(Step.timestamp.asc()).all()
        return steps

    def get_step(self, step_id: str):
        return self.db.query(Step).filter(Step.id == step_id).first()

    async def ingest_span(self, span):
        from ..core.models import Span as SpanModel
        from ..db.database import SpanDB

        # 1. Ensure Run exists (Trace ID maps to Run ID)
        run = self.db.query(Run).filter(Run.id == span.trace_id).first()
        if not run:
            # If trace doesn't exist, create a placeholder run
            # In a real system we might want more info here
            run = Run(id=span.trace_id, agent_id="unknown", created_at=datetime.utcnow())
            self.db.add(run)
            self.db.commit()

        # 2. Create Span
        db_span = SpanDB(
            span_id=span.span_id,
            trace_id=span.trace_id,
            parent_id=span.parent_id,
            name=span.name,
            start_time=span.start_time,
            end_time=span.end_time,
            span_kind=span.span_kind.value,
            attributes_json=json.dumps(span.attributes),
            input_json=json.dumps(span.input) if span.input else None,
            output_json=json.dumps(span.output) if span.output else None,
            status_code=span.status_code.value,
            events_json=json.dumps(span.events)
        )
        self.db.add(db_span)
        self.db.commit()
        
        return {
            "status": "logged",
            "span_id": span.span_id,
            "trace_id": span.trace_id
        }

    def get_run_spans(self, run_id: str):
        from ..db.database import SpanDB
        return self.db.query(SpanDB).filter(SpanDB.trace_id == run_id).order_by(SpanDB.start_time.asc()).all()


