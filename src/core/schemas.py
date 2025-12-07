from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum


class RunStatus(str, Enum):
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class NodeStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class MessageRole(str, Enum):
    SYSTEM = "system"
    USER = "user"
    ASSISTANT = "assistant"
    TOOL = "tool"


class MessageCreate(BaseModel):
    role: MessageRole
    content: Optional[str] = None
    model: Optional[str] = None
    provider: Optional[str] = None
    input_tokens: Optional[int] = None
    output_tokens: Optional[int] = None
    total_tokens: Optional[int] = None
    cost: Optional[float] = None
    latency_ms: Optional[int] = None
    tool_calls: Optional[List[Dict[str, Any]]] = None
    tool_results: Optional[List[Dict[str, Any]]] = None
    raw_request: Optional[Dict[str, Any]] = None
    raw_response: Optional[Dict[str, Any]] = None


class NodeExecutionCreate(BaseModel):
    node_key: str
    node_type: Optional[str] = None
    order: Optional[int] = None
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    state_in: Optional[Dict[str, Any]] = None
    state_out: Optional[Dict[str, Any]] = None
    messages: List[MessageCreate] = Field(default_factory=list)
    error: Optional[str] = None


class EdgeCreate(BaseModel):
    from_node: str
    to_node: str
    condition_label: Optional[str] = None


class RunCreate(BaseModel):
    graph_id: Optional[str] = None
    graph_version: Optional[str] = None
    framework: str = "langgraph"
    agent_id: Optional[str] = None
    input_state: Optional[Dict[str, Any]] = None
    tags: Optional[List[str]] = None
    run_metadata: Optional[Dict[str, Any]] = None


class TraceIngest(BaseModel):
    """Complete trace ingestion for a LangGraph workflow execution."""
    run_id: Optional[str] = None
    graph_id: Optional[str] = None
    graph_version: Optional[str] = None
    framework: str = "langgraph"
    agent_id: Optional[str] = None
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    input_state: Optional[Dict[str, Any]] = None
    output_state: Optional[Dict[str, Any]] = None
    nodes: List[NodeExecutionCreate]
    edges: List[EdgeCreate] = Field(default_factory=list)
    status: RunStatus = RunStatus.COMPLETED
    error: Optional[str] = None
    tags: Optional[List[str]] = None
    run_metadata: Optional[Dict[str, Any]] = None


class MessageResponse(BaseModel):
    id: str
    order: int
    role: str
    content: Optional[str]
    model: Optional[str]
    provider: Optional[str]
    input_tokens: Optional[int]
    output_tokens: Optional[int]
    total_tokens: Optional[int]
    cost: Optional[float]
    latency_ms: Optional[int]
    tool_calls: Optional[List[Dict[str, Any]]]
    tool_results: Optional[List[Dict[str, Any]]]

    class Config:
        from_attributes = True


class NodeExecutionResponse(BaseModel):
    id: str
    node_key: str
    node_type: Optional[str]
    order: int
    status: str
    started_at: Optional[datetime]
    ended_at: Optional[datetime]
    latency_ms: Optional[int]
    state_in: Optional[Dict[str, Any]]
    state_out: Optional[Dict[str, Any]]
    state_diff: Optional[Dict[str, Any]]
    error: Optional[str]
    messages: List[MessageResponse] = []

    class Config:
        from_attributes = True


class EdgeResponse(BaseModel):
    id: str
    from_node: str
    to_node: str
    condition_label: Optional[str]
    order: int

    class Config:
        from_attributes = True


class RunSummary(BaseModel):
    id: str
    graph_id: Optional[str]
    framework: str
    agent_id: Optional[str]
    status: str
    started_at: datetime
    ended_at: Optional[datetime]
    total_tokens: int
    total_cost: float
    total_latency_ms: int
    node_count: int
    tags: Optional[List[str]]
    error: Optional[str]
    input_state: Optional[Dict[str, Any]] = None
    output_state: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True


class RunDetailResponse(BaseModel):
    id: str
    graph_id: Optional[str]
    graph_version: Optional[str]
    framework: str
    agent_id: Optional[str]
    status: str
    started_at: datetime
    ended_at: Optional[datetime]
    input_state: Optional[Dict[str, Any]]
    output_state: Optional[Dict[str, Any]]
    total_tokens: int
    total_cost: float
    total_latency_ms: int
    error: Optional[str]
    tags: Optional[List[str]]
    run_metadata: Optional[Dict[str, Any]]
    nodes: List[NodeExecutionResponse]
    edges: List[EdgeResponse]

    class Config:
        from_attributes = True


class RunGraphResponse(BaseModel):
    """Graph structure for visualization."""
    run_id: str
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]


class EvaluationCreate(BaseModel):
    run_id: str
    node_execution_id: Optional[str] = None
    evaluator: Optional[str] = None
    score: Optional[float] = None
    label: Optional[str] = None
    comment: Optional[str] = None
    is_automated: bool = False


class EvaluationResponse(BaseModel):
    id: str
    run_id: str
    node_execution_id: Optional[str]
    evaluator: Optional[str]
    score: Optional[float]
    label: Optional[str]
    comment: Optional[str]
    is_automated: bool
    created_at: datetime

    class Config:
        from_attributes = True


class IngestResponse(BaseModel):
    status: str
    run_id: str
    node_count: int
    edge_count: int



