
import asyncio
import uuid
import random
from datetime import datetime, timedelta
from src.core.models import AgentStep, Prompt, ToolTrace
from src.db.database import SessionLocal, init_db
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

if __name__ == "__main__":
    asyncio.run(seed())
