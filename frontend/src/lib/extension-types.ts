export interface SidebarPanelContribution {
    id: string
    title: string
    icon?: string
    priority?: number
    component?: string
    path?: string
}

export interface DashboardWidgetContribution {
    id: string
    title: string
    description?: string
    width?: 'small' | 'medium' | 'large' | 'full'
    height?: 'small' | 'medium' | 'large'
    priority?: number
    component?: string
}

export interface ExtensionPageContribution {
    id: string
    path: string
    title: string
    icon?: string
    showInSidebar?: boolean
}

export interface ExtensionModalContribution {
    id: string
    title: string
    width?: 'small' | 'medium' | 'large' | 'full'
    height?: 'auto' | 'small' | 'medium' | 'large' | 'full'
}

export type ActionType = 'navigate' | 'modal' | 'api'

export interface RunActionContribution {
    id: string
    title: string
    icon?: string
    when?: string
    handler?: string
    actionType?: ActionType
    target?: string
    modal?: string
    navigateTo?: string
}

export interface AgentActionContribution {
    id: string
    title: string
    icon?: string
    when?: string
    handler?: string
    actionType?: ActionType
    target?: string
    modal?: string
    navigateTo?: string
}

export interface ContextMenuContribution {
    id: string
    title: string
    context: string
    icon?: string
    when?: string
    handler?: string
}

export interface ExtensionContributes {
    sidebar_panels?: SidebarPanelContribution[]
    dashboard_widgets?: DashboardWidgetContribution[]
    pages?: ExtensionPageContribution[]
    modals?: ExtensionModalContribution[]
    run_actions?: RunActionContribution[]
    agent_actions?: AgentActionContribution[]
    node_actions?: RunActionContribution[]
    context_menus?: ContextMenuContribution[]
    settings_panels?: SidebarPanelContribution[]
}

export interface ExtensionManifest {
    id: string
    name: string
    version: string
    description?: string
    frontend_entry?: string
    contributes?: ExtensionContributes
    base_url: string
    api_base_url: string
}
