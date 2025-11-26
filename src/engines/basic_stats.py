
from typing import Dict
from ..core.models import AgentStep, AnalysisResult
from ..core.analysis import AnalysisEngine

class BasicStatsEngine(AnalysisEngine):
    @property
    def id(self) -> str:
        return "basic_stats"

    def describe(self) -> Dict[str, str]:
        return {
            "name": "Basic Stats Engine",
            "description": "Calculates basic token/word counts and length metrics",
            "version": "1.0.0",
        }

    async def analyze_step(self, step: AgentStep) -> AnalysisResult:
        prompt_user = step.prompt.user or ""
        response = step.response or ""

        prompt_words = len([w for w in prompt_user.split() if w])
        response_words = len([w for w in response.split() if w])

        metrics = {
            "prompt_length_chars": len(prompt_user),
            "response_length_chars": len(response),
            "prompt_word_count": prompt_words,
            "response_word_count": response_words,
        }

        summary = f"Prompt: {prompt_words} words. Response: {response_words} words."

        return AnalysisResult(
            engine_id=self.id,
            metrics=metrics,
            summary=summary
        )
