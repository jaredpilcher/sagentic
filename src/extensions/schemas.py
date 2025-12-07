from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class SidebarPanelContribution(BaseModel):
    id: str
    title: str
    icon: Optional[str] = "Package"
    priority: Optional[int] = 100
    component: Optional[str] = None


class DashboardWidgetContribution(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    width: Optional[str] = "medium"
    height: Optional[str] = "medium"
    priority: Optional[int] = 100
    component: Optional[str] = None


class RunActionContribution(BaseModel):
    id: str
    title: str
    icon: Optional[str] = "Zap"
    when: Optional[str] = None
    handler: Optional[str] = None


class ContextMenuContribution(BaseModel):
    id: str
    title: str
    context: str
    icon: Optional[str] = None
    when: Optional[str] = None
    handler: Optional[str] = None


class SettingsPanelContribution(BaseModel):
    id: str
    title: str
    icon: Optional[str] = "Settings"
    component: Optional[str] = None


class NetworkPermission(BaseModel):
    """Defines allowed network endpoints for an extension."""
    url: str = Field(..., description="Allowed URL pattern (e.g., 'https://api.example.com/*')")
    description: Optional[str] = Field(None, description="Human-readable description of why this URL is needed")
    methods: Optional[List[str]] = Field(None, description="Allowed HTTP methods (GET, POST, etc). None = all allowed")


class ExtensionPermissions(BaseModel):
    """Permissions requested by an extension. Displayed to user during installation."""
    storage: Optional[bool] = Field(False, description="Request access to persistent storage")
    network: Optional[List[NetworkPermission]] = Field(None, description="List of allowed external URLs")


class ExtensionContributes(BaseModel):
    sidebar_panels: Optional[List[SidebarPanelContribution]] = None
    dashboard_widgets: Optional[List[DashboardWidgetContribution]] = None
    run_actions: Optional[List[RunActionContribution]] = None
    node_actions: Optional[List[RunActionContribution]] = None
    context_menus: Optional[List[ContextMenuContribution]] = None
    settings_panels: Optional[List[SettingsPanelContribution]] = None


class ExtensionManifest(BaseModel):
    name: str = Field(..., description="Unique extension name")
    version: str = Field(..., description="Semantic version")
    description: Optional[str] = None
    author: Optional[str] = None
    
    backend_entry: Optional[str] = Field(None, description="Backend entry point, e.g., 'routes:register'")
    frontend_entry: Optional[str] = Field(None, description="Frontend entry point, e.g., 'index.js'")
    
    contributes: Optional[ExtensionContributes] = Field(None, description="UI contribution points")
    permissions: Optional[ExtensionPermissions] = Field(None, description="Permissions requested by the extension")
    
    activation_events: Optional[List[str]] = Field(None, description="Events that activate the extension")
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
    contributes: Optional[ExtensionContributes] = None
    base_url: str
    api_base_url: str
