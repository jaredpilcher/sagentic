import uuid
from datetime import datetime
import json
from sqlalchemy.orm import Session
from ..db.database import EvaluationResultDB, DatasetItemDB, Run
from ..core.models import EvaluationResult
from litellm import completion
import os

class Evaluator:
    def __init__(self, db: Session):
        self.db = db

    def evaluate_run(self, run_id: str, dataset_id: str, model: str = "gpt-3.5-turbo"):
        """
        Evaluates a run against a dataset using LLM-as-a-judge.
        """
        # 1. Fetch run and dataset items
        # For simplicity, we assume the run has a 'response' in its last step or similar.
        # In a real app, we'd need to match specific steps to dataset items.
        # Here, we'll just take the last step's response as the "run output" for ALL items (simplified).
        
        from ..db.database import Step
        last_step = self.db.query(Step).filter(Step.run_id == run_id).order_by(Step.timestamp.desc()).first()
        run_output = last_step.response if last_step else "No response found"

        dataset_items = self.db.query(DatasetItemDB).filter(DatasetItemDB.dataset_id == dataset_id).all()
        
        results = []
        for item in dataset_items:
            # LLM-as-a-judge Logic
            prompt = f"""
            You are an expert evaluator.
            
            Input: {item.input}
            Expected Output: {item.expected_output}
            Actual Output: {run_output}
            
            Score the Actual Output on a scale of 0.0 to 1.0 based on how well it matches the Expected Output.
            Provide a brief explanation.
            
            Format: JSON
            {{
                "score": <float>,
                "comment": "<string>"
            }}
            """
            
            try:
                # Check if API key is set, otherwise mock
                if not os.getenv("OPENAI_API_KEY"):
                    score = 0.5
                    comment = "Mock evaluation (OPENAI_API_KEY not set)"
                else:
                    response = completion(
                        model=model,
                        messages=[{"role": "user", "content": prompt}],
                        response_format={"type": "json_object"}
                    )
                    content = json.loads(response.choices[0].message.content)
                    score = content.get("score", 0.0)
                    comment = content.get("comment", "No comment")

            except Exception as e:
                score = 0.0
                comment = f"Evaluation failed: {str(e)}"

            eval_result = EvaluationResultDB(
                id=str(uuid.uuid4()),
                dataset_item_id=item.id,
                run_id=run_id,
                score=score,
                comment=comment,
                created_at=datetime.utcnow()
            )
            self.db.add(eval_result)
            results.append(eval_result)
            
        self.db.commit()
        return results

    def get_evaluations(self, run_id: str):
        evals = self.db.query(EvaluationResultDB).filter(EvaluationResultDB.run_id == run_id).all()
        return [
            EvaluationResult(
                id=e.id,
                dataset_item_id=e.dataset_item_id,
                run_id=e.run_id,
                score=e.score,
                comment=e.comment,
                created_at=e.created_at
            )
            for e in evals
        ]
