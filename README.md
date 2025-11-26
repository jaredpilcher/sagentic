
# Agent Step Telemetry Service (Python)

A lightweight, open-source telemetry service for LLM agents, built with Python, FastAPI, and SQLite.

## Features

- **MCP Tool**: `audit_step` for easy integration with agents.
- **HTTP API**: REST endpoints for ingestion and inspection.
- **Analysis Plugins**: Extensible system for analyzing agent steps (includes `basic_stats`).
- **Storage**: SQLite database for local persistence.

## Prerequisites

- Python 3.10+
- pip

## Setup

1. Create a virtual environment (optional but recommended):
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

## Running the Server

Start the HTTP server:
```bash
uvicorn src.api.server:app --reload --port 3000
```
The server runs on `http://localhost:3000`.

## Running the MCP Server

The MCP server reads from stdin and writes to stdout.

To run it manually (for testing):
```bash
python3 -m src.mcp.server
```

## Testing

Run the automated tests:
```bash
pytest
```

## API Usage

### Ingest a Step

**POST** `/api/steps`

Payload:
```json
{
  "run_id": "run-123",
  "step_id": "step-abc",
  "agent_id": "my-agent",
  "timestamp": "2023-10-27T10:00:00Z",
  "role": "assistant",
  "prompt": {
    "user": "Hello",
    "system": "Be nice"
  },
  "response": "Hi there!",
  "metadata": {
    "model": "gpt-4"
  }
}
```
