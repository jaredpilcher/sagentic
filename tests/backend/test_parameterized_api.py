import pytest
from fastapi.testclient import TestClient
from src.api.server import app

client = TestClient(app)

# Data Provider: Universal API Test Cases
api_test_cases = [
    # 1. System Health
    {
        "name": "Root Endpoint",
        "method": "GET",
        "url": "/",
        "payload": None,
        "expected_status": 200,
        "check_fn": lambda r: "message" in r.json()
    },
    # 2. Runs API
    {
        "name": "List Runs (Empty)",
        "method": "GET",
        "url": "/api/runs",
        "payload": None,
        "expected_status": 200,
        "check_fn": lambda r: isinstance(r.json(), list)
    },
    {
        "name": "Get Non-Existent Run",
        "method": "GET",
        "url": "/api/runs/bad-id",
        "payload": None,
        "expected_status": 404,
        "check_fn": None
    },
    # 3. Extensions API
    {
        "name": "List Extensions",
        "method": "GET",
        "url": "/api/extensions",
        "payload": None,
        "expected_status": 200,
        "check_fn": lambda r: "extensions" in r.json()
    },
    {
        "name": "Frontend Manifest",
        "method": "GET",
        "url": "/api/extensions/frontend-manifest",
        "payload": None,
        "expected_status": 200,
        "check_fn": lambda r: "extensions" in r.json()
    },
    # 4. Traces API (Ingest)
    {
        "name": "Ingest Trace (Minimal)",
        "method": "POST",
        "url": "/api/traces",
        "payload": {
            "run_id": "test-run-1",
            "graph_id": "test-graph",
            "graph_version": 1,
            "status": "completed",
            "nodes": [],
            "edges": []
        },
        "expected_status": 200,
        "check_fn": lambda r: r.json()["status"] == "ingested"
    },
    {
        "name": "Ingest Invalid Trace",
        "method": "POST",
        "url": "/api/traces",
        "payload": {"bad": "data"},
        "expected_status": 422, # Validation Error
        "check_fn": None
    },
    # 5. Gap Analysis Cases
    {
        "name": "Ingest Trace (Upsert)",
        "method": "POST",
        "url": "/api/traces",
        "payload": {
            "run_id": "test-run-1", # Same ID as minimal test
            "graph_id": "test-graph",
            "graph_version": 2, # Changed version
            "status": "completed",
            "nodes": [],
            "edges": []
        },
        "expected_status": 200,
        "check_fn": lambda r: r.json()["status"] == "ingested"
    },
    {
        "name": "Get Run Details",
        "method": "GET",
        "url": "/api/runs/test-run-1",
        "payload": None,
        "expected_status": 200,
        "check_fn": lambda r: r.json()["graph_version"] == 2 # Verify upsert worked
    },
    {
        "name": "Run Filtering (Match)",
        "method": "GET",
        "url": "/api/runs?graph_id=test-graph",
        "payload": None,
        "expected_status": 200,
        "check_fn": lambda r: len(r.json()) >= 1
    },
    {
        "name": "Run Filtering (No Match)",
        "method": "GET",
        "url": "/api/runs?graph_id=non-existent-graph",
        "payload": None,
        "expected_status": 200,
        "check_fn": lambda r: len(r.json()) == 0
    },
    {
        "name": "Extension Status Toggle (On non-existent)",
        "method": "POST",
        "url": "/api/extensions/fake-ext/status",
        "payload": {"enabled": True},
        "expected_status": 404, # Should fail gracefully
        "check_fn": None
    }
]

@pytest.mark.parametrize("case", api_test_cases, ids=lambda c: c["name"])
def test_universal_api(case):
    """
    Universal parameterized test for API endpoints.
    Covers Happy Paths, Error States, and Schema Validation.
    """
    method = case["method"]
    url = case["url"]
    payload = case["payload"]
    
    if method == "GET":
        response = client.get(url)
    elif method == "POST":
        response = client.post(url, json=payload)
    elif method == "DELETE":
        response = client.delete(url)
    else:
        pytest.fail(f"Unsupported method: {method}")
        
    assert response.status_code == case["expected_status"], f"Failed {case['name']}: {response.text}"
    
    if case["check_fn"]:
        try:
            assert case["check_fn"](response)
        except Exception as e:
            pytest.fail(f"Check function failed for {case['name']}: {e}")

