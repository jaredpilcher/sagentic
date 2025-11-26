
from typing import List, Optional, Dict, Any, Union, Union
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
    usage: Optional[Dict[str, int]] = None # prompt_tokens, completion_tokens, total_tokens
    cost: Optional[float] = None

class Score(BaseModel):
    score_id: str
    trace_id: str
    span_id: Optional[str] = None
    name: str
    value: float
    comment: Optional[str] = None
    timestamp: datetime

class AgentStep(BaseModel):
    run_id: str
    step_id: str
    agent_id: str
    timestamp: datetime
    role: str  # "user" | "assistant" | "system"
    prompt: Prompt
    response: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
    tags: List[str] = Field(default_factory=list)

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

class ScoreIngestResponse(BaseModel):
    status: str
    score_id: str

class PromptTemplate(BaseModel):
    id: str
    name: str
    version: int
    template: str
    input_variables: List[str] = Field(default_factory=list)
    label: Optional[str] = None # e.g. "production", "staging"
    created_at: datetime

class DatasetItem(BaseModel):
    id: str
    dataset_id: str
    input: str
    expected_output: Optional[str] = None
    created_at: datetime

class Dataset(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    created_at: datetime
    items: List[DatasetItem] = []


class EvaluationResult(BaseModel):
    id: str
    dataset_item_id: str
    run_id: str
    score: float
    comment: Optional[str] = None
    created_at: datetime

class Comparison(BaseModel):
    id: str
    base_run_id: str
    candidate_run_id: str
    metrics: Dict[str, Any]
    created_at: datetime

class Feedback(BaseModel):
    id: str
    run_id: str
    value: float # 1.0 for thumbs up, 0.0 for thumbs down (or -1.0)
    comment: Optional[str] = None
    created_at: datetime
