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
        description: 'Total number of workflow runs',
        icon: Activity,
        category: 'metrics',
        defaultSize: { w: 2, h: 2 },
        minSize: { w: 1, h: 2 },
        component: 'TotalRunsWidget'
    },
    {
        id: 'completed-runs',
        title: 'Completed',
        description: 'Successfully completed runs',
        icon: CheckCircle,
        category: 'metrics',
        defaultSize: { w: 2, h: 2 },
        minSize: { w: 1, h: 2 },
        component: 'CompletedRunsWidget'
    },
    {
        id: 'failed-runs',
        title: 'Failed',
        description: 'Failed workflow runs',
        icon: XCircle,
        category: 'metrics',
        defaultSize: { w: 2, h: 2 },
        minSize: { w: 1, h: 2 },
        component: 'FailedRunsWidget'
    },
    {
        id: 'avg-latency',
        title: 'Avg Latency',
        description: 'Average execution latency',
        icon: Clock,
        category: 'metrics',
        defaultSize: { w: 2, h: 2 },
        minSize: { w: 1, h: 2 },
        component: 'AvgLatencyWidget'
    },
    {
        id: 'total-cost',
        title: 'Total Cost',
        description: 'Cumulative API costs',
        icon: DollarSign,
        category: 'metrics',
        defaultSize: { w: 2, h: 2 },
        minSize: { w: 1, h: 2 },
        component: 'TotalCostWidget'
    },
    {
        id: 'total-tokens',
        title: 'Tokens',
        description: 'Total tokens consumed',
        icon: Zap,
        category: 'metrics',
        defaultSize: { w: 2, h: 2 },
        minSize: { w: 1, h: 2 },
        component: 'TotalTokensWidget'
    },
    {
        id: 'unique-graphs',
        title: 'Graphs',
        description: 'Unique graph definitions',
        icon: Bot,
        category: 'metrics',
        defaultSize: { w: 2, h: 2 },
        minSize: { w: 1, h: 2 },
        component: 'UniqueGraphsWidget'
    },
    {
        id: 'total-nodes',
        title: 'Nodes',
        description: 'Total node executions',
        icon: Activity,
        category: 'metrics',
        defaultSize: { w: 2, h: 2 },
        minSize: { w: 1, h: 2 },
        component: 'TotalNodesWidget'
    },
    {
        id: 'recent-runs',
        title: 'Recent Runs',
        description: 'Latest workflow executions',
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
        version: 1,
        widgets: [
            { id: 'w1', widgetId: 'total-runs', x: 0, y: 0, w: 2, h: 2 },
            { id: 'w2', widgetId: 'completed-runs', x: 2, y: 0, w: 2, h: 2 },
            { id: 'w3', widgetId: 'failed-runs', x: 4, y: 0, w: 2, h: 2 },
            { id: 'w4', widgetId: 'avg-latency', x: 6, y: 0, w: 2, h: 2 },
            { id: 'w5', widgetId: 'total-cost', x: 8, y: 0, w: 2, h: 2 },
            { id: 'w6', widgetId: 'total-tokens', x: 0, y: 2, w: 2, h: 2 },
            { id: 'w7', widgetId: 'unique-graphs', x: 2, y: 2, w: 2, h: 2 },
            { id: 'w8', widgetId: 'total-nodes', x: 4, y: 2, w: 2, h: 2 },
            { id: 'w9', widgetId: 'recent-runs', x: 0, y: 4, w: 10, h: 6 }
        ]
    }
}

export function loadDashboardConfig(): DashboardConfig {
    try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) {
            const config = JSON.parse(saved) as DashboardConfig
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
