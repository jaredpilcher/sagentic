
import pytest
import asyncio
import os
from fastapi import FastAPI
from src.extensions.manager import ExtensionManager

@pytest.mark.anyio
async def test_mcp_extension_loading():
    """Verify loading an MCP extension and calling a tool."""
    app = FastAPI()
    manager = ExtensionManager(app)
    
    # Define MCP config pointing to our echo server
    config = {
        "command": "python",
        "args": ["tests/mcp_server.py"],
        "env": {"PYTHONUNBUFFERED": "1"}
    }
    
    # Load extension
    success, msg = await manager.load_mcp_extension("test-mcp", "echo-ext", "1.0.0", config)
    assert success, f"Failed to load MCP extension: {msg}"
    
    # Verify router created
    assert "test-mcp" in manager.loaded_extensions
    ext_info = manager.loaded_extensions["test-mcp"]
    assert ext_info["type"] == "mcp"
    
    # Call tool via Client directly (simulating API call)
    client = ext_info["client"]
    tools = await client.list_tools()
    
    assert len(tools) == 1
    assert tools[0].name == "echo"
    
    # Call the tool
    result = await client.call_tool("echo", {"message": "Hello MCP"})
    
    # Result structure depends on server implementation, simpler check here
    content = result.get("content", [])
    assert len(content) > 0
    assert content[0]["text"] == "Echo: Hello MCP"
    
    # Cleanup
    await manager.unload_backend("test-mcp")
