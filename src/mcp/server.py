import sys
import json
import asyncio
import os
from typing import Dict, Any, List
from datetime import datetime
import uuid

from sqlalchemy import create_engine, desc
from sqlalchemy.orm import sessionmaker

DATABASE_URL = os.environ.get("DATABASE_URL")

if DATABASE_URL:
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
else:
    engine = None
    SessionLocal = None

from ..db.models import Run, NodeExecution, Message, Edge, Evaluation


def compute_state_diff(state_in: dict, state_out: dict) -> dict:
    diff = {"added": {}, "removed": {}, "modified": {}}
    all_keys = set(state_in.keys()) | set(state_out.keys())
    for key in all_keys:
        if key not in state_in:
            diff["added"][key] = state_out[key]
        elif key not in state_out:
            diff["removed"][key] = state_in[key]
        elif state_in[key] != state_out[key]:
            diff["modified"][key] = {"before": state_in[key], "after": state_out[key]}
    return diff


def ingest_trace(args: Dict[str, Any]) -> Dict[str, Any]:
    if not SessionLocal:
        return {"error": "Database not configured"}
    
    db = SessionLocal()
    try:
        run_id = args.get("run_id") or str(uuid.uuid4())
        now = datetime.utcnow()
        
        nodes = args.get("nodes", [])
        edges = args.get("edges", [])
        
        total_tokens = 0
        total_cost = 0.0
        total_latency = 0
        
        run = Run(
            id=run_id,
            graph_id=args.get("graph_id"),
            graph_version=args.get("graph_version"),
            framework=args.get("framework", "langgraph"),
            agent_id=args.get("agent_id"),
            status=args.get("status", "completed"),
            started_at=now,
            ended_at=now if args.get("status") != "running" else None,
            input_state=args.get("input_state"),
            output_state=args.get("output_state"),
            error=args.get("error"),
            run_metadata=args.get("run_metadata"),
            tags=args.get("tags")
        )
        db.add(run)
        
        for order, node_data in enumerate(nodes):
            node_id = str(uuid.uuid4())
            node_latency = 0
            
            state_in = node_data.get("state_in")
            state_out = node_data.get("state_out")
            state_diff = None
            if state_in and state_out:
                state_diff = compute_state_diff(state_in, state_out)
            
            node = NodeExecution(
                id=node_id,
                run_id=run_id,
                node_key=node_data.get("node_key"),
                node_type=node_data.get("node_type"),
                order=order,
                status="completed" if not node_data.get("error") else "failed",
                started_at=now,
                ended_at=now,
                state_in=state_in,
                state_out=state_out,
                state_diff=state_diff,
                error=node_data.get("error")
            )
            db.add(node)
            
            messages = node_data.get("messages", [])
            for msg_order, msg_data in enumerate(messages):
                message = Message(
                    id=str(uuid.uuid4()),
                    node_execution_id=node_id,
                    order=msg_order,
                    role=msg_data.get("role"),
                    content=msg_data.get("content"),
                    model=msg_data.get("model"),
                    provider=msg_data.get("provider"),
                    input_tokens=msg_data.get("input_tokens"),
                    output_tokens=msg_data.get("output_tokens"),
                    total_tokens=msg_data.get("total_tokens"),
                    cost=msg_data.get("cost"),
                    latency_ms=msg_data.get("latency_ms"),
                    tool_calls=msg_data.get("tool_calls"),
                    tool_results=msg_data.get("tool_results"),
                    raw_request=msg_data.get("raw_request"),
                    raw_response=msg_data.get("raw_response")
                )
                db.add(message)
                
                if msg_data.get("total_tokens"):
                    total_tokens += msg_data["total_tokens"]
                if msg_data.get("cost"):
                    total_cost += msg_data["cost"]
                if msg_data.get("latency_ms"):
                    node_latency += msg_data["latency_ms"]
            
            node.latency_ms = node_latency
            total_latency += node_latency
        
        for edge_order, edge_data in enumerate(edges):
            edge = Edge(
                id=str(uuid.uuid4()),
                run_id=run_id,
                from_node=edge_data.get("from_node"),
                to_node=edge_data.get("to_node"),
                condition_label=edge_data.get("condition_label"),
                order=edge_order
            )
            db.add(edge)
        
        run.total_tokens = total_tokens
        run.total_cost = total_cost
        run.total_latency_ms = total_latency
        
        db.commit()
        
        return {
            "status": "ingested",
            "run_id": run_id,
            "node_count": len(nodes),
            "edge_count": len(edges),
            "total_tokens": total_tokens,
            "total_cost": total_cost
        }
    except Exception as e:
        db.rollback()
        return {"error": str(e)}
    finally:
        db.close()


def list_runs(args: Dict[str, Any]) -> Dict[str, Any]:
    if not SessionLocal:
        return {"error": "Database not configured"}
    
    db = SessionLocal()
    try:
        limit = args.get("limit", 50)
        offset = args.get("offset", 0)
        
        runs = db.query(Run).order_by(desc(Run.started_at)).offset(offset).limit(limit).all()
        
        result = []
        for run in runs:
            node_count = db.query(NodeExecution).filter(NodeExecution.run_id == run.id).count()
            result.append({
                "id": run.id,
                "graph_id": run.graph_id,
                "framework": run.framework,
                "agent_id": run.agent_id,
                "status": run.status,
                "started_at": run.started_at.isoformat() if run.started_at else None,
                "total_tokens": run.total_tokens or 0,
                "total_cost": run.total_cost or 0.0,
                "node_count": node_count,
                "error": run.error
            })
        
        return {"runs": result, "count": len(result)}
    finally:
        db.close()


def get_run(args: Dict[str, Any]) -> Dict[str, Any]:
    if not SessionLocal:
        return {"error": "Database not configured"}
    
    db = SessionLocal()
    try:
        run_id = args.get("run_id")
        if not run_id:
            return {"error": "run_id is required"}
        
        run = db.query(Run).filter(Run.id == run_id).first()
        if not run:
            return {"error": "Run not found"}
        
        nodes = db.query(NodeExecution).filter(
            NodeExecution.run_id == run_id
        ).order_by(NodeExecution.order).all()
        
        node_data = []
        for node in nodes:
            messages = db.query(Message).filter(
                Message.node_execution_id == node.id
            ).order_by(Message.order).all()
            
            node_data.append({
                "id": node.id,
                "node_key": node.node_key,
                "node_type": node.node_type,
                "order": node.order,
                "status": node.status,
                "latency_ms": node.latency_ms,
                "state_in": node.state_in,
                "state_out": node.state_out,
                "state_diff": node.state_diff,
                "error": node.error,
                "messages": [{
                    "role": m.role,
                    "content": m.content,
                    "model": m.model,
                    "total_tokens": m.total_tokens,
                    "cost": m.cost,
                    "latency_ms": m.latency_ms
                } for m in messages]
            })
        
        edges = db.query(Edge).filter(Edge.run_id == run_id).order_by(Edge.order).all()
        
        return {
            "id": run.id,
            "graph_id": run.graph_id,
            "framework": run.framework,
            "status": run.status,
            "started_at": run.started_at.isoformat() if run.started_at else None,
            "input_state": run.input_state,
            "output_state": run.output_state,
            "total_tokens": run.total_tokens or 0,
            "total_cost": run.total_cost or 0.0,
            "error": run.error,
            "nodes": node_data,
            "edges": [{"from_node": e.from_node, "to_node": e.to_node, "label": e.condition_label} for e in edges]
        }
    finally:
        db.close()


async def handle_request(request: Dict[str, Any]) -> Dict[str, Any]:
    req_id = request.get("id")
    method = request.get("method")
    
    if method == "initialize":
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {
                "protocolVersion": "2024-11-05",
                "serverInfo": {
                    "name": "sagentic-observability",
                    "version": "1.0.0"
                },
                "capabilities": {
                    "tools": {}
                }
            }
        }
    
    if method == "tools/list":
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {
                "tools": [
                    {
                        "name": "ingest_trace",
                        "description": "Ingest a complete LangGraph workflow trace for observability",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "run_id": {"type": "string", "description": "Unique identifier for this run (auto-generated if not provided)"},
                                "graph_id": {"type": "string", "description": "Identifier for the graph/workflow definition"},
                                "graph_version": {"type": "string", "description": "Version of the graph"},
                                "framework": {"type": "string", "default": "langgraph", "description": "Framework name (langgraph, autogen, etc)"},
                                "agent_id": {"type": "string", "description": "Optional agent identifier"},
                                "status": {"type": "string", "enum": ["running", "completed", "failed"], "default": "completed"},
                                "input_state": {"type": "object", "description": "Initial state passed to the workflow"},
                                "output_state": {"type": "object", "description": "Final state from the workflow"},
                                "nodes": {
                                    "type": "array",
                                    "description": "List of node executions in order",
                                    "items": {
                                        "type": "object",
                                        "properties": {
                                            "node_key": {"type": "string", "description": "Name/key of the node"},
                                            "node_type": {"type": "string", "description": "Type of node (llm, tool, router, etc)"},
                                            "state_in": {"type": "object", "description": "State entering this node"},
                                            "state_out": {"type": "object", "description": "State exiting this node"},
                                            "error": {"type": "string", "description": "Error message if node failed"},
                                            "messages": {
                                                "type": "array",
                                                "items": {
                                                    "type": "object",
                                                    "properties": {
                                                        "role": {"type": "string", "enum": ["system", "user", "assistant", "tool"]},
                                                        "content": {"type": "string"},
                                                        "model": {"type": "string"},
                                                        "provider": {"type": "string"},
                                                        "input_tokens": {"type": "integer"},
                                                        "output_tokens": {"type": "integer"},
                                                        "total_tokens": {"type": "integer"},
                                                        "cost": {"type": "number"},
                                                        "latency_ms": {"type": "integer"},
                                                        "tool_calls": {"type": "array"},
                                                        "tool_results": {"type": "array"}
                                                    }
                                                }
                                            }
                                        },
                                        "required": ["node_key"]
                                    }
                                },
                                "edges": {
                                    "type": "array",
                                    "description": "Transitions between nodes",
                                    "items": {
                                        "type": "object",
                                        "properties": {
                                            "from_node": {"type": "string"},
                                            "to_node": {"type": "string"},
                                            "condition_label": {"type": "string"}
                                        },
                                        "required": ["from_node", "to_node"]
                                    }
                                },
                                "error": {"type": "string", "description": "Overall workflow error"},
                                "tags": {"type": "array", "items": {"type": "string"}},
                                "run_metadata": {"type": "object", "description": "Additional metadata"}
                            },
                            "required": ["nodes"]
                        }
                    },
                    {
                        "name": "list_runs",
                        "description": "List recent workflow runs",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "limit": {"type": "integer", "default": 50, "description": "Max runs to return"},
                                "offset": {"type": "integer", "default": 0}
                            }
                        }
                    },
                    {
                        "name": "get_run",
                        "description": "Get detailed information about a specific workflow run",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "run_id": {"type": "string", "description": "The run ID to retrieve"}
                            },
                            "required": ["run_id"]
                        }
                    }
                ]
            }
        }
    
    if method == "tools/call":
        params = request.get("params", {})
        name = params.get("name")
        args = params.get("arguments", {})
        
        try:
            if name == "ingest_trace":
                result = ingest_trace(args)
            elif name == "list_runs":
                result = list_runs(args)
            elif name == "get_run":
                result = get_run(args)
            else:
                return {
                    "jsonrpc": "2.0",
                    "id": req_id,
                    "error": {"code": -32602, "message": f"Unknown tool: {name}"}
                }
            
            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {
                    "content": [{
                        "type": "text",
                        "text": json.dumps(result, indent=2, default=str)
                    }]
                }
            }
        except Exception as e:
            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "error": {"code": -32603, "message": str(e)}
            }
    
    return {
        "jsonrpc": "2.0",
        "id": req_id,
        "error": {"code": -32601, "message": "Method not found"}
    }


async def main():
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
