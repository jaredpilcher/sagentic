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

### manifest.json with Contribution Points
```json
{
    "name": "my-extension",
    "version": "1.0.0",
    "description": "Description of the extension",
    "author": "Author Name",
    "backend_entry": "routes:register",
    "frontend_entry": "index.html",
    "contributes": {
        "sidebar_panels": [
            {"id": "my-panel", "title": "My Panel", "icon": "BarChart3", "priority": 10}
        ],
        "dashboard_widgets": [
            {"id": "my-widget", "title": "My Widget", "width": "medium", "height": "medium"}
        ],
        "run_actions": [
            {"id": "my-action", "title": "My Action", "icon": "Zap"}
        ]
    }
}
```

### Contribution Points (VS Code-style)
Extensions can inject UI at these touchpoints:
- **sidebar_panels**: Add navigation items to the sidebar with dedicated pages
- **dashboard_widgets**: Add metric/data widgets to the main dashboard
- **run_actions**: Add action buttons to run detail pages
- **node_actions**: Add action buttons to node detail views
- **context_menus**: Add items to context menus
- **settings_panels**: Add configuration UI panels

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

### Extension Data Storage
Extensions can persist their own data securely using the ExtensionStorage API:

```python
from src.extensions.storage import ExtensionStorage

storage = ExtensionStorage("my-extension")

# Store any JSON-serializable data
storage.set("user_preferences", {"theme": "dark", "refresh_rate": 30})

# Retrieve data (with optional default)
prefs = storage.get("user_preferences", {})

# Delete data
storage.delete("user_preferences")

# List all keys
keys = storage.list()

# Get all key-value pairs
all_data = storage.get_all()
```

**Security:**
- Each extension has its own isolated namespace
- Extensions cannot access other extensions' data
- Data is stored in PostgreSQL and persists across restarts
- When an extension is uninstalled, its data is automatically deleted

**REST API for extension data:**
- `GET /api/extensions/{id}/data` - List all data keys
- `GET /api/extensions/{id}/data/{key}` - Get a value
- `PUT /api/extensions/{id}/data/{key}` - Set a value
- `DELETE /api/extensions/{id}/data/{key}` - Delete a key

Extensions can also use the `/api/extensions/by-name/{name}/data/...` endpoints for convenience.

### Example Extension
See `example-extensions/agent-metrics/` for a complete example that adds:
- `/api/extensions/agent-metrics/stats` - Aggregate statistics
- `/api/extensions/agent-metrics/daily` - Daily metrics breakdown
- `/api/extensions/agent-metrics/graphs` - Per-graph statistics
- `/api/extensions/agent-metrics/settings` - Extension settings (demonstrates storage)
- `/api/extensions/agent-metrics/bookmarks` - Bookmarked runs (demonstrates list storage)

## Customizable Dashboard

The dashboard supports user-customizable widgets with drag-and-drop and responsive design:

### Built-in Widgets
- **Metrics**: Total Runs, Completed, Failed, Avg Latency, Total Cost, Tokens, Graphs, Nodes
- **Data**: Recent Runs list with status, timing, and token info

### Widget Customization (Desktop)
- Click **Add Widget** to open the widget library and add widgets
- Click **Edit** to enter edit mode where you can:
  - Drag widgets to rearrange them
  - Resize widgets by dragging edges
  - Remove widgets by clicking the X button
- Click **Reset** to restore the default layout

### Responsive Design
The dashboard automatically adapts to different screen sizes:
- **Desktop (>1200px)**: 12-column grid, side-by-side widgets
- **Tablet (768-1200px)**: 6-10 column grid with adjusted layout
- **Mobile (<768px)**: Single-column layout with full-width widgets, optimized for readability

### Extension Widgets
Extensions can contribute widgets to the library via the `contributes.dashboard_widgets` manifest section. Extension widgets appear in the widget library under "Extensions" category.

Dashboard layout is persisted in localStorage and survives page refreshes.

## Recent Changes (Dec 7, 2025)
- Added "All Runs" page with full run history, search, and filtering
  - Search by run ID, graph name, or framework
  - Filter by status (completed/failed/running) and graph
  - Shows extension run actions with links to extension panels
  - Full details: nodes, tokens, latency, cost, error messages, timestamps
- Added customizable widget dashboard with drag-and-drop (react-grid-layout)
- Users can add, remove, rearrange, and resize widgets
- Widget library includes built-in metrics and extension-contributed widgets
- Dashboard layout persisted in localStorage
- Extension widgets auto-removed when extensions are disabled
- Added VS Code-style Extension system with contribution points
- Extensions can inject UI at: sidebar panels, dashboard widgets, run actions
- Extensions can add backend API routes and serve frontend assets
- Single zip package installation and removal
- Enable/disable extensions dynamically updates UI (sidebar, widgets disappear)
- Created example agent-metrics extension demonstrating all contribution points

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
