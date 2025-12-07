/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import type { ExtensionManifest, SidebarPanelContribution, DashboardWidgetContribution, RunActionContribution, AgentActionContribution, ExtensionPageContribution, ExtensionModalContribution } from './extension-types'

interface ExtensionRegistryContextType {
    extensions: ExtensionManifest[]
    loading: boolean
    error: string | null
    refresh: () => Promise<void>
    getSidebarPanels: () => Array<SidebarPanelContribution & { extensionId: string; extensionName: string; apiBaseUrl: string }>
    getDashboardWidgets: () => Array<DashboardWidgetContribution & { extensionId: string; extensionName: string; apiBaseUrl: string }>
    getRunActions: () => Array<RunActionContribution & { extensionId: string; extensionName: string; apiBaseUrl: string }>
    getAgentActions: () => Array<AgentActionContribution & { extensionId: string; extensionName: string; apiBaseUrl: string }>
    getExtensionPages: (extensionName: string) => Array<ExtensionPageContribution & { extensionId: string; extensionName: string; apiBaseUrl: string }>
    getExtensionModals: (extensionName: string) => Array<ExtensionModalContribution & { extensionId: string; extensionName: string; apiBaseUrl: string }>
    getAllPages: () => Array<ExtensionPageContribution & { extensionId: string; extensionName: string; apiBaseUrl: string }>
}

const ExtensionRegistryContext = createContext<ExtensionRegistryContextType | null>(null)

export function ExtensionRegistryProvider({ children }: { children: ReactNode }) {
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

    const attachMeta = <T extends Record<string, unknown>>(item: T, ext: ExtensionManifest) => ({
        ...item,
        extensionId: ext.id,
        extensionName: ext.name,
        apiBaseUrl: ext.api_base_url
    })

    const getSidebarPanels = useCallback(() => {
        return extensions.flatMap(ext =>
            (ext.contributes?.sidebar_panels || []).map(p => attachMeta(p as unknown as Record<string, unknown>, ext))
        ).sort((a, b) => (Number(a.priority) || 100) - (Number(b.priority) || 100)) as unknown as Array<SidebarPanelContribution & { extensionId: string; extensionName: string; apiBaseUrl: string }>
    }, [extensions])

    const getDashboardWidgets = useCallback(() => {
        return extensions.flatMap(ext =>
            (ext.contributes?.dashboard_widgets || []).map(w => attachMeta(w as unknown as Record<string, unknown>, ext))
        ).sort((a, b) => (Number(a.priority) || 100) - (Number(b.priority) || 100)) as unknown as Array<DashboardWidgetContribution & { extensionId: string; extensionName: string; apiBaseUrl: string }>
    }, [extensions])

    const getRunActions = useCallback(() => {
        return extensions.flatMap(ext =>
            (ext.contributes?.run_actions || []).map(a => attachMeta(a as unknown as Record<string, unknown>, ext))
        ) as unknown as Array<RunActionContribution & { extensionId: string; extensionName: string; apiBaseUrl: string }>
    }, [extensions])

    const getAgentActions = useCallback(() => {
        return extensions.flatMap(ext =>
            (ext.contributes?.agent_actions || []).map(a => attachMeta(a as unknown as Record<string, unknown>, ext))
        ) as unknown as Array<AgentActionContribution & { extensionId: string; extensionName: string; apiBaseUrl: string }>
    }, [extensions])

    const getExtensionPages = useCallback((extensionName: string) => {
        const ext = extensions.find(e => e.name === extensionName)
        if (!ext) return []
        return (ext.contributes?.pages || []).map(p => attachMeta(p as unknown as Record<string, unknown>, ext)) as unknown as Array<ExtensionPageContribution & { extensionId: string; extensionName: string; apiBaseUrl: string }>
    }, [extensions])

    const getExtensionModals = useCallback((extensionName: string) => {
        const ext = extensions.find(e => e.name === extensionName)
        if (!ext) return []
        return (ext.contributes?.modals || []).map(m => attachMeta(m as unknown as Record<string, unknown>, ext)) as unknown as Array<ExtensionModalContribution & { extensionId: string; extensionName: string; apiBaseUrl: string }>
    }, [extensions])

    const getAllPages = useCallback(() => {
        return extensions.flatMap(ext =>
            (ext.contributes?.pages || []).map(p => attachMeta(p as unknown as Record<string, unknown>, ext))
        ) as unknown as Array<ExtensionPageContribution & { extensionId: string; extensionName: string; apiBaseUrl: string }>
    }, [extensions])

    return (
        <ExtensionRegistryContext.Provider value={{
            extensions,
            loading,
            error,
            refresh,
            getSidebarPanels,
            getDashboardWidgets,
            getRunActions,
            getAgentActions,
            getExtensionPages,
            getExtensionModals,
            getAllPages
        }}>
            {children}
        </ExtensionRegistryContext.Provider>
    )
}

export function useExtensionRegistry() {
    const context = useContext(ExtensionRegistryContext)
    if (!context) throw new Error('useExtensionRegistry must be used within ExtensionRegistryProvider')
    return context
}
