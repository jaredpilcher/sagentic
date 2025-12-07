import { Activity, CheckCircle, XCircle, Clock, DollarSign, Zap, Bot, TrendingUp } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface WidgetDefinition {
    id: string
    title: string
    description: string
    icon: LucideIcon
    category: 'metrics' | 'runs' | 'extension'
    defaultSize: { w: number; h: number }
    minSize?: { w: number; h: number }
    component: string
    extensionName?: string
    extensionApiBaseUrl?: string
}

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

export const BUILT_IN_WIDGETS: WidgetDefinition[] = [
    {
        id: 'total-runs',
        title: 'Total Runs',
        description: 'Total runs',
        icon: Activity,
        category: 'metrics',
        defaultSize: { w: 2, h: 3 },
        minSize: { w: 2, h: 3 },
        component: 'TotalRunsWidget'
    },
    {
        id: 'completed-runs',
        title: 'Completed',
        description: 'Completed runs',
        icon: CheckCircle,
        category: 'metrics',
        defaultSize: { w: 2, h: 3 },
        minSize: { w: 2, h: 3 },
        component: 'CompletedRunsWidget'
    },
    {
        id: 'failed-runs',
        title: 'Failed',
        description: 'Failed runs',
        icon: XCircle,
        category: 'metrics',
        defaultSize: { w: 2, h: 3 },
        minSize: { w: 2, h: 3 },
        component: 'FailedRunsWidget'
    },
    {
        id: 'avg-latency',
        title: 'Avg Latency',
        description: 'Average speed',
        icon: Clock,
        category: 'metrics',
        defaultSize: { w: 2, h: 3 },
        minSize: { w: 2, h: 3 },
        component: 'AvgLatencyWidget'
    },
    {
        id: 'total-cost',
        title: 'Total Cost',
        description: 'All costs',
        icon: DollarSign,
        category: 'metrics',
        defaultSize: { w: 2, h: 3 },
        minSize: { w: 2, h: 3 },
        component: 'TotalCostWidget'
    },
    {
        id: 'total-tokens',
        title: 'Tokens',
        description: 'Tokens used',
        icon: Zap,
        category: 'metrics',
        defaultSize: { w: 2, h: 3 },
        minSize: { w: 2, h: 3 },
        component: 'TotalTokensWidget'
    },
    {
        id: 'unique-graphs',
        title: 'Graphs',
        description: 'Unique graphs',
        icon: Bot,
        category: 'metrics',
        defaultSize: { w: 2, h: 3 },
        minSize: { w: 2, h: 3 },
        component: 'UniqueGraphsWidget'
    },
    {
        id: 'total-nodes',
        title: 'Nodes',
        description: 'Total nodes',
        icon: Activity,
        category: 'metrics',
        defaultSize: { w: 2, h: 3 },
        minSize: { w: 2, h: 3 },
        component: 'TotalNodesWidget'
    },
    {
        id: 'recent-runs',
        title: 'Recent Runs',
        description: 'Latest runs',
        icon: TrendingUp,
        category: 'runs',
        defaultSize: { w: 6, h: 6 },
        minSize: { w: 3, h: 4 },
        component: 'RecentRunsWidget'
    }
]

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
    return BUILT_IN_WIDGETS.find(w => w.id === widgetId) || extensionWidgets.find(w => w.id === widgetId)
}
