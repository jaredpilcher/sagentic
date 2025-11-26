from sqlalchemy import create_engine, Column, String, DateTime, Text, ForeignKey, Float
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
from datetime import datetime
import json

Base = declarative_base()

class Run(Base):
    __tablename__ = 'runs'
    
    id = Column(String, primary_key=True)
    agent_id = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    tags_json = Column(Text, nullable=True)
    
    steps = relationship("Step", back_populates="run")
    spans = relationship("SpanDB", back_populates="run")
    scores = relationship("ScoreDB", back_populates="run")

class Step(Base):
    __tablename__ = 'steps'
    
    id = Column(String, primary_key=True)
    run_id = Column(String, ForeignKey('runs.id'), nullable=False)
    agent_id = Column(String, nullable=False)
    timestamp = Column(DateTime, nullable=False)
    role = Column(String, nullable=False)
    prompt_system = Column(Text, nullable=True)
    prompt_user = Column(Text, nullable=True)
    prompt_assistant_context = Column(Text, nullable=True)
    prompt_tools_trace = Column(Text, nullable=True) # JSON string
    response = Column(Text, nullable=True)
    metadata_json = Column(Text, nullable=True) # JSON string
    
    run = relationship("Run", back_populates="steps")
    analyses = relationship("AnalysisResultDB", back_populates="step")

class AnalysisResultDB(Base):
    __tablename__ = 'analysis_results'
    
    id = Column(String, primary_key=True) # UUID
    step_id = Column(String, ForeignKey('steps.id'), nullable=False)
    engine_id = Column(String, nullable=False)
    metrics = Column(Text, nullable=False) # JSON string
    summary = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    step = relationship("Step", back_populates="analyses")

class SpanDB(Base):
    __tablename__ = 'spans'

    span_id = Column(String, primary_key=True)
    trace_id = Column(String, ForeignKey('runs.id'), nullable=False)
    parent_id = Column(String, nullable=True)
    name = Column(String, nullable=False)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=True)
    span_kind = Column(String, nullable=False)
    attributes_json = Column(Text, nullable=True)
    input_json = Column(Text, nullable=True)
    output_json = Column(Text, nullable=True)
    status_code = Column(String, default="OK")
    events_json = Column(Text, nullable=True)

    run = relationship("Run", back_populates="spans")

class ScoreDB(Base):
    __tablename__ = 'scores'

    score_id = Column(String, primary_key=True)
    trace_id = Column(String, ForeignKey('runs.id'), nullable=False)
    span_id = Column(String, nullable=True)
    name = Column(String, nullable=False)
    value = Column(Float, nullable=False)
    comment = Column(Text, nullable=True)
    timestamp = Column(DateTime, nullable=False)

    run = relationship("Run", back_populates="scores")

# Database setup
DATABASE_URL = "sqlite:///./telemetry.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
