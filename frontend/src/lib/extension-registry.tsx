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

    // ... Helper functions (logic extracted from original file)
    // For brevity, I'm assuming the helper logic is similar but slightly cleaner
    // I'll implement one for demonstration of the pattern

    const attachMeta = (item: any, ext: ExtensionManifest) => ({
        ...item,
        extensionId: ext.id,
        extensionName: ext.name,
        apiBaseUrl: ext.api_base_url
    })

    const getSidebarPanels = useCallback(() => {
        return extensions.flatMap(ext =>
            (ext.contributes?.sidebar_panels || []).map(p => attachMeta(p, ext))
        ).sort((a, b) => (a.priority || 100) - (b.priority || 100))
    }, [extensions])

    const getDashboardWidgets = useCallback(() => {
        return extensions.flatMap(ext =>
            (ext.contributes?.dashboard_widgets || []).map(w => attachMeta(w, ext))
        ).sort((a, b) => (a.priority || 100) - (b.priority || 100))
    }, [extensions])

    const getRunActions = useCallback(() => {
        return extensions.flatMap(ext =>
            (ext.contributes?.run_actions || []).map(a => attachMeta(a, ext))
        )
    }, [extensions])

    const getAgentActions = useCallback(() => {
        return extensions.flatMap(ext =>
            (ext.contributes?.agent_actions || []).map(a => attachMeta(a, ext))
        )
    }, [extensions])

    const getExtensionPages = useCallback((extensionName: string) => {
        const ext = extensions.find(e => e.name === extensionName)
        if (!ext) return []
        return (ext.contributes?.pages || []).map(p => attachMeta(p, ext))
    }, [extensions])

    const getExtensionModals = useCallback((extensionName: string) => {
        const ext = extensions.find(e => e.name === extensionName)
        if (!ext) return []
        return (ext.contributes?.modals || []).map(m => attachMeta(m, ext))
    }, [extensions])

    const getAllPages = useCallback(() => {
        return extensions.flatMap(ext =>
            (ext.contributes?.pages || []).map(p => attachMeta(p, ext))
        )
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
