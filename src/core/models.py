
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

from enum import Enum

class SpanKind(str, Enum):
    AGENT = "AGENT"
    LLM = "LLM"
    TOOL = "TOOL"
    CHAIN = "CHAIN"

class SpanStatus(str, Enum):
    OK = "OK"
    ERROR = "ERROR"

class Span(BaseModel):
    span_id: str
    trace_id: str
    parent_id: Optional[str] = None
    name: str
    start_time: datetime
    end_time: Optional[datetime] = None
    span_kind: SpanKind = SpanKind.CHAIN
    attributes: Dict[str, Any] = Field(default_factory=dict)
    input: Optional[Dict[str, Any]] = None
    output: Optional[Dict[str, Any]] = None
    status_code: SpanStatus = SpanStatus.OK
    events: List[Dict[str, Any]] = Field(default_factory=list)

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

class SpanIngestResponse(BaseModel):
    status: str
    span_id: str
    trace_id: str

