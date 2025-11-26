
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

    def get_runs(self, limit: int = 100, offset: int = 0, tags: list[str] = None, min_latency: int = None, max_latency: int = None):
        query = self.db.query(Run)
        
        if tags:
            # This is a simple string check, ideally we'd use a proper JSON/Array contains query
            # For SQLite/Postgres compatibility without complex types, we'll do a basic LIKE check for now
            for tag in tags:
                query = query.filter(Run.tags_json.like(f'%"{tag}"%'))
                
        # For latency, we need to join with spans or steps, or assume latency is stored on Run?
        # The Run model doesn't have latency. We might need to compute it or store it.
        # For now, let's skip latency filtering on the DB side unless we add a column.
        # Alternatively, we can filter in memory (inefficient but works for small scale).
        
        runs = query.order_by(Run.created_at.desc()).limit(limit).offset(offset).all()
        return runs

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

    async def ingest_score(self, score):
        from ..db.database import ScoreDB
        
        # Ensure Run exists
        run = self.db.query(Run).filter(Run.id == score.trace_id).first()
        if not run:
            # Should probably error here in real life, but auto-create for now
            run = Run(id=score.trace_id, agent_id="unknown", created_at=datetime.utcnow())
            self.db.add(run)
            self.db.commit()

        db_score = ScoreDB(
            score_id=score.score_id,
            trace_id=score.trace_id,
            span_id=score.span_id,
            name=score.name,
            value=score.value,
            comment=score.comment,
            timestamp=score.timestamp
        )
        self.db.add(db_score)
        self.db.commit()

        return {
            "status": "logged",
            "score_id": score.score_id
        }

    def get_run_spans(self, run_id: str):
        from ..db.database import SpanDB
        return self.db.query(SpanDB).filter(SpanDB.trace_id == run_id).order_by(SpanDB.start_time.asc()).all()

    def get_run_scores(self, run_id: str):
        from ..db.database import ScoreDB
        return self.db.query(ScoreDB).filter(ScoreDB.trace_id == run_id).order_by(ScoreDB.timestamp.desc()).all()




    def get_generations(self):
        from ..db.database import SpanDB
        # Filter for LLM spans
        return self.db.query(SpanDB).filter(SpanDB.span_kind == "LLM").order_by(SpanDB.start_time.desc()).limit(100).all()

    def create_prompt(self, prompt):
        from ..db.database import PromptTemplateDB
        
        # Check for existing version to increment
        latest = self.db.query(PromptTemplateDB).filter(PromptTemplateDB.name == prompt.name).order_by(PromptTemplateDB.version.desc()).first()
        version = 1
        if latest:
            version = latest.version + 1
            
        db_prompt = PromptTemplateDB(
            id=str(uuid.uuid4()),
            name=prompt.name,
            version=version,
            template=prompt.template,
            input_variables_json=json.dumps(prompt.input_variables),
            created_at=datetime.utcnow()
        )
        self.db.add(db_prompt)
        self.db.commit()
        return db_prompt

    def get_prompts(self):
        from ..db.database import PromptTemplateDB
        from sqlalchemy import func
        
        # Get latest version of each prompt
        subquery = self.db.query(
            PromptTemplateDB.name,
            func.max(PromptTemplateDB.version).label('max_version')
        ).group_by(PromptTemplateDB.name).subquery()
        
        prompts = self.db.query(PromptTemplateDB).join(
            subquery,
            (PromptTemplateDB.name == subquery.c.name) & 
            (PromptTemplateDB.version == subquery.c.max_version)
        ).all()
        
        return prompts


    def get_prompt_history(self, name: str):
        from ..db.database import PromptTemplateDB
        return self.db.query(PromptTemplateDB).filter(PromptTemplateDB.name == name).order_by(PromptTemplateDB.version.desc()).all()

    def create_dataset(self, dataset):
        from ..db.database import DatasetDB
        db_dataset = DatasetDB(
            id=str(uuid.uuid4()),
            name=dataset.name,
            description=dataset.description,
            created_at=datetime.utcnow()
        )
        self.db.add(db_dataset)
        self.db.commit()
        return db_dataset

    def get_datasets(self):
        from ..db.database import DatasetDB
        return self.db.query(DatasetDB).order_by(DatasetDB.created_at.desc()).all()

    def get_dataset(self, dataset_id: str):
        from ..db.database import DatasetDB
        return self.db.query(DatasetDB).filter(DatasetDB.id == dataset_id).first()

    def add_dataset_item(self, item):
        from ..db.database import DatasetItemDB
        db_item = DatasetItemDB(
            id=str(uuid.uuid4()),
            dataset_id=item.dataset_id,
            input=item.input,
            expected_output=item.expected_output,
            created_at=datetime.utcnow()
        )
        self.db.add(db_item)
        self.db.commit()
        return db_item

    async def run_playground_prompt(self, prompt: str, model: str):
        # Mock LLM response (or use litellm if configured)
        import asyncio
        from litellm import completion
        import os
        
        start_time = datetime.utcnow()
        
        response_text = ""
        latency_ms = 0
        
        if os.getenv("OPENAI_API_KEY"):
            try:
                resp = completion(model=model, messages=[{"role": "user", "content": prompt}])
                response_text = resp.choices[0].message.content
                latency_ms = (datetime.utcnow() - start_time).total_seconds() * 1000
            except Exception as e:
                response_text = f"Error: {str(e)}"
        else:
            await asyncio.sleep(1) # Simulate latency
            response_text = f"Mock response to: {prompt}"
            latency_ms = 1000

        # Save to history
        run_id = str(uuid.uuid4())
        
        # Create Run
        run = Run(
            id=run_id, 
            agent_id="playground-user", 
            created_at=start_time,
            tags_json=json.dumps(["playground", model])
        )
        self.db.add(run)
        
        # Create Step (User)
        step_user = Step(
            id=str(uuid.uuid4()),
            run_id=run_id,
            agent_id="playground-user",
            timestamp=start_time,
            role="user",
            prompt_user=prompt,
            response=None
        )
        self.db.add(step_user)
        
        # Create Step (Assistant)
        step_assistant = Step(
            id=str(uuid.uuid4()),
            run_id=run_id,
            agent_id="playground-user",
            timestamp=datetime.utcnow(),
            role="assistant",
            prompt_user=None,
            response=response_text
        )
        self.db.add(step_assistant)
        
        self.db.commit()

        return {
            "response": response_text,
            "model": model,
            "latency_ms": latency_ms,
            "run_id": run_id
        }
