
from typing import Optional, List, Dict, Any, Union, Literal
from pydantic import BaseModel, Field, ConfigDict

# JSON-RPC 2.0 Models
class JsonRpcRequest(BaseModel):
    jsonrpc: Literal["2.0"] = "2.0"
    method: str
    params: Optional[Dict[str, Any]] = None
    id: Optional[Union[str, int]] = None

class JsonRpcResponse(BaseModel):
    jsonrpc: Literal["2.0"] = "2.0"
    result: Optional[Any] = None
    error: Optional[Dict[str, Any]] = None
    id: Optional[Union[str, int]] = None

class JsonRpcNotification(BaseModel):
    jsonrpc: Literal["2.0"] = "2.0"
    method: str
    params: Optional[Dict[str, Any]] = None

# MCP Models (Simplified)
class Tool(BaseModel):
    name: str
    description: Optional[str] = None
    inputSchema: Dict[str, Any]

class Resource(BaseModel):
    uri: str
    name: str
    description: Optional[str] = None
    mimeType: Optional[str] = None

class InitializeParams(BaseModel):
    protocolVersion: str = "0.1.0"
    capabilities: Dict[str, Any]
    clientInfo: Dict[str, Any]

class InitializeResult(BaseModel):
    protocolVersion: str
    capabilities: Dict[str, Any]
    serverInfo: Dict[str, Any]
