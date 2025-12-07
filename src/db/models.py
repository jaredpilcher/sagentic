from sqlalchemy import Column, String, DateTime, Text, ForeignKey, Float, Integer, Boolean, Index
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import declarative_base, relationship
from datetime import datetime
import uuid

Base = declarative_base()

def generate_uuid():
    return str(uuid.uuid4())


class Run(Base):
    """A complete workflow execution from start to finish."""
    __tablename__ = 'runs'
    
    id = Column(String, primary_key=True, default=generate_uuid)
    graph_id = Column(String, nullable=True, index=True)
    graph_version = Column(String, nullable=True)
    framework = Column(String, default="langgraph", index=True)
    agent_id = Column(String, nullable=True, index=True)
    
    status = Column(String, default="running", index=True)
    started_at = Column(DateTime, default=datetime.utcnow, index=True)
    ended_at = Column(DateTime, nullable=True)
    
    input_state = Column(JSONB, nullable=True)
    output_state = Column(JSONB, nullable=True)
    
    total_tokens = Column(Integer, default=0)
    total_cost = Column(Float, default=0.0)
    total_latency_ms = Column(Integer, default=0)
    
    error = Column(Text, nullable=True)
    run_metadata = Column(JSONB, nullable=True)
    tags = Column(JSONB, nullable=True)
    
    node_executions = relationship("NodeExecution", back_populates="run", order_by="NodeExecution.order")
    edges = relationship("Edge", back_populates="run")
    evaluations = relationship("Evaluation", back_populates="run")
    
    __table_args__ = (
        Index('ix_runs_started_at_desc', started_at.desc()),
    )


class NodeExecution(Base):
    """A single node execution within a workflow run."""
    __tablename__ = 'node_executions'
    
    id = Column(String, primary_key=True, default=generate_uuid)
    run_id = Column(String, ForeignKey('runs.id'), nullable=False, index=True)
    
    node_key = Column(String, nullable=False, index=True)
    node_type = Column(String, nullable=True)
    order = Column(Integer, nullable=False, index=True)
    
    status = Column(String, default="pending")
    started_at = Column(DateTime, nullable=True)
    ended_at = Column(DateTime, nullable=True)
    latency_ms = Column(Integer, nullable=True)
    
    state_in = Column(JSONB, nullable=True)
    state_out = Column(JSONB, nullable=True)
    state_diff = Column(JSONB, nullable=True)
    
    error = Column(Text, nullable=True)
    extra_data = Column(JSONB, nullable=True)
    
    upstream_node_ids = Column(JSONB, nullable=True)
    
    run = relationship("Run", back_populates="node_executions")
    messages = relationship("Message", back_populates="node_execution", order_by="Message.order")
    
    __table_args__ = (
        Index('ix_node_exec_run_order', 'run_id', 'order'),
    )


class Message(Base):
    """An LLM message within a node execution."""
    __tablename__ = 'messages'
    
    id = Column(String, primary_key=True, default=generate_uuid)
    node_execution_id = Column(String, ForeignKey('node_executions.id'), nullable=False, index=True)
    
    order = Column(Integer, nullable=False)
    role = Column(String, nullable=False)
    content = Column(Text, nullable=True)
    
    model = Column(String, nullable=True)
    provider = Column(String, nullable=True)
    
    input_tokens = Column(Integer, nullable=True)
    output_tokens = Column(Integer, nullable=True)
    total_tokens = Column(Integer, nullable=True)
    cost = Column(Float, nullable=True)
    latency_ms = Column(Integer, nullable=True)
    
    tool_calls = Column(JSONB, nullable=True)
    tool_results = Column(JSONB, nullable=True)
    
    raw_request = Column(JSONB, nullable=True)
    raw_response = Column(JSONB, nullable=True)
    
    extra_data = Column(JSONB, nullable=True)
    
    node_execution = relationship("NodeExecution", back_populates="messages")


class Edge(Base):
    """A transition between nodes in the workflow graph."""
    __tablename__ = 'edges'
    
    id = Column(String, primary_key=True, default=generate_uuid)
    run_id = Column(String, ForeignKey('runs.id'), nullable=False, index=True)
    
    from_node = Column(String, nullable=False)
    to_node = Column(String, nullable=False)
    
    condition_label = Column(String, nullable=True)
    order = Column(Integer, nullable=False)
    
    extra_data = Column(JSONB, nullable=True)
    
    run = relationship("Run", back_populates="edges")
    
    __table_args__ = (
        Index('ix_edges_run_order', 'run_id', 'order'),
    )


class Evaluation(Base):
    """User feedback or automated evaluation on a run or node."""
    __tablename__ = 'evaluations'
    
    id = Column(String, primary_key=True, default=generate_uuid)
    run_id = Column(String, ForeignKey('runs.id'), nullable=False, index=True)
    node_execution_id = Column(String, ForeignKey('node_executions.id'), nullable=True, index=True)
    
    evaluator = Column(String, nullable=True)
    score = Column(Float, nullable=True)
    label = Column(String, nullable=True)
    comment = Column(Text, nullable=True)
    
    is_automated = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    extra_data = Column(JSONB, nullable=True)
    
    run = relationship("Run", back_populates="evaluations")


class Extension(Base):
    """Installed extension/plugin for the platform."""
    __tablename__ = 'extensions'
    
    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False, unique=True, index=True)
    version = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    
    status = Column(String, default="enabled", index=True)
    
    manifest = Column(JSONB, nullable=False)
    
    install_path = Column(String, nullable=False)
    
    has_backend = Column(Boolean, default=False)
    has_frontend = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    extra_data = Column(JSONB, nullable=True)
    
    data_entries = relationship("ExtensionData", back_populates="extension", cascade="all, delete-orphan")


class ExtensionData(Base):
    """Persistent key-value storage for extensions.
    
    Each extension can store its own data using namespaced keys.
    Data is isolated per extension for security.
    """
    __tablename__ = 'extension_data'
    
    id = Column(String, primary_key=True, default=generate_uuid)
    extension_id = Column(String, ForeignKey('extensions.id', ondelete='CASCADE'), nullable=False, index=True)
    
    key = Column(String, nullable=False, index=True)
    value = Column(JSONB, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    extension = relationship("Extension", back_populates="data_entries")
    
    __table_args__ = (
        Index('ix_extension_data_ext_key', 'extension_id', 'key', unique=True),
    )


class ExtensionNetworkAudit(Base):
    """Audit log for extension network requests.
    
    Records all HTTP requests made by extensions through the proxy,
    including requests that were blocked due to URL whitelist violations.
    """
    __tablename__ = 'extension_network_audit'
    
    id = Column(String, primary_key=True, default=generate_uuid)
    extension_id = Column(String, ForeignKey('extensions.id', ondelete='CASCADE'), nullable=False, index=True)
    extension_name = Column(String, nullable=False, index=True)
    
    target_url = Column(String, nullable=False)
    method = Column(String, nullable=False)
    
    request_headers = Column(JSONB, nullable=True)
    request_body_hash = Column(String, nullable=True)
    request_body_size = Column(Integer, nullable=True)
    
    response_status = Column(Integer, nullable=True)
    response_time_ms = Column(Integer, nullable=True)
    response_headers = Column(JSONB, nullable=True)
    response_body_excerpt = Column(Text, nullable=True)
    response_body_size = Column(Integer, nullable=True)
    
    allowed = Column(Boolean, nullable=False, default=True)
    blocked_reason = Column(String, nullable=True)
    error = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    __table_args__ = (
        Index('ix_network_audit_ext_created', 'extension_id', 'created_at'),
    )
