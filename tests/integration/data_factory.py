
import uuid
import random
import json
from datetime import datetime, timedelta, timezone

class DataFactory:
    """Helper to generate consistent test data."""
    
    @staticmethod
    def run_id():
        return str(uuid.uuid4())
    
    @staticmethod
    def timestamp(offset_seconds=0):
        return (datetime.now(timezone.utc) + timedelta(seconds=offset_seconds)).isoformat()
    
    @staticmethod
    def create_run_payload(run_id=None, agent_id="test-agent", status="running"):
        return {
            "id": run_id or DataFactory.run_id(),
            "agent_id": agent_id,
            "graph_id": "test_graph_v1",
            "status": status,
            "created_at": DataFactory.timestamp(),
            "tags": ["test", "factory-generated"],
            "input_state": {"messages": [{"role": "user", "content": "Hello"}]}
        }

    @staticmethod
    def create_trace_payload(run_id, node_key="node_1", status="completed"):
        """Generate a LangGraph-style trace ingest payload."""
        return {
            "run_id": run_id,
            "graph_id": "test_graph_v1",
            "graph_version": "1.0",
            "nodes": [
                {
                    "id": str(uuid.uuid4()),
                    "node_key": node_key,
                    "node_type": "chain",
                    "order": 0,
                    "status": status,
                    "started_at": DataFactory.timestamp(-1),
                    "ended_at": DataFactory.timestamp(),
                    "state_in": {"keys": ["v1"]},
                    "state_out": {"keys": ["v1", "v2"]},
                    "messages": [
                        {
                            "id": str(uuid.uuid4()),
                            "role": "assistant",
                            "content": "Processed",
                            "order": 0,
                            "timestamp": DataFactory.timestamp()
                        }
                    ]
                }
            ],
            "edges": [],
            "run_metadata": {"env": "test"}
        }
