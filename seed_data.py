import asyncio
import uuid
import random
import json
import os
import sys
from datetime import datetime, timedelta

# Add src to path
sys.path.append(os.getcwd())

from src.db.database import SessionLocal, init_db
from src.db.models import Run, NodeExecution, Message, Evaluation

AGENTS = ["research-bot-v1", "coder-agent-alpha", "customer-support-bot"]
TOPICS = [
    "How do I reverse a linked list?",
    "Explain quantum computing",
    "Write a poem about rust",
    "Debug this React component",
    "What is the capital of France?"
]

def generate_uuid():
    return str(uuid.uuid4())

def seed_run(db, agent_id, topic):
    run_id = generate_uuid()
    start_time = datetime.utcnow() - timedelta(days=random.randint(0, 7))
    
    # 1. Create Run
    run = Run(
        id=run_id,
        agent_id=agent_id,
        graph_id="agent-graph",
        graph_version="v1",
        status="completed",
        started_at=start_time,
        ended_at=start_time + timedelta(seconds=10),
        total_tokens=500,
        total_cost=0.015,
        total_latency_ms=10000,
        tags=["seed", "test"],
        input_state={"messages": [{"role": "user", "content": topic}]},
        output_state={"messages": [{"role": "assistant", "content": "Done."}]}
    )
    db.add(run)

    # 2. Nodes & Messages
    # Node 1: User Input
    node1_id = generate_uuid()
    node1 = NodeExecution(
        id=node1_id,
        run_id=run_id,
        node_key="user_input",
        node_type="input",
        order=0,
        status="completed",
        started_at=start_time,
        ended_at=start_time + timedelta(milliseconds=100),
        latency_ms=100
    )
    db.add(node1)
    
    msg1 = Message(
        id=generate_uuid(),
        node_execution_id=node1_id,
        order=0,
        role="user",
        content=topic,
        input_tokens=10,
        total_tokens=10
    )
    db.add(msg1)

    # Node 2: Agent Thinking (Chain)
    node2_id = generate_uuid()
    node2 = NodeExecution(
        id=node2_id,
        run_id=run_id,
        node_key="agent_reasoning",
        node_type="chain",
        order=1,
        status="completed",
        started_at=start_time + timedelta(milliseconds=200),
        ended_at=start_time + timedelta(seconds=5),
        latency_ms=4800
    )
    db.add(node2)
    
    msg2 = Message(
        id=generate_uuid(),
        node_execution_id=node2_id,
        order=0,
        role="assistant",
        content="Thinking about the query...",
        total_tokens=50,
        model="gpt-4"
    )
    db.add(msg2)

    # Node 3: Tool Call (Search)
    if random.random() > 0.5:
        node3_id = generate_uuid()
        node3 = NodeExecution(
            id=node3_id,
            run_id=run_id,
            node_key="search_tool",
            node_type="tool",
            order=2,
            status="completed",
            started_at=start_time + timedelta(seconds=5),
            ended_at=start_time + timedelta(seconds=7),
            latency_ms=2000
        )
        db.add(node3)
        
        msg3 = Message(
            id=generate_uuid(),
            node_execution_id=node3_id,
            order=0,
            role="tool",
            content=json.dumps({"results": ["Result 1", "Result 2"]}),
            tool_calls=[{"name": "search", "args": {"query": topic}}],
            total_tokens=100
        )
        db.add(msg3)

    # 3. Evaluation (Score)
    if random.random() > 0.7:
        eval = Evaluation(
            id=generate_uuid(),
            run_id=run_id,
            evaluator="user",
            score=1.0,
            label="thumbs_up",
            comment="Great answer!"
        )
        db.add(eval)

    print(f"Seeded Run: {run_id} ({topic})")

if __name__ == "__main__":
    print("Initializing Database...")
    init_db()
    
    db = SessionLocal()
    try:
        print("Seeding Runs...")
        for i in range(10):
            agent = random.choice(AGENTS)
            topic = random.choice(TOPICS)
            seed_run(db, agent, topic)
        
        db.commit()
        print("Seeding Complete.")
    except Exception as e:
        print(f"Seeding Failed: {e}")
        db.rollback()
    finally:
        db.close()
