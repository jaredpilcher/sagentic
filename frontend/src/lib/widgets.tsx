import { widgetRegistry } from './widget-registry'
import type { WidgetDefinition } from './widget-registry'
export type { WidgetDefinition }

export interface WidgetInstance {
    id: string
    widgetId: string
    x: number
    y: number
    w: number
    h: number
}

export interface DashboardConfig {
    widgets: WidgetInstance[]
    version: number
}

export const BUILT_IN_WIDGETS = widgetRegistry.getAll()

const STORAGE_KEY = 'sagentic-dashboard-config'

export function getDefaultDashboardConfig(): DashboardConfig {
    return {
        version: 2,
        widgets: [
            { id: 'w1', widgetId: 'total-runs', x: 0, y: 0, w: 2, h: 3 },
            { id: 'w2', widgetId: 'completed-runs', x: 2, y: 0, w: 2, h: 3 },
            { id: 'w3', widgetId: 'failed-runs', x: 4, y: 0, w: 2, h: 3 },
            { id: 'w4', widgetId: 'avg-latency', x: 6, y: 0, w: 2, h: 3 },
            { id: 'w5', widgetId: 'total-cost', x: 8, y: 0, w: 2, h: 3 },
            { id: 'w6', widgetId: 'total-tokens', x: 10, y: 0, w: 2, h: 3 },
            { id: 'w7', widgetId: 'unique-graphs', x: 0, y: 3, w: 2, h: 3 },
            { id: 'w8', widgetId: 'total-nodes', x: 2, y: 3, w: 2, h: 3 },
            { id: 'w9', widgetId: 'recent-runs', x: 4, y: 3, w: 8, h: 7 }
        ]
    }
}

export function loadDashboardConfig(): DashboardConfig {
    try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) {
            const config = JSON.parse(saved) as DashboardConfig
            if (config.version < 2) {
                return getDefaultDashboardConfig()
            }
            return config
        }
    } catch (e) {
        console.error('Failed to load dashboard config:', e)
    }
    return getDefaultDashboardConfig()
}

export function saveDashboardConfig(config: DashboardConfig): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
    } catch (e) {
        console.error('Failed to save dashboard config:', e)
    }
}

export function generateWidgetInstanceId(): string {
    return `w${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export function findWidgetDefinition(widgetId: string, extensionWidgets: WidgetDefinition[] = []): WidgetDefinition | undefined {
    // Check registry first (User might have registered generic ones)
    // Then check extension widgets passed in
    return widgetRegistry.get(widgetId) || extensionWidgets.find(w => w.id === widgetId)
}
