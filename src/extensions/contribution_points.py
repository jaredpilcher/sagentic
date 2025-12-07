"""
Extension Contribution Points - VS Code-style extension touchpoints

Defines where extensions can inject functionality into the platform.
"""

from typing import TypedDict, List, Optional, Any
from enum import Enum


class ContributionType(str, Enum):
    SIDEBAR_PANEL = "sidebar_panel"
    DASHBOARD_WIDGET = "dashboard_widget"
    RUN_ACTION = "run_action"
    NODE_ACTION = "node_action"
    SETTINGS_PANEL = "settings_panel"
    CONTEXT_MENU = "context_menu"


class SidebarPanelContribution(TypedDict, total=False):
    id: str
    title: str
    icon: str
    priority: int


class DashboardWidgetContribution(TypedDict, total=False):
    id: str
    title: str
    description: str
    width: str
    height: str
    priority: int


class RunActionContribution(TypedDict, total=False):
    id: str
    title: str
    icon: str
    when: str


class ContextMenuContribution(TypedDict, total=False):
    id: str
    title: str
    context: str
    icon: str
    when: str


class SettingsPanelContribution(TypedDict, total=False):
    id: str
    title: str
    icon: str


class ExtensionContributions(TypedDict, total=False):
    sidebar_panels: List[SidebarPanelContribution]
    dashboard_widgets: List[DashboardWidgetContribution]
    run_actions: List[RunActionContribution]
    node_actions: List[RunActionContribution]
    context_menus: List[ContextMenuContribution]
    settings_panels: List[SettingsPanelContribution]


CONTRIBUTION_SCHEMA = {
    "sidebar_panels": {
        "description": "Add navigation items to the sidebar with custom pages",
        "required_fields": ["id", "title"],
        "optional_fields": ["icon", "priority"],
        "icons": ["BarChart3", "Settings", "Activity", "Database", "FileText", "Users", "Zap", "Shield"]
    },
    "dashboard_widgets": {
        "description": "Add widgets to the main dashboard",
        "required_fields": ["id", "title"],
        "optional_fields": ["description", "width", "height", "priority"],
        "width_options": ["small", "medium", "large", "full"],
        "height_options": ["small", "medium", "large"]
    },
    "run_actions": {
        "description": "Add action buttons to run detail pages",
        "required_fields": ["id", "title"],
        "optional_fields": ["icon", "when"]
    },
    "node_actions": {
        "description": "Add action buttons to node detail views", 
        "required_fields": ["id", "title"],
        "optional_fields": ["icon", "when"]
    },
    "context_menus": {
        "description": "Add items to context menus",
        "required_fields": ["id", "title", "context"],
        "optional_fields": ["icon", "when"],
        "context_options": ["run", "node", "message", "evaluation"]
    },
    "settings_panels": {
        "description": "Add configuration panels to extension settings",
        "required_fields": ["id", "title"],
        "optional_fields": ["icon"]
    }
}


def validate_contributions(contributions: dict) -> tuple[bool, list[str]]:
    """Validate extension contributions against the schema."""
    errors = []
    
    for contrib_type, items in contributions.items():
        if contrib_type not in CONTRIBUTION_SCHEMA:
            errors.append(f"Unknown contribution type: {contrib_type}")
            continue
        
        schema = CONTRIBUTION_SCHEMA[contrib_type]
        required = schema["required_fields"]
        
        if not isinstance(items, list):
            errors.append(f"{contrib_type} must be a list")
            continue
        
        for i, item in enumerate(items):
            for field in required:
                if field not in item:
                    errors.append(f"{contrib_type}[{i}] missing required field: {field}")
    
    return len(errors) == 0, errors
