
from fastapi.testclient import TestClient
from src.api.server import app
from src.db.database import Base, engine, SessionLocal
import pytest
from datetime import datetime

# Setup test DB
Base.metadata.create_all(bind=engine)

client = TestClient(app)

def test_ingest_step():
    step_data = {
        "run_id": "test-run-py-1",
        "step_id": "step-py-1",
        "agent_id": "agent-py",
        "timestamp": datetime.utcnow().isoformat(),
        "role": "assistant",
        "prompt": {
            "user": "Hello Python",
            "system": "You are a snake"
        },
        "response": "Hiss hiss",
        "metadata": {"env": "test"}
    }
    
    response = client.post("/api/steps", json=step_data)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "logged"
    assert data["step_id"] == "step-py-1"
    assert len(data["analyses"]) > 0
    assert data["analyses"][0]["engine_id"] == "basic_stats"
    assert data["analyses"][0]["metrics"]["prompt_word_count"] == 2

def test_list_runs():
    response = client.get("/api/runs")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_get_step():
    # Depends on previous test running first or DB state. 
    # For robust tests we should clear DB, but for this simple check it's okay.
    response = client.get("/api/steps/step-py-1")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == "step-py-1"
    assert data["prompt"]["user"] == "Hello Python"
