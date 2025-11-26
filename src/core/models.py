
from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel, Field
from datetime import datetime

class ToolTrace(BaseModel):
    name: str
    args: Dict[str, Any] = Field(default_factory=dict)
    result_summary: str

class Prompt(BaseModel):
    system: Optional[str] = None
    user: Optional[str] = None
    assistant_context: Optional[str] = None
    tools_trace: List[ToolTrace] = Field(default_factory=list)

class AgentStep(BaseModel):
    run_id: str
    step_id: str
    agent_id: str
    timestamp: datetime
    role: str  # "user" | "assistant" | "system"
    prompt: Prompt
    response: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)

class AnalysisResult(BaseModel):
    engine_id: str
    metrics: Dict[str, Union[int, float, str, bool]]
    summary: Optional[str] = None

class IngestResponse(BaseModel):
    status: str
    step_id: str
    analyses: List[AnalysisResult]
