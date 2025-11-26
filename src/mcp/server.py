
import sys
import json
import asyncio
from typing import Dict, Any
from ..core.models import AgentStep
from ..core.service import TelemetryService
from ..db.database import SessionLocal, init_db

# Initialize DB for MCP usage
init_db()

async def handle_request(request: Dict[str, Any]) -> Dict[str, Any]:
    req_id = request.get("id")
    method = request.get("method")
    
    if method == "tools/list":
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {
                "tools": [{
                    "name": "audit_step",
                    "description": "Audit an agent step with telemetry and analysis",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "run_id": {"type": "string"},
                            "step_id": {"type": "string"},
                            "agent_id": {"type": "string"},
                            "timestamp": {"type": "string"},
                            "role": {"type": "string", "enum": ["user", "assistant", "system"]},
                            "prompt": {
                                "type": "object",
                                "properties": {
                                    "system": {"type": "string"},
                                    "user": {"type": "string"},
                                    "assistant_context": {"type": "string"},
                                    "tools_trace": {"type": "array"}
                                }
                            },
                            "response": {"type": "string"},
                            "metadata": {"type": "object"}
                        },
                        "required": ["run_id", "step_id", "agent_id", "timestamp", "role"]
                    }
                }]
            }
        }
    
    if method == "tools/call":
        params = request.get("params", {})
        name = params.get("name")
        args = params.get("arguments", {})
        
        if name == "audit_step":
            try:
                # Convert args to AgentStep model
                # Note: args might need some cleaning if types don't match exactly (e.g. ISO string to datetime)
                # Pydantic handles ISO string to datetime automatically
                step = AgentStep(**args)
                
                db = SessionLocal()
                try:
                    service = TelemetryService(db)
                    result = await service.ingest_step(step)
                    
                    # Convert result to dict and handle Pydantic/JSON serialization
                    # The result from ingest_step is a dict with Pydantic models inside
                    
                    # Helper to serialize
                    def serialize(obj):
                        if hasattr(obj, 'dict'): return obj.dict()
                        return obj

                    return {
                        "jsonrpc": "2.0",
                        "id": req_id,
                        "result": {
                            "content": [{
                                "type": "text",
                                "text": json.dumps(result, default=serialize, indent=2)
                            }]
                        }
                    }
                finally:
                    db.close()
            except Exception as e:
                return {
                    "jsonrpc": "2.0",
                    "id": req_id,
                    "error": {
                        "code": -32603,
                        "message": str(e)
                    }
                }
    
    return {
        "jsonrpc": "2.0",
        "id": req_id,
        "error": {
            "code": -32601,
            "message": "Method not found"
        }
    }

async def main():
    # Read line by line from stdin
    loop = asyncio.get_event_loop()
    reader = asyncio.StreamReader()
    protocol = asyncio.StreamReaderProtocol(reader)
    await loop.connect_read_pipe(lambda: protocol, sys.stdin)
    
    while True:
        line = await reader.readline()
        if not line:
            break
        
        try:
            request = json.loads(line)
            response = await handle_request(request)
            sys.stdout.write(json.dumps(response) + "\n")
            sys.stdout.flush()
        except json.JSONDecodeError:
            continue
        except Exception as e:
            sys.stderr.write(f"Error: {e}\n")

if __name__ == "__main__":
    asyncio.run(main())
