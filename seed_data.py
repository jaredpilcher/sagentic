import asyncio
import uuid
import random
from datetime import datetime, timedelta
import requests
from src.core.models import AgentStep, Prompt, ToolTrace
from src.db.database import SessionLocal, init_db, Run, Step
from src.core.service import TelemetryService

# Initialize DB
init_db()

AGENTS = ["research-bot-v1", "coder-agent-alpha", "customer-support-bot"]
ROLES = ["user", "assistant"]
TOPICS = [
    "How do I reverse a linked list?",
    "Explain quantum computing",
    "Write a poem about rust",
    "Debug this React component",
    "What is the capital of France?"
]

async def seed():
    db = SessionLocal()
    service = TelemetryService(db)
    
    print("Seeding data...")
    
    for i in range(10): # 10 Runs
        run_id = str(uuid.uuid4())
        agent_id = random.choice(AGENTS)
        start_time = datetime.utcnow() - timedelta(days=random.randint(0, 7))
        topic = random.choice(TOPICS)
        
        print(f"Creating run {run_id} for {agent_id} on '{topic}'")
        
        # 1. User Step
        step1_id = str(uuid.uuid4())
        step1 = AgentStep(
            run_id=run_id,
            step_id=step1_id,
            agent_id=agent_id,
            timestamp=start_time,
            role="user",
            prompt=Prompt(user=topic),
            response=None,
            metadata={"session_id": "session_123"}
        )
        await service.ingest_step(step1)
        
        # 2. Assistant Step (Thinking/Tool use)
        step2_id = str(uuid.uuid4())
        step2 = AgentStep(
            run_id=run_id,
            step_id=step2_id,
            agent_id=agent_id,
            timestamp=start_time + timedelta(seconds=2),
            role="assistant",
            prompt=Prompt(
                system="You are a helpful assistant.",
                assistant_context="User asked about " + topic,
                tools_trace=[
                    ToolTrace(name="search_web", args={"query": topic}, result_summary="Found 5 results")
                ]
            ),
            response="I found some information. Let me summarize it.",
            metadata={"model": "gpt-4-turbo", "tokens": 150}
        )
        await service.ingest_step(step2)
        
        # 3. Assistant Final Response
        step3_id = str(uuid.uuid4())
        step3 = AgentStep(
            run_id=run_id,
            step_id=step3_id,
            agent_id=agent_id,
            timestamp=start_time + timedelta(seconds=5),
            role="assistant",
            prompt=Prompt(
                system="You are a helpful assistant.",
                assistant_context="Summarizing search results",
            ),
            response=f"Here is the answer to '{topic}': It is complex but fascinating...",
            metadata={"model": "gpt-4-turbo", "tokens": 300}
        )
        await service.ingest_step(step3)

    print("Seeding complete!")
    db.close()

def seed_spans(run_id: str):
    # import uuid # Already imported at top
    # from datetime import datetime, timedelta # Already imported at top
    # import requests # Already imported at top

    base_time = datetime.utcnow()
    trace_id = run_id
    
    # Root Span (Agent)
    root_span_id = str(uuid.uuid4())
    root_start = base_time
    root_end = base_time + timedelta(seconds=5)
    
    requests.post("http://localhost:3000/api/spans", json={
        "span_id": root_span_id,
        "trace_id": trace_id,
        "parent_id": None,
        "name": "Research Agent Execution",
        "start_time": root_start.isoformat(),
        "end_time": root_end.isoformat(),
        "span_kind": "AGENT",
        "attributes": {"agent_version": "1.0.0"},
        "status_code": "OK"
    })

    # Child Span 1 (Chain)
    chain_span_id = str(uuid.uuid4())
    chain_start = root_start + timedelta(milliseconds=100)
    chain_end = chain_start + timedelta(seconds=2)
    
    requests.post("http://localhost:3000/api/spans", json={
        "span_id": chain_span_id,
        "trace_id": trace_id,
        "parent_id": root_span_id,
        "name": "Thought Process",
        "start_time": chain_start.isoformat(),
        "end_time": chain_end.isoformat(),
        "span_kind": "CHAIN",
        "attributes": {"step": "planning"},
        "status_code": "OK"
    })

    # Child Span 2 (LLM Call) inside Chain
    llm_span_id = str(uuid.uuid4())
    llm_start = chain_start + timedelta(milliseconds=200)
    llm_end = llm_start + timedelta(seconds=1.5)
    
    requests.post("http://localhost:3000/api/spans", json={
        "span_id": llm_span_id,
        "trace_id": trace_id,
        "parent_id": chain_span_id,
        "name": "GPT-4 Completion",
        "start_time": llm_start.isoformat(),
        "end_time": llm_end.isoformat(),
        "span_kind": "LLM",
        "attributes": {"model": "gpt-4", "temperature": 0.7},
        "status_code": "OK"
    })

    # Child Span 3 (Tool Call)
    tool_span_id = str(uuid.uuid4())
    tool_start = root_start + timedelta(seconds=3)
    tool_end = tool_start + timedelta(seconds=1)
    
    requests.post("http://localhost:3000/api/spans", json={
        "span_id": tool_span_id,
        "trace_id": trace_id,
        "parent_id": root_span_id,
        "name": "Search Tool",
        "start_time": tool_start.isoformat(),
        "end_time": tool_end.isoformat(),
        "span_kind": "TOOL",
        "attributes": {"query": "latest AI news"},
        "status_code": "OK"
    })

    print(f"Seeded spans for run {run_id}")

if __name__ == "__main__":
    # Create a new run for traces
    run_id = str(uuid.uuid4())
    requests.post("http://localhost:3000/api/steps", json={
        "run_id": run_id,
        "step_id": str(uuid.uuid4()),
        "agent_id": "trace-demo-bot",
        "timestamp": datetime.utcnow().isoformat(),
        "role": "system",
        "prompt": {"system": "You are a trace demo bot."},
        "metadata": {}
    })
    
    seed_spans(run_id)
    asyncio.run(seed())
