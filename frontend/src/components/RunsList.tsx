import { useEffect, useState } from 'react'
import axios from 'axios'
import { Link } from 'react-router-dom'
import { formatDistanceToNow, format } from 'date-fns'
import { 
    Activity, ArrowRight, Bot, Clock, Zap, CheckCircle, XCircle, 
    AlertCircle, RefreshCw, Search, Filter, BarChart3, Code2
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useExtensions } from '../lib/extensions'

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
    input_state?: Record<string, unknown> | null
    output_state?: Record<string, unknown> | null
}

interface RunsListProps {
    graphId?: string
    showGraphFilter?: boolean
    showTitle?: boolean
    title?: string
    subtitle?: string
    showStatePreview?: boolean
}

export default function RunsList({ 
    graphId, 
    showGraphFilter = true,
    showTitle = true,
    title = "All Runs",
    subtitle = "Browse and filter your workflow execution history.",
    showStatePreview = true
}: RunsListProps) {
    const [runs, setRuns] = useState<Run[]>([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [statusFilter, setStatusFilter] = useState<string>('')
    const [graphFilter, setGraphFilter] = useState<string>('')
    const [searchQuery, setSearchQuery] = useState('')
    const [showFilters, setShowFilters] = useState(false)
    const [expandedStates, setExpandedStates] = useState<Set<string>>(new Set())
    
    const { getRunActions } = useExtensions()
    const runActions = getRunActions()

    const fetchRuns = (isRefresh = false) => {
        if (isRefresh) setRefreshing(true)
        else setLoading(true)
        
        axios.get('/api/runs', {
            params: { 
                status: statusFilter || undefined,
                graph_id: graphId || undefined,
                limit: 200
            }
        })
            .then(res => setRuns(res.data))
            .catch(err => console.error(err))
            .finally(() => {
                setLoading(false)
                setRefreshing(false)
            })
    }

    useEffect(() => {
        fetchRuns()
    }, [statusFilter, graphId])

    const uniqueGraphs = [...new Set(runs.map(r => r.graph_id).filter(Boolean))] as string[]

    const filteredRuns = runs.filter(run => {
        if (graphFilter && run.graph_id !== graphFilter) return false
        if (searchQuery) {
            const query = searchQuery.toLowerCase()
            return (
                run.id.toLowerCase().includes(query) ||
                (run.graph_id?.toLowerCase().includes(query)) ||
                run.framework.toLowerCase().includes(query)
            )
        }
        return true
    })

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed':
                return <CheckCircle className="w-5 h-5 text-green-500" />
            case 'failed':
                return <XCircle className="w-5 h-5 text-red-500" />
            case 'running':
                return <Activity className="w-5 h-5 text-blue-500 animate-pulse" />
            default:
                return <AlertCircle className="w-5 h-5 text-yellow-500" />
        }
    }

    const getStatusBadge = (status: string) => {
        const colors: Record<string, string> = {
            completed: 'bg-green-500/10 text-green-500',
            failed: 'bg-red-500/10 text-red-500',
            running: 'bg-blue-500/10 text-blue-500',
            pending: 'bg-yellow-500/10 text-yellow-500'
        }
        return colors[status] || 'bg-muted text-muted-foreground'
    }

    const toggleStateExpand = (runId: string, e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setExpandedStates(prev => {
            const next = new Set(prev)
            if (next.has(runId)) {
                next.delete(runId)
            } else {
                next.add(runId)
            }
            return next
        })
    }

    const getStatePreview = (state: Record<string, unknown> | null | undefined) => {
        if (!state || Object.keys(state).length === 0) return null
        const keys = Object.keys(state).slice(0, 3)
        return keys.join(', ') + (Object.keys(state).length > 3 ? '...' : '')
    }

    return (
        <div className="space-y-6">
            {showTitle && (
                <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">{title}</h2>
                        <p className="text-muted-foreground text-sm md:text-base mt-1">
                            {subtitle}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => fetchRuns(true)}
                            disabled={refreshing}
                            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl transition-colors active:scale-[0.98] disabled:opacity-50"
                        >
                            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                            <span className="font-medium text-sm hidden sm:inline">Refresh</span>
                        </button>
                    </div>
                </header>
            )}

            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search by ID, graph, or framework..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-accent/50 border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                        />
                    </div>
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-colors ${
                            showFilters || statusFilter || graphFilter
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-accent hover:bg-accent/80'
                        }`}
                    >
                        <Filter className="w-4 h-4" />
                        <span className="text-sm">Filters</span>
                        {(statusFilter || graphFilter) && (
                            <span className="bg-primary-foreground/20 text-xs px-1.5 py-0.5 rounded-full">
                                {[statusFilter, graphFilter].filter(Boolean).length}
                            </span>
                        )}
                    </button>
                </div>

                {showFilters && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex flex-wrap gap-3 p-4 bg-card border border-border rounded-xl"
                    >
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Status</label>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="bg-accent/50 border-none rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none min-w-[140px]"
                            >
                                <option value="">All Status</option>
                                <option value="completed">Completed</option>
                                <option value="failed">Failed</option>
                                <option value="running">Running</option>
                            </select>
                        </div>
                        {showGraphFilter && (
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-medium text-muted-foreground">Graph</label>
                                <select
                                    value={graphFilter}
                                    onChange={(e) => setGraphFilter(e.target.value)}
                                    className="bg-accent/50 border-none rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none min-w-[140px]"
                                >
                                    <option value="">All Graphs</option>
                                    {uniqueGraphs.map(graph => (
                                        <option key={graph} value={graph}>{graph}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        {(statusFilter || graphFilter) && (
                            <button
                                onClick={() => {
                                    setStatusFilter('')
                                    setGraphFilter('')
                                }}
                                className="self-end text-sm text-muted-foreground hover:text-foreground transition-colors"
                            >
                                Clear filters
                            </button>
                        )}
                    </motion.div>
                )}
            </div>

            {runActions.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <BarChart3 className="w-4 h-4" />
                    <span>Extensions available: </span>
                    {runActions.map((action, i) => (
                        <span key={`${action.extensionId}-${action.id}`}>
                            <Link 
                                to={`/extensions/${action.extensionName}`}
                                className="text-primary hover:underline"
                            >
                                {action.title}
                            </Link>
                            {i < runActions.length - 1 && ', '}
                        </span>
                    ))}
                </div>
            )}

            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                <div className="p-4 border-b border-border flex items-center justify-between">
                    <h3 className="font-semibold">
                        {filteredRuns.length} {filteredRuns.length === 1 ? 'Run' : 'Runs'}
                        {(statusFilter || graphFilter || searchQuery) && ' (filtered)'}
                    </h3>
                    {!showTitle && (
                        <button 
                            onClick={() => fetchRuns(true)}
                            disabled={refreshing}
                            className="flex items-center justify-center gap-2 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-colors text-sm"
                        >
                            <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
                            <span className="font-medium">Refresh</span>
                        </button>
                    )}
                </div>

                <div className="divide-y divide-border">
                    {loading ? (
                        <div className="p-8 text-center text-muted-foreground">
                            <Activity className="w-6 h-6 animate-spin mx-auto mb-2" />
                            Loading runs...
                        </div>
                    ) : filteredRuns.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">
                            <Bot className="w-10 h-10 mx-auto mb-3 opacity-50" />
                            <p className="mb-2 font-medium">No runs found</p>
                            <p className="text-sm">
                                {searchQuery || statusFilter || graphFilter
                                    ? 'Try adjusting your filters'
                                    : 'Send a trace to /api/traces to see it here.'}
                            </p>
                        </div>
                    ) : (
                        filteredRuns.map((run, i) => (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: Math.min(i * 0.02, 0.5) }}
                                key={run.id}
                            >
                                <Link
                                    to={`/runs/${run.id}`}
                                    className="flex flex-col p-4 hover:bg-accent/50 transition-colors group active:bg-accent/70"
                                >
                                    <div className="flex items-start sm:items-center justify-between">
                                        <div className="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0 flex-1">
                                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                                {getStatusIcon(run.status)}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="font-medium text-foreground flex flex-wrap items-center gap-2">
                                                    <span className="truncate">{run.graph_id || 'Unnamed'}</span>
                                                    <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusBadge(run.status)}`}>
                                                        {run.status}
                                                    </span>
                                                    <span className="text-xs px-2 py-0.5 bg-accent rounded-full text-muted-foreground flex-shrink-0">
                                                        {run.framework}
                                                    </span>
                                                </div>
                                                <div className="text-xs text-muted-foreground font-mono truncate mt-0.5">{run.id}</div>
                                                <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1.5 text-xs text-muted-foreground">
                                                    <span className="flex items-center gap-1">
                                                        <Activity className="w-3 h-3" />
                                                        {run.node_count} nodes
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Zap className="w-3 h-3" />
                                                        {run.total_tokens} tokens
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        {run.total_latency_ms}ms
                                                    </span>
                                                    {run.total_cost > 0 && (
                                                        <span className="text-green-500">
                                                            ${run.total_cost.toFixed(4)}
                                                        </span>
                                                    )}
                                                </div>
                                                {run.error && (
                                                    <p className="text-xs text-red-500 mt-1.5 line-clamp-1">
                                                        {run.error}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-1 ml-2 flex-shrink-0">
                                            <div className="text-xs text-muted-foreground">
                                                {formatDistanceToNow(new Date(run.started_at), { addSuffix: true })}
                                            </div>
                                            <div className="text-[10px] text-muted-foreground/60">
                                                {format(new Date(run.started_at), 'MMM d, HH:mm')}
                                            </div>
                                            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors mt-1" />
                                        </div>
                                    </div>
                                    
                                    {showStatePreview && (run.input_state || run.output_state) && (
                                        <div className="mt-3 ml-14">
                                            <button
                                                onClick={(e) => toggleStateExpand(run.id, e)}
                                                className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                                            >
                                                <Code2 className="w-3 h-3" />
                                                <span>
                                                    {expandedStates.has(run.id) ? 'Hide state' : 'Show state'}
                                                    {!expandedStates.has(run.id) && run.input_state && (
                                                        <span className="text-muted-foreground/60 ml-1">
                                                            ({getStatePreview(run.input_state)})
                                                        </span>
                                                    )}
                                                </span>
                                            </button>
                                            
                                            {expandedStates.has(run.id) && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    className="mt-2 space-y-2"
                                                    onClick={(e) => e.preventDefault()}
                                                >
                                                    {run.input_state && Object.keys(run.input_state).length > 0 && (
                                                        <div className="bg-accent/50 rounded-lg p-3">
                                                            <div className="text-xs font-medium text-muted-foreground mb-1">Input State</div>
                                                            <pre className="text-xs font-mono overflow-x-auto text-foreground/80">
                                                                {JSON.stringify(run.input_state, null, 2)}
                                                            </pre>
                                                        </div>
                                                    )}
                                                    {run.output_state && Object.keys(run.output_state).length > 0 && (
                                                        <div className="bg-accent/50 rounded-lg p-3">
                                                            <div className="text-xs font-medium text-muted-foreground mb-1">Output State</div>
                                                            <pre className="text-xs font-mono overflow-x-auto text-foreground/80">
                                                                {JSON.stringify(run.output_state, null, 2)}
                                                            </pre>
                                                        </div>
                                                    )}
                                                </motion.div>
                                            )}
                                        </div>
                                    )}
                                </Link>
                            </motion.div>
                        ))
                    )}
                </div>
            </div>
        </div>
    )
}
