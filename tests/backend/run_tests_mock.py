import sys
import json
import logging
from typing import List, Dict, Any, Callable

try:
    # Patch JSONB for SQLite compatibility
    import sqlalchemy.dialects.postgresql
    from sqlalchemy.types import JSON
    sqlalchemy.dialects.postgresql.JSONB = JSON

    from fastapi.testclient import TestClient
    from src.api.server import app
    from src.extensions.manager import ExtensionManager
    from src.core.globals import set_extension_manager
    
    # Manually init manager for tests since lifespan might not trigger or we want explicit control
    set_extension_manager(ExtensionManager(app))

except ImportError as e:
    print(f"Failed to import app: {e}")
    sys.exit(1)

client = TestClient(app)

def check_fn_root(r): return "message" in r.json()
def check_fn_list_runs(r): return isinstance(r.json(), list)
def check_fn_extensions(r): return "extensions" in r.json()
def check_fn_manifest(r): return isinstance(r.json(), dict)
def check_fn_ingest(r): return r.json().get("status") == "ingested"
def check_fn_upsert_verify(r): return r.json().get("graph_version") == "2"
def check_fn_filter_match(r): return len(r.json()) >= 1
def check_fn_filter_nomatch(r): return len(r.json()) == 0

api_test_cases = [
    { "name": "Root Endpoint", "method": "GET", "url": "/", "payload": None, "expected_status": 200, "check_fn": check_fn_root },
    { "name": "List Runs (Empty)", "method": "GET", "url": "/api/runs", "payload": None, "expected_status": 200, "check_fn": check_fn_list_runs },
    { "name": "Get Non-Existent Run", "method": "GET", "url": "/api/runs/bad-id", "payload": None, "expected_status": 404, "check_fn": None },
    { "name": "List Extensions", "method": "GET", "url": "/api/extensions", "payload": None, "expected_status": 200, "check_fn": check_fn_extensions },
    { "name": "Frontend Manifest", "method": "GET", "url": "/api/extensions/frontend-manifest", "payload": None, "expected_status": 200, "check_fn": check_fn_manifest },
    { "name": "Ingest Trace (Minimal)", "method": "POST", "url": "/api/traces", "payload": { "run_id": "test-run-1", "graph_id": "test-graph", "graph_version": "1", "status": "completed", "nodes": [], "edges": [] }, "expected_status": 200, "check_fn": check_fn_ingest },
    { "name": "Ingest Invalid Trace", "method": "POST", "url": "/api/traces", "payload": {"bad": "data"}, "expected_status": 422, "check_fn": None },
    
    # Gap Analysis Cases
    { "name": "Ingest Trace (Upsert)", "method": "POST", "url": "/api/traces", "payload": { "run_id": "test-run-1", "graph_id": "test-graph", "graph_version": "2", "status": "completed", "nodes": [], "edges": [] }, "expected_status": 200, "check_fn": check_fn_ingest },
    { "name": "Get Run Details", "method": "GET", "url": "/api/runs/test-run-1", "payload": None, "expected_status": 200, "check_fn": check_fn_upsert_verify },
    { "name": "Run Filtering (Match)", "method": "GET", "url": "/api/runs?graph_id=test-graph", "payload": None, "expected_status": 200, "check_fn": check_fn_filter_match },
    { "name": "Run Filtering (No Match)", "method": "GET", "url": "/api/runs?graph_id=non-existent-graph", "payload": None, "expected_status": 200, "check_fn": check_fn_filter_nomatch },
    { "name": "Extension Status Toggle (On non-existent)", "method": "POST", "url": "/api/extensions/fake-ext/status", "payload": {"enabled": True}, "expected_status": 404, "check_fn": None }
]

def run_tests():
    print("Running Backend Parameterized Tests (Mock Runner)...")
    passed = 0
    failed = 0
    
    for case in api_test_cases:
        try:
            if case["method"] == "GET":
                response = client.get(case["url"])
            elif case["method"] == "POST":
                response = client.post(case["url"], json=case["payload"])
            
            if response.status_code != case["expected_status"]:
                print(f"FAIL: {case['name']} - Expected {case['expected_status']}, got {response.status_code}. Body: {response.text}")
                failed += 1
                continue
                
            if case["check_fn"]:
                if not case["check_fn"](response):
                    print(f"FAIL: {case['name']} - Check function returned False")
                    print(f"DEBUG: Response body: {response.json()}")
                    failed += 1
                    continue
            
            print(f"PASS: {case['name']}")
            passed += 1
        except Exception as e:
            print(f"ERROR: {case['name']} - {e}")
            failed += 1

    print(f"\nSummary: {passed} Passed, {failed} Failed")
    if failed > 0:
        sys.exit(1)

if __name__ == "__main__":
    run_tests()
