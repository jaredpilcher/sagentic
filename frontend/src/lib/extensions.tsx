import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'

export interface SidebarPanelContribution {
    id: string
    title: string
    icon?: string
    priority?: number
    component?: string
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

export interface RunActionContribution {
    id: string
    title: string
    icon?: string
    when?: string
    handler?: string
}

export interface AgentActionContribution {
    id: string
    title: string
    icon?: string
    when?: string
    handler?: string
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

interface ExtensionContextType {
    extensions: ExtensionManifest[]
    loading: boolean
    error: string | null
    refresh: () => Promise<void>
    getSidebarPanels: () => Array<SidebarPanelContribution & { extensionId: string; extensionName: string; apiBaseUrl: string }>
    getDashboardWidgets: () => Array<DashboardWidgetContribution & { extensionId: string; extensionName: string; apiBaseUrl: string }>
    getRunActions: () => Array<RunActionContribution & { extensionId: string; extensionName: string; apiBaseUrl: string }>
    getAgentActions: () => Array<AgentActionContribution & { extensionId: string; extensionName: string; apiBaseUrl: string }>
    executeAction: (extensionName: string, actionId: string, context: Record<string, unknown>) => Promise<unknown>
}

const ExtensionContext = createContext<ExtensionContextType | null>(null)

export function ExtensionProvider({ children }: { children: ReactNode }) {
    const [extensions, setExtensions] = useState<ExtensionManifest[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const refresh = useCallback(async () => {
        try {
            setLoading(true)
            const res = await fetch('/api/extensions/frontend-manifest')
            if (!res.ok) throw new Error('Failed to load extensions')
            const data = await res.json()
            setExtensions(data.extensions || [])
            setError(null)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load extensions')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        refresh()
    }, [refresh])

    const getSidebarPanels = useCallback(() => {
        const panels: Array<SidebarPanelContribution & { extensionId: string; extensionName: string; apiBaseUrl: string }> = []
        for (const ext of extensions) {
            if (ext.contributes?.sidebar_panels) {
                for (const panel of ext.contributes.sidebar_panels) {
                    panels.push({
                        ...panel,
                        extensionId: ext.id,
                        extensionName: ext.name,
                        apiBaseUrl: ext.api_base_url
                    })
                }
            }
        }
        return panels.sort((a, b) => (a.priority || 100) - (b.priority || 100))
    }, [extensions])

    const getDashboardWidgets = useCallback(() => {
        const widgets: Array<DashboardWidgetContribution & { extensionId: string; extensionName: string; apiBaseUrl: string }> = []
        for (const ext of extensions) {
            if (ext.contributes?.dashboard_widgets) {
                for (const widget of ext.contributes.dashboard_widgets) {
                    widgets.push({
                        ...widget,
                        extensionId: ext.id,
                        extensionName: ext.name,
                        apiBaseUrl: ext.api_base_url
                    })
                }
            }
        }
        return widgets.sort((a, b) => (a.priority || 100) - (b.priority || 100))
    }, [extensions])

    const getRunActions = useCallback(() => {
        const actions: Array<RunActionContribution & { extensionId: string; extensionName: string; apiBaseUrl: string }> = []
        for (const ext of extensions) {
            if (ext.contributes?.run_actions) {
                for (const action of ext.contributes.run_actions) {
                    actions.push({
                        ...action,
                        extensionId: ext.id,
                        extensionName: ext.name,
                        apiBaseUrl: ext.api_base_url
                    })
                }
            }
        }
        return actions
    }, [extensions])

    const getAgentActions = useCallback(() => {
        const actions: Array<AgentActionContribution & { extensionId: string; extensionName: string; apiBaseUrl: string }> = []
        for (const ext of extensions) {
            if (ext.contributes?.agent_actions) {
                for (const action of ext.contributes.agent_actions) {
                    actions.push({
                        ...action,
                        extensionId: ext.id,
                        extensionName: ext.name,
                        apiBaseUrl: ext.api_base_url
                    })
                }
            }
        }
        return actions
    }, [extensions])

    const executeAction = useCallback(async (extensionName: string, actionId: string, context: Record<string, unknown>) => {
        const res = await fetch(`/api/extensions/${extensionName}/actions/${actionId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(context)
        })
        if (!res.ok) throw new Error('Action failed')
        return res.json()
    }, [])

    return (
        <ExtensionContext.Provider value={{
            extensions,
            loading,
            error,
            refresh,
            getSidebarPanels,
            getDashboardWidgets,
            getRunActions,
            getAgentActions,
            executeAction
        }}>
            {children}
        </ExtensionContext.Provider>
    )
}

export function useExtensions() {
    const context = useContext(ExtensionContext)
    if (!context) {
        throw new Error('useExtensions must be used within ExtensionProvider')
    }
    return context
}
