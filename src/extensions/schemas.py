from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class ExtensionManifest(BaseModel):
    name: str = Field(..., description="Unique extension name")
    version: str = Field(..., description="Semantic version")
    description: Optional[str] = None
    author: Optional[str] = None
    
    backend_entry: Optional[str] = Field(None, description="Backend entry point, e.g., 'routes:register'")
    frontend_entry: Optional[str] = Field(None, description="Frontend entry point, e.g., 'dist/index.js'")
    
    nav_items: Optional[List[Dict[str, Any]]] = Field(None, description="Navigation items to add")
    routes: Optional[List[Dict[str, Any]]] = Field(None, description="Frontend routes to register")
    
    dependencies: Optional[List[str]] = Field(None, description="Python dependencies")


class ExtensionInfo(BaseModel):
    id: str
    name: str
    version: str
    description: Optional[str] = None
    status: str
    has_backend: bool
    has_frontend: bool
    manifest: ExtensionManifest
    created_at: datetime
    updated_at: datetime


class ExtensionListResponse(BaseModel):
    extensions: List[ExtensionInfo]
    total: int


class ExtensionInstallResponse(BaseModel):
    success: bool
    extension_id: Optional[str] = None
    name: Optional[str] = None
    message: str


class ExtensionStatusUpdate(BaseModel):
    status: str = Field(..., description="New status: 'enabled' or 'disabled'")


class FrontendExtensionManifest(BaseModel):
    id: str
    name: str
    version: str
    description: Optional[str] = None
    frontend_entry: Optional[str] = None
    nav_items: Optional[List[Dict[str, Any]]] = None
    routes: Optional[List[Dict[str, Any]]] = None
    base_url: str
