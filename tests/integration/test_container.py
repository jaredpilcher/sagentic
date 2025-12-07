
import pytest
import requests
import time
import os

# Base URL for the containerized API
BASE_URL = os.environ.get("BASE_URL", "http://localhost:3000/api")

@pytest.fixture(scope="module")
def api_client():
    """Wait for API to be ready then return base URL."""
    retries = 10
    for i in range(retries):
        try:
            resp = requests.get(f"{BASE_URL.replace('/api', '')}/health", timeout=2) # Assuming root health or api health?
            # Actually standard is usually /docs or /openapi.json or a specific health endpoint.
            # Let's try /api/runs as a liveness check if health doesn't exist.
            # But wait, looking at server.py:
            # It has NO /health endpoint. It has / on root.
            # Let's check root.
            resp = requests.get(f"{BASE_URL.replace('/api', '')}/", timeout=2)
            if resp.status_code == 200:
                break
        except requests.exceptions.ConnectionError:
            pass
        time.sleep(1)
    else:
        pytest.fail("Could not connect to API container")
    
    return requests.Session()

def test_health_check():
    """Verify backend is up."""
    resp = requests.get(f"{BASE_URL.replace('/api', '')}/")
    assert resp.status_code == 200
    assert "Sagentic Backend" in resp.json()["message"]

def test_list_runs(api_client):
    """Verify seeded runs exist."""
    resp = api_client.get(f"{BASE_URL}/runs")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    # We expect some seeded data
    assert len(data) > 0

def test_ingest_trace(api_client):
    """Verify we can ingest a trace."""
    trace_data = {
        "run_id": "integration-test-run-1",
        "graph_id": "test-graph",
        "nodes": [
            {
                "node_key": "node-1",
                "order": 0,
                "status": "completed",
                "messages": [
                    {"role": "user", "content": "Hello Integration Test"}
                ]
            }
        ]
    }
    
    resp = api_client.post(f"{BASE_URL}/traces", json=trace_data)
    assert resp.status_code == 200
    
    # Verify it exists
    resp = api_client.get(f"{BASE_URL}/runs/integration-test-run-1")
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == "integration-test-run-1"
    assert len(data["nodes"]) == 1

def test_extensions_list(api_client):
    """Verify extensions can be listed."""
    resp = api_client.get(f"{BASE_URL}/extensions")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, dict)
    assert "extensions" in data
    assert isinstance(data["extensions"], list)
