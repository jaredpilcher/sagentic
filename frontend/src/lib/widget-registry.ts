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

class WidgetRegistry {
    private widgets: Map<string, WidgetDefinition> = new Map()

    register(widget: WidgetDefinition) {
        this.widgets.set(widget.id, widget)
    }

    get(id: string): WidgetDefinition | undefined {
        return this.widgets.get(id)
    }

    getAll(): WidgetDefinition[] {
        return Array.from(this.widgets.values())
    }
}

export const widgetRegistry = new WidgetRegistry()

// Register Built-in Widgets
const builtIns: WidgetDefinition[] = [
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

builtIns.forEach(w => widgetRegistry.register(w))
