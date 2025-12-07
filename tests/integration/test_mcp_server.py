
import pytest
from fastapi.testclient import TestClient
from src.api.server import app

client = TestClient(app)

def test_mcp_sse_endpoint():
    """Verify MCP SSE endpoint exists and returns event stream."""
    # SSE requires checking for the stream. TestClient supports stream=True?
    # Or just check response headers for now.
    
    # Using async client might be better for SSE, but TestClient is sync.
    # However, we can check basic connectivity.
    
    # Note: TestClient with sse-starlette might require some trickery or just check headers.
    try:
        with client.stream("GET", "/api/mcp/sse") as response:
            # We expect a success connection (200 OK) and text/event-stream content type
            assert response.status_code == 200
            assert "text/event-stream" in response.headers["content-type"]
            
            # Read all lines available (mock server yields quickly)
            # In real streaming, we might need manual iteration.
            lines = list(response.iter_lines())
            content = "\n".join([line for line in lines if line])
            assert "event: endpoint" in content
            assert "data: /api/mcp/messages" in content
        
    except Exception as e:
        pytest.fail(f"SSE Endpoint failed: {e}")

def test_mcp_tools_discovery():
    """Verify we can discover tools (start_run, log_step) via internal metadata or check."""
    from src.api.routers.mcp_server import TOOLS
    assert "start_run" in TOOLS
    assert "log_step" in TOOLS
