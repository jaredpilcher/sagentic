
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List
from .models import AgentStep, AnalysisResult

class AnalysisEngine(ABC):
    @property
    @abstractmethod
    def id(self) -> str:
        pass

    @abstractmethod
    def describe(self) -> Dict[str, str]:
        pass

    @abstractmethod
    async def analyze_step(self, step: AgentStep) -> AnalysisResult:
        pass

class AnalysisRegistry:
    def __init__(self):
        self._engines: Dict[str, AnalysisEngine] = {}

    def register(self, engine: AnalysisEngine):
        self._engines[engine.id] = engine

    def get_engine(self, engine_id: str) -> Optional[AnalysisEngine]:
        return self._engines.get(engine_id)

    def get_all_engines(self) -> List[AnalysisEngine]:
        return list(self._engines.values())

registry = AnalysisRegistry()
