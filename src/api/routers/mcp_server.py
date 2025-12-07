
import asyncio
import logging
import json
from typing import Any, Dict
from fastapi import APIRouter, Request, Response
from fastapi.responses import StreamingResponse
from sse_starlette.sse import EventSourceResponse

# Note: In a real implementation using the 'mcp' SDK, we would use FastMCP or similar.
# Since we are building "Sagentic as an MCP Server" manually/custom for now to ensure control,
# we will implement a basic SSE transport compatible with MCP.

# However, if we utilize the 'mcp' library, we can defer to its class.
# Let's try to build a custom minimal SSE implementation that adheres to the protocol 
# to ensure it integrates tightly with our SQL/Runs logic without external complex deps wrapping our app.

router = APIRouter(prefix="/api/mcp", tags=["mcp"])
logger = logging.getLogger(__name__)

from ...db.database import SessionLocal
from ...db.models import Run, NodeExecution
from datetime import datetime
import uuid

# MCP Tools Implementation
async def start_run(graph_id: str, input_state: Dict[str, Any]) -> str:
    """Start a new agent run."""
    run_id = str(uuid.uuid4())
    db = SessionLocal()
    try:
        run = Run(
            id=run_id,
            graph_id=graph_id,
            input_state=input_state,
            status="running",
            started_at=datetime.utcnow(),
            framework="langgraph-mcp"
        )
        db.add(run)
        db.commit()
        logger.info(f"MCP: Started run {run_id} for {graph_id}")
        return run_id
    except Exception as e:
        logger.error(f"Failed to start run: {e}")
        db.rollback()
        raise e
    finally:
        db.close()

async def log_step(run_id: str, node_name: str, output: Any) -> bool:
    """Log a step in a run."""
    db = SessionLocal()
    try:
        # Get next order
        count = db.query(NodeExecution).filter(NodeExecution.run_id == run_id).count()
        next_order = count + 1
        
        node = NodeExecution(
            id=str(uuid.uuid4()),
            run_id=run_id,
            node_key=node_name,
            node_type="tool", # inference mostly
            order=next_order,
            status="completed",
            state_out=output if isinstance(output, dict) else {"output": str(output)},
            started_at=datetime.utcnow(), # simplified
            ended_at=datetime.utcnow()
        )
        db.add(node)
        db.commit()
        logger.info(f"MCP: Logged step {node_name} for run {run_id}")
        return True
    except Exception as e:
        logger.error(f"Failed to log step: {e}")
        db.rollback()
        return False
    finally:
        db.close()

TOOLS = {
    "start_run": {
        "description": "Start a new tracking run for a graph/agent",
        "parameters": {
            "type": "object",
            "properties": {
                "graph_id": {"type": "string"},
                "input_state": {"type": "object"}
            },
            "required": ["graph_id"]
        },
        "fn": start_run
    },
    "log_step": {
        "description": "Log an execution step (node) output",
        "parameters": {
            "type": "object",
            "properties": {
                "run_id": {"type": "string"},
                "node_name": {"type": "string"},
                "output": {"type": "object"}
            },
            "required": ["run_id", "node_name"]
        },
        "fn": log_step
    }
}

# SSE Logic
# We need a way to send messages to specific connected clients.
# Simplified: We just support one session or broadcast for now, or per-request events.
# MCP SSE: Client GETs /sse -> receives endpoint URL for POST.

@router.get("/sse")
async def sse_endpoint(request: Request):
    """
    MCP SSE Endpoint.
    1. Sends 'endpoint' event with the POST URL.
    2. Sends tool list / logs as requested? 
    Actually, MCP over SSE: Server waits for POSTs and sends responses back over SSE.
    """
    async def event_generator():
        # 1. Send endpoint event
        yield {
            "event": "endpoint",
            "data": "/api/mcp/messages"
        }
        
        # Keep alive
        while True:
            await asyncio.sleep(1)
            # In a full implementation, we would have a queue here to yield JSON-RPC responses
            # tied to the session.
            # For simplicity in this demo, we just keep open.
    
    return EventSourceResponse(event_generator())

@router.post("/messages")
async def handle_messages(request: Request):
    """
    Handle JSON-RPC messages from the client.
    Support 'initialize', 'tools/list', and 'tools/call'.
    """
    try:
        body = await request.json()
    except Exception:
        return JSONResponse({"jsonrpc": "2.0", "error": {"code": -32700, "message": "Parse error"}, "id": None})
        
    method = body.get("method")
    req_id = body.get("id")
    
    response = {
        "jsonrpc": "2.0",
        "id": req_id
    }
    
    if method == "initialize":
        response["result"] = {
            "protocolVersion": "0.1.0",
            "capabilities": {
                "tools": {}
            },
            "serverInfo": {"name": "sagentic", "version": "1.0.0"}
        }
        
    elif method == "notifications/initialized":
        return Response(status_code=200)
        
    elif method == "tools/list":
        # Convert TOOLS dict to list format
        tool_list = []
        for name, tool in TOOLS.items():
            tool_list.append({
                "name": name,
                "description": tool["description"],
                "inputSchema": tool["parameters"]
            })
        response["result"] = {"tools": tool_list}
        
    elif method == "tools/call":
        params = body.get("params", {})
        name = params.get("name")
        args = params.get("arguments", {})
        
        if name in TOOLS:
            try:
                # Call the tool function
                # Tools are async
                result_data = await TOOLS[name]["fn"](**args)
                
                # Format result as MCP content
                response["result"] = {
                    "content": [
                        {
                            "type": "text",
                            "text": json.dumps(result_data) if isinstance(result_data, (dict, list)) else str(result_data)
                        }
                    ]
                }
            except Exception as e:
                response["error"] = {"code": -32000, "message": str(e)}
        else:
            response["error"] = {"code": -32601, "message": f"Method {name} not found"}
            
    else:
        # Default/Fallback
        pass
        
    return response

# Since implementing full SSE-based MCP server manually is complex (state management), 
# and we have 'mcp' SDK installed, we should try to use it if possible.
# But providing a SIMPLE implementation that agents can use might just mean HTTP tools?
# The user asked for "MCP Server".
# Let's provide a standard HTTP-based "Tools" list compatible with generic Agents if they don't strictly need persistent MCP connection?
# The user said: "This system will be the mcp tool... easy to setup... discover what it should send".
