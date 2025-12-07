
import logging
import uuid
import json
import requests
from typing import Any, Dict, Optional, List
from uuid import UUID
from langchain_core.callbacks import BaseCallbackHandler
from langchain_core.outputs import LLMResult

logger = logging.getLogger(__name__)

class SagenticTracer(BaseCallbackHandler):
    """
    A plug-and-play LangChain/LangGraph adapter for Sagentic.
    It connects to the Sagentic MCP Server via HTTP and logs executions.
    """
    
    def __init__(self, base_url: str = "http://localhost:8000/api/mcp", graph_id: str = "default_agent"):
        self.base_url = base_url.rstrip("/")
        self.messages_url = f"{self.base_url}/messages"
        self.graph_id = graph_id
        self.sagentic_run_id: Optional[str] = None
        self._execution_order = 0
        
    def _call_tool(self, tool_name: str, arguments: Dict[str, Any]) -> Any:
        """Helper to call Sagentic MCP tools via JSON-RPC over HTTP."""
        payload = {
            "jsonrpc": "2.0",
            "method": "tools/call",
            "params": {
                "name": tool_name,
                "arguments": arguments
            },
            "id": str(uuid.uuid4())
        }
        
        try:
            response = requests.post(self.messages_url, json=payload, timeout=5)
            response.raise_for_status()
            data = response.json()
            
            if "error" in data:
                logger.error(f"Sagentic Error: {data['error']}")
                return None
                
            if "result" in data and "content" in data["result"]:
                # Content is a list of text/image objects
                content_list = data["result"]["content"]
                if content_list and content_list[0]["type"] == "text":
                     # Return the raw text (which might be JSON string)
                     return content_list[0]["text"]
            
            return None
        except Exception as e:
            logger.error(f"Failed to call Sagentic tool {tool_name}: {e}")
            return None

    def on_chain_start(
        self, serialized: Dict[str, Any], inputs: Dict[str, Any], *, run_id: UUID, parent_run_id: Optional[UUID] = None, **kwargs: Any
    ) -> Any:
        # Start a new run if this is the root chain
        if parent_run_id is None:
            raw_run_id = self._call_tool("start_run", {
                "graph_id": self.graph_id,
                "input_state": inputs
            })
            if raw_run_id:
                # The tool returns run_id as a string (JSON encoded sometimes)
                # Cleanup if needed
                self.sagentic_run_id = raw_run_id.strip('"')
                logger.info(f"Sagentic Run Started: {self.sagentic_run_id}")

    def on_tool_end(
        self,
        output: str,
        *,
        run_id: UUID,
        parent_run_id: Optional[UUID] = None,
        **kwargs: Any,
    ) -> Any:
        """Log tool execution."""
        if self.sagentic_run_id:
            # We use the tool name from serialized if available, or kwargs
            name = kwargs.get("name", "tool")
            self._call_tool("log_step", {
                "run_id": self.sagentic_run_id,
                "node_name": name,
                "output": output
            })

    def on_chain_end(
        self,
        outputs: Dict[str, Any],
        *,
        run_id: UUID,
        parent_run_id: Optional[UUID] = None,
        **kwargs: Any,
    ) -> Any:
        """Log chain completion."""
        if parent_run_id is None and self.sagentic_run_id:
            # Log final output
            self._call_tool("log_step", {
                "run_id": self.sagentic_run_id,
                "node_name": "__end__",
                "output": outputs
            })
