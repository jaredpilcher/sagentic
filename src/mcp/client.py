
import asyncio
import json
import logging
import os
import shutil
from typing import Optional, Dict, Any, List
from .protocol import JsonRpcRequest, JsonRpcResponse, Tool, Resource, InitializeParams, InitializeResult

logger = logging.getLogger("mcp.client")

class McpClient:
    def __init__(self, command: str, args: List[str], cwd: Optional[str] = None, env: Optional[Dict] = None):
        self.command = command
        self.args = args
        self.cwd = cwd
        self.env = env or os.environ.copy()
        
        self.process: Optional[asyncio.subprocess.Process] = None
        self._pending_requests: Dict[str, asyncio.Future] = {}
        self._next_id = 1
        self._read_task: Optional[asyncio.Task] = None
        
        self.server_info: Optional[Dict] = None
        self.capabilities: Optional[Dict] = None

    async def start(self):
        """Start the MCP server subprocess."""
        # Resolve executable path if it's just a command name
        executable = shutil.which(self.command) or self.command
        
        self.process = await asyncio.create_subprocess_exec(
            executable,
            *self.args,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=self.cwd,
            env=self.env
        )
        
        self._read_task = asyncio.create_task(self._read_loop())
        
        # Initialize handshake
        await self._initialize()

    async def _read_loop(self):
        """Read stdout from the subprocess line by line (JSON-RPC)."""
        if not self.process or not self.process.stdout:
            return
            
        async for line in self.process.stdout:
            try:
                line_str = line.decode().strip()
                if not line_str:
                    continue
                    
                message = json.loads(line_str)
                await self._handle_message(message)
            except json.JSONDecodeError:
                logger.warning(f"Invalid JSON from MCP server: {line_str}")
            except Exception as e:
                logger.error(f"Error in read loop: {e}")

    async def _handle_message(self, message: Dict[str, Any]):
        """Handle incoming JSON-RPC message."""
        if "id" in message and ("result" in message or "error" in message):
            # Response
            req_id = str(message["id"])
            if req_id in self._pending_requests:
                future = self._pending_requests.pop(req_id)
                if "error" in message:
                    future.set_exception(Exception(f"MCP Error: {message['error']}"))
                else:
                    future.set_result(message.get("result"))
        else:
            # Notification or Request from Server (not implemented yet)
            pass

    async def send_request(self, method: str, params: Optional[Dict] = None) -> Any:
        """Send a JSON-RPC request and wait for response."""
        if not self.process:
            raise RuntimeError("Client not started")

        req_id = str(self._next_id)
        self._next_id += 1
        
        request = JsonRpcRequest(method=method, params=params, id=req_id)
        
        future = asyncio.get_running_loop().create_future()
        self._pending_requests[req_id] = future
        
        data = request.model_dump_json(exclude_none=True) + "\n"
        self.process.stdin.write(data.encode())
        await self.process.stdin.drain()
        
        return await future

    async def _initialize(self):
        """Perform MCP initialization handshake."""
        params = InitializeParams(
            capabilities={},
            clientInfo={"name": "sagentic", "version": "1.0.0"}
        )
        result = await self.send_request("initialize", params.model_dump())
        self.server_info = result.get("serverInfo")
        self.capabilities = result.get("capabilities")
        
        # Send initialized notification
        notify = JsonRpcRequest(method="notifications/initialized")
        data = notify.model_dump_json(exclude_none=True, exclude={'id'}) + "\n"
        self.process.stdin.write(data.encode())
        await self.process.stdin.drain()

    async def list_tools(self) -> List[Tool]:
        """List available tools."""
        result = await self.send_request("tools/list")
        tools_data = result.get("tools", [])
        return [Tool(**t) for t in tools_data]

    async def call_tool(self, name: str, arguments: Dict[str, Any]) -> Any:
        """Call a tool."""
        return await self.send_request("tools/call", {
            "name": name,
            "arguments": arguments
        })
    
    async def stop(self):
        """Terminate the subprocess."""
        if self.process:
            try:
                self.process.terminate()
                await self.process.wait()
            except Exception:
                pass
        
        if self._read_task:
            self._read_task.cancel()
