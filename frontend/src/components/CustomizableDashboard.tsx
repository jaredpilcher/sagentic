import { useState, useEffect, useMemo } from 'react'
import GridLayout from 'react-grid-layout'
import type { Layout } from 'react-grid-layout'
import { Plus, X, Settings, RotateCcw, GripVertical, BarChart3, RefreshCw } from 'lucide-react'
import axios from 'axios'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import { useExtensions } from '../lib/extensions'
import type { WidgetDefinition, WidgetInstance, DashboardConfig } from '../lib/widgets'
import {
    BUILT_IN_WIDGETS,
    loadDashboardConfig,
    saveDashboardConfig,
    getDefaultDashboardConfig,
    generateWidgetInstanceId,
    findWidgetDefinition
} from '../lib/widgets'
import MetricWidget from './widgets/MetricWidget'
import RecentRunsWidget from './widgets/RecentRunsWidget'
import ExtensionWidget from './ExtensionWidget'

interface Run {
    id: string
    graph_id: string | null
    framework: string
    agent_id: string | null
    status: string
    started_at: string
    ended_at: string | null
    total_tokens: number
    total_cost: number
    total_latency_ms: number
    node_count: number
    tags: string[] | null
    error: string | null
}

export default function CustomizableDashboard() {
    const [config, setConfig] = useState<DashboardConfig>(loadDashboardConfig)
    const [isEditing, setIsEditing] = useState(false)
    const [showLibrary, setShowLibrary] = useState(false)
    const [runs, setRuns] = useState<Run[]>([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [containerWidth, setContainerWidth] = useState(1200)
    
    const { getDashboardWidgets } = useExtensions()
    const extensionWidgetContributions = getDashboardWidgets()

    const extensionWidgets: WidgetDefinition[] = useMemo(() => {
        return extensionWidgetContributions.map(w => ({
            id: `ext:${w.extensionName}:${w.id}`,
            title: w.title,
            description: w.description || `Widget from ${w.extensionName}`,
            icon: BarChart3,
            category: 'extension' as const,
            defaultSize: { 
                w: w.width === 'large' ? 6 : w.width === 'medium' ? 4 : 2, 
                h: w.height === 'large' ? 6 : w.height === 'medium' ? 4 : 2 
            },
            minSize: { w: 2, h: 2 },
            component: 'ExtensionWidget',
            extensionName: w.extensionName,
            extensionApiBaseUrl: w.apiBaseUrl
        }))
    }, [extensionWidgetContributions])

    useEffect(() => {
        const extensionWidgetIds = new Set(extensionWidgets.map(w => w.id))
        const validWidgets = config.widgets.filter(w => {
            if (w.widgetId.startsWith('ext:')) {
                return extensionWidgetIds.has(w.widgetId)
            }
            return findWidgetDefinition(w.widgetId, []) !== undefined
        })
        
        if (validWidgets.length !== config.widgets.length) {
            const newConfig = { ...config, widgets: validWidgets }
            setConfig(newConfig)
            saveDashboardConfig(newConfig)
        }
    }, [extensionWidgets])

    useEffect(() => {
        const handleResize = () => {
            const container = document.getElementById('dashboard-container')
            if (container) {
                setContainerWidth(container.offsetWidth)
            }
        }
        handleResize()
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    const fetchRuns = (isRefresh = false) => {
        if (isRefresh) setRefreshing(true)
        else setLoading(true)
        
        axios.get('/api/runs', { params: { limit: 100 } })
            .then(res => setRuns(res.data))
            .catch(err => console.error(err))
            .finally(() => {
                setLoading(false)
                setRefreshing(false)
            })
    }

    useEffect(() => {
        fetchRuns()
    }, [])

    const completedRuns = runs.filter(r => r.status === 'completed').length
    const failedRuns = runs.filter(r => r.status === 'failed').length
    const totalTokens = runs.reduce((acc, r) => acc + (r.total_tokens || 0), 0)
    const totalCost = runs.reduce((acc, r) => acc + (r.total_cost || 0), 0)
    const avgLatency = runs.length > 0 
        ? Math.round(runs.reduce((acc, r) => acc + (r.total_latency_ms || 0), 0) / runs.length)
        : 0
    const uniqueGraphs = new Set(runs.map(r => r.graph_id).filter(Boolean)).size
    const totalNodes = runs.reduce((acc, r) => acc + (r.node_count || 0), 0)

    const metrics: Record<string, { value: string | number; color?: string }> = {
        'total-runs': { value: runs.length },
        'completed-runs': { value: completedRuns, color: 'text-green-500' },
        'failed-runs': { value: failedRuns, color: 'text-red-500' },
        'avg-latency': { value: `${avgLatency}ms` },
        'total-cost': { value: `$${totalCost.toFixed(4)}` },
        'total-tokens': { value: totalTokens.toLocaleString() },
        'unique-graphs': { value: uniqueGraphs },
        'total-nodes': { value: totalNodes }
    }

    const onLayoutChange = (layout: Layout[]) => {
        const updatedWidgets = config.widgets.map(widget => {
            const layoutItem = layout.find(l => l.i === widget.id)
            if (layoutItem) {
                return {
                    ...widget,
                    x: layoutItem.x,
                    y: layoutItem.y,
                    w: layoutItem.w,
                    h: layoutItem.h
                }
            }
            return widget
        })
        const newConfig = { ...config, widgets: updatedWidgets }
        setConfig(newConfig)
        saveDashboardConfig(newConfig)
    }

    const addWidget = (widgetDef: WidgetDefinition) => {
        const maxY = config.widgets.reduce((max, w) => Math.max(max, w.y + w.h), 0)
        const newWidget: WidgetInstance = {
            id: generateWidgetInstanceId(),
            widgetId: widgetDef.id,
            x: 0,
            y: maxY,
            w: widgetDef.defaultSize.w,
            h: widgetDef.defaultSize.h
        }
        const newConfig = { ...config, widgets: [...config.widgets, newWidget] }
        setConfig(newConfig)
        saveDashboardConfig(newConfig)
    }

    const removeWidget = (instanceId: string) => {
        const newConfig = { 
            ...config, 
            widgets: config.widgets.filter(w => w.id !== instanceId) 
        }
        setConfig(newConfig)
        saveDashboardConfig(newConfig)
    }

    const resetDashboard = () => {
        const defaultConfig = getDefaultDashboardConfig()
        setConfig(defaultConfig)
        saveDashboardConfig(defaultConfig)
    }

    const layout: Layout[] = config.widgets.map(w => {
        const def = findWidgetDefinition(w.widgetId, extensionWidgets)
        return {
            i: w.id,
            x: w.x,
            y: w.y,
            w: w.w,
            h: w.h,
            minW: def?.minSize?.w || 1,
            minH: def?.minSize?.h || 1,
            static: !isEditing
        }
    })

    const renderWidget = (instance: WidgetInstance) => {
        const def = findWidgetDefinition(instance.widgetId, extensionWidgets)
        if (!def) return null

        if (def.component === 'ExtensionWidget' && def.extensionName) {
            const extWidget = extensionWidgetContributions.find(
                w => `ext:${w.extensionName}:${w.id}` === instance.widgetId
            )
            if (extWidget) {
                return (
                    <ExtensionWidget
                        extensionName={extWidget.extensionName}
                        apiBaseUrl={extWidget.apiBaseUrl}
                        widgetId={extWidget.id}
                        title={extWidget.title}
                        description={extWidget.description}
                        width={extWidget.width}
                        height={extWidget.height}
                    />
                )
            }
        }

        if (def.component === 'RecentRunsWidget') {
            return <RecentRunsWidget runs={runs} loading={loading} />
        }

        const metric = metrics[instance.widgetId]
        if (metric) {
            return (
                <MetricWidget
                    title={def.title}
                    value={metric.value}
                    icon={def.icon}
                    color={metric.color}
                />
            )
        }

        return null
    }

    const cols = 10
    const rowHeight = 40

    return (
        <div className="space-y-4">
            <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Dashboard</h2>
                    <p className="text-muted-foreground text-sm md:text-base mt-1">
                        Monitor your LangGraph agent executions.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => fetchRuns(true)}
                        disabled={refreshing}
                        className="flex items-center justify-center gap-2 px-3 py-2 bg-accent hover:bg-accent/80 rounded-lg transition-colors disabled:opacity-50"
                        title="Refresh data"
                    >
                        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={() => setShowLibrary(!showLibrary)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                            showLibrary ? 'bg-primary text-primary-foreground' : 'bg-accent hover:bg-accent/80'
                        }`}
                        title="Add widgets"
                    >
                        <Plus className="w-4 h-4" />
                        <span className="text-sm hidden sm:inline">Add Widget</span>
                    </button>
                    <button
                        onClick={() => setIsEditing(!isEditing)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                            isEditing ? 'bg-primary text-primary-foreground' : 'bg-accent hover:bg-accent/80'
                        }`}
                        title="Edit layout"
                    >
                        <Settings className="w-4 h-4" />
                        <span className="text-sm hidden sm:inline">{isEditing ? 'Done' : 'Edit'}</span>
                    </button>
                    {isEditing && (
                        <button
                            onClick={resetDashboard}
                            className="flex items-center gap-2 px-3 py-2 bg-destructive/10 hover:bg-destructive/20 text-destructive rounded-lg transition-colors"
                            title="Reset to default"
                        >
                            <RotateCcw className="w-4 h-4" />
                            <span className="text-sm hidden sm:inline">Reset</span>
                        </button>
                    )}
                </div>
            </header>

            {showLibrary && (
                <div className="bg-card border border-border rounded-xl p-4">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold">Widget Library</h3>
                        <button 
                            onClick={() => setShowLibrary(false)}
                            className="p-1 hover:bg-accent rounded"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <h4 className="text-xs font-medium text-muted-foreground uppercase mb-2">Metrics</h4>
                            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                                {BUILT_IN_WIDGETS.filter(w => w.category === 'metrics').map(widget => {
                                    const Icon = widget.icon
                                    return (
                                        <button
                                            key={widget.id}
                                            onClick={() => addWidget(widget)}
                                            className="flex items-center gap-2 p-3 bg-accent/50 hover:bg-accent rounded-lg transition-colors text-left"
                                        >
                                            <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                            <span className="text-sm truncate">{widget.title}</span>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                        <div>
                            <h4 className="text-xs font-medium text-muted-foreground uppercase mb-2">Data</h4>
                            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                                {BUILT_IN_WIDGETS.filter(w => w.category === 'runs').map(widget => {
                                    const Icon = widget.icon
                                    return (
                                        <button
                                            key={widget.id}
                                            onClick={() => addWidget(widget)}
                                            className="flex items-center gap-2 p-3 bg-accent/50 hover:bg-accent rounded-lg transition-colors text-left"
                                        >
                                            <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                            <span className="text-sm truncate">{widget.title}</span>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                        {extensionWidgets.length > 0 && (
                            <div>
                                <h4 className="text-xs font-medium text-muted-foreground uppercase mb-2">Extensions</h4>
                                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                                    {extensionWidgets.map(widget => {
                                        const Icon = widget.icon
                                        return (
                                            <button
                                                key={widget.id}
                                                onClick={() => addWidget(widget)}
                                                className="flex items-center gap-2 p-3 bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors text-left border border-primary/20"
                                            >
                                                <Icon className="w-4 h-4 text-primary flex-shrink-0" />
                                                <span className="text-sm truncate">{widget.title}</span>
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div id="dashboard-container" className="relative">
                {isEditing && (
                    <div className="absolute inset-0 pointer-events-none z-0">
                        <div className="w-full h-full opacity-5" style={{
                            backgroundSize: `${containerWidth / cols}px ${rowHeight}px`,
                            backgroundImage: 'linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)'
                        }} />
                    </div>
                )}
                <GridLayout
                    className="layout"
                    layout={layout}
                    cols={cols}
                    rowHeight={rowHeight}
                    width={containerWidth}
                    onLayoutChange={onLayoutChange}
                    isDraggable={isEditing}
                    isResizable={isEditing}
                    draggableHandle=".widget-drag-handle"
                    compactType="vertical"
                    margin={[12, 12]}
                >
                    {config.widgets.map(instance => (
                        <div key={instance.id} className="relative group">
                            {isEditing && (
                                <>
                                    <div className="widget-drag-handle absolute top-0 left-0 right-0 h-8 flex items-center justify-center cursor-move bg-accent/80 rounded-t-xl z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <GripVertical className="w-4 h-4 text-muted-foreground" />
                                    </div>
                                    <button
                                        onClick={() => removeWidget(instance.id)}
                                        className="absolute top-1 right-1 p-1 bg-destructive/90 text-destructive-foreground rounded-full z-20 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </>
                            )}
                            <div className={`h-full ${isEditing ? 'pointer-events-none' : ''}`}>
                                {renderWidget(instance)}
                            </div>
                        </div>
                    ))}
                </GridLayout>
            </div>
        </div>
    )
}
