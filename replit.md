# Sagentic - LangGraph Observability Platform

## Overview
A lightweight, production-ready observability platform for LangGraph agent workflows. Built with Python, FastAPI, PostgreSQL (Alembic migrations), and a React frontend.

## Project Structure
- **Frontend**: React + Vite + TypeScript (in `frontend/`)
  - Dashboard with workflow metrics (runs, completion, latency, cost, tokens)
  - Run Detail page with timeline view, state diff visualization, message drill-down
  - Configured to run on port 5000
- **Backend**: FastAPI + Python (in `src/`)
  - REST API for trace ingestion and querying
  - Runs on port 3000
  - Uses PostgreSQL database with Alembic migrations
- **MCP Server**: (`src/mcp/server.py`)
  - JSON-RPC MCP server for LangGraph integration
  - Tools: ingest_trace, list_runs, get_run

## Data Model
- **Run**: Workflow execution with graph_id, framework, status, timestamps, states
- **NodeExecution**: Individual node in the graph with state_in, state_out, state_diff
- **Message**: LLM messages within a node (role, content, model, tokens, cost, latency)
- **Edge**: Transitions between nodes with optional condition labels
- **Evaluation**: Scores and feedback for runs/nodes

## API Endpoints
- `POST /api/traces` - Ingest complete workflow trace (supports upsert)
- `GET /api/runs` - List workflow runs with filters
- `GET /api/runs/{run_id}` - Get detailed run with nodes, messages, edges
- `GET /api/runs/{run_id}/graph` - Get graph visualization data
- `GET /api/runs/{run_id}/nodes/{node_id}` - Get node execution detail
- `POST /api/evaluations` - Create evaluation/feedback
- `GET /api/health` - Health check

## MCP Server Tools
- `ingest_trace` - Ingest LangGraph workflow trace with nodes, edges, messages
- `list_runs` - List recent workflow runs
- `get_run` - Get detailed run information

## Key Features
- **Upsert Support**: Re-ingesting same run_id replaces existing data
- **Timestamp Preservation**: Uses provided timestamps for accurate metrics
- **Source Ordering**: Preserves node execution order from trace payload
- **State Diff Visualization**: Shows added, removed, modified keys between states
- **Message Drill-down**: View full conversation with model, tokens, cost, latency

## Running the Application

### Development Mode
Both services configured via workflows:
- **Frontend**: Port 5000 via "Frontend" workflow
- **Backend**: Port 3000 via "Backend" workflow

Frontend proxies `/api` requests to backend.

### Ingesting Traces
```bash
curl -X POST http://localhost:3000/api/traces \
  -H "Content-Type: application/json" \
  -d '{
    "graph_id": "my-agent",
    "framework": "langgraph",
    "nodes": [
      {
        "node_key": "classify",
        "node_type": "llm",
        "state_in": {"query": "hello"},
        "state_out": {"query": "hello", "intent": "greeting"},
        "messages": [
          {"role": "assistant", "content": "Intent: greeting", "model": "gpt-4", "total_tokens": 45, "cost": 0.001}
        ]
      }
    ],
    "edges": [{"from_node": "classify", "to_node": "respond"}]
  }'
```

## Extension System

The platform supports a plugin/extension system for adding custom functionality:

### Extension Package Format
Extensions are zip files with the following structure:
```
extension.zip/
├── manifest.json      # Required: name, version, description
├── backend/           # Optional: Python backend code
│   └── routes.py      # Exports register(router) function
└── frontend/          # Optional: Frontend assets
    └── index.html     # Frontend entry point
```

### manifest.json
```json
{
    "name": "my-extension",
    "version": "1.0.0",
    "description": "Description of the extension",
    "author": "Author Name",
    "backend_entry": "routes:register",
    "frontend_entry": "index.html"
}
```

### Extension API Endpoints
- `GET /api/extensions` - List installed extensions
- `POST /api/extensions/install` - Upload and install a zip package
- `DELETE /api/extensions/{id}` - Uninstall an extension
- `PATCH /api/extensions/{id}/status` - Enable/disable extension
- `GET /api/extensions/{id}` - Get extension details
- `GET /api/extensions/frontend-manifest` - Get frontend extension manifest

### Backend Extensions
Backend extensions register routes with FastAPI:
```python
def register(router):
    @router.get("/my-endpoint")
    def my_endpoint():
        return {"message": "Hello from extension"}
    
    def cleanup():
        pass  # Optional cleanup on unload
    
    return cleanup
```

Routes are mounted at `/api/extensions/{extension_name}/...`

### Example Extension
See `example-extensions/agent-metrics/` for a complete example that adds:
- `/api/extensions/agent-metrics/stats` - Aggregate statistics
- `/api/extensions/agent-metrics/daily` - Daily metrics breakdown
- `/api/extensions/agent-metrics/graphs` - Per-graph statistics

## Recent Changes (Dec 7, 2025)
- Added Extension/Plugin management system
- Extensions can add backend API routes and frontend components
- Single zip package installation and removal
- Enable/disable extensions without uninstalling
- Created example agent-metrics extension

## Recent Changes (Dec 6, 2025)
- Transformed to LangGraph-focused observability platform
- Removed deprecated features: Playground, Prompts, Datasets, Compare
- Added PostgreSQL with Alembic migrations (replaces SQLite)
- Implemented upsert logic for trace ingestion
- Added timestamp and source ordering preservation
- Built MCP server with ingest_trace, list_runs, get_run tools
- Created Dashboard with workflow metrics
- Created Run Detail page with state diff and message viewer
- Mobile-friendly UI with collapsible sidebar, bottom navigation

## Database
- PostgreSQL (Neon-backed on Replit)
- Managed with Alembic migrations
- Tables: runs, node_executions, messages, edges, evaluations, extensions
