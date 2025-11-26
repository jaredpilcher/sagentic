
from typing import Dict, Any
from ..core.models import AgentStep, AnalysisResult
from ..core.analysis import AnalysisEngine

PRICING = {
    "gpt-4": {"input": 0.03, "output": 0.06},
    "gpt-4-turbo": {"input": 0.01, "output": 0.03},
    "gpt-3.5-turbo": {"input": 0.0005, "output": 0.0015},
    "claude-3-opus": {"input": 0.015, "output": 0.075},
    "claude-3-sonnet": {"input": 0.003, "output": 0.015},
    "claude-3-haiku": {"input": 0.00025, "output": 0.00125},
}

class CostEngine(AnalysisEngine):
    @property
    def id(self) -> str:
        return "cost_engine"

    def describe(self) -> Dict[str, str]:
        return {
            "name": "Cost Analysis Engine",
            "description": "Estimates cost based on model name and token usage",
            "version": "1.0.0",
        }

    async def analyze_step(self, step: AgentStep) -> AnalysisResult:
        model = step.metadata.get("model", "").lower()
        # Fallback if model not found exactly
        pricing = None
        for key in PRICING:
            if key in model:
                pricing = PRICING[key]
                break
        
        if not pricing:
            return AnalysisResult(
                engine_id=self.id,
                metrics={"cost_usd": 0.0, "known_model": False},
                summary="Model not found in pricing table"
            )

        # Estimate tokens if not provided (rough heuristic: 4 chars = 1 token)
        prompt_tokens = step.metadata.get("prompt_tokens")
        if not prompt_tokens:
            prompt_tokens = len(step.prompt.user or "") / 4
        
        completion_tokens = step.metadata.get("completion_tokens")
        if not completion_tokens:
            completion_tokens = len(step.response or "") / 4

        input_cost = (prompt_tokens / 1000) * pricing["input"]
        output_cost = (completion_tokens / 1000) * pricing["output"]
        total_cost = input_cost + output_cost

        return AnalysisResult(
            engine_id=self.id,
            metrics={
                "cost_usd": round(total_cost, 6),
                "prompt_tokens": int(prompt_tokens),
                "completion_tokens": int(completion_tokens),
                "known_model": True
            },
            summary=f"Est. Cost: ${total_cost:.6f}"
        )
