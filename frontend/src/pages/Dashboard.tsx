import { useEffect, useState } from 'react'
import axios from 'axios'
import { Link } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { Activity, ArrowRight, Bot, Clock, DollarSign, Zap, CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react'
import { motion } from 'framer-motion'
import { useExtensions } from '../lib/extensions'
import ExtensionWidget from '../components/ExtensionWidget'

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

export default function Dashboard() {
    const [runs, setRuns] = useState<Run[]>([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [statusFilter, setStatusFilter] = useState<string>('')
    const { getDashboardWidgets } = useExtensions()
    
    const extensionWidgets = getDashboardWidgets()

    const fetchRuns = (isRefresh = false) => {
        if (isRefresh) setRefreshing(true)
        else setLoading(true)
        
        axios.get('/api/runs', {
            params: { 
                status: statusFilter || undefined,
                limit: 100
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
    }, [statusFilter])

    const completedRuns = runs.filter(r => r.status === 'completed').length
    const failedRuns = runs.filter(r => r.status === 'failed').length
    const totalTokens = runs.reduce((acc, r) => acc + (r.total_tokens || 0), 0)
    const totalCost = runs.reduce((acc, r) => acc + (r.total_cost || 0), 0)
    const avgLatency = runs.length > 0 
        ? Math.round(runs.reduce((acc, r) => acc + (r.total_latency_ms || 0), 0) / runs.length)
        : 0

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

    return (
        <div className="space-y-6 md:space-y-8">
            <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Workflow Traces</h2>
                    <p className="text-muted-foreground text-sm md:text-base mt-1">Monitor and analyze your LangGraph agent executions.</p>
                </div>
                <button 
                    onClick={() => fetchRuns(true)}
                    disabled={refreshing}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl transition-colors active:scale-[0.98] disabled:opacity-50 self-start sm:self-auto"
                >
                    <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                    <span className="font-medium text-sm">Refresh</span>
                </button>
            </header>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
                <StatCard title="Total Runs" value={runs.length} icon={Activity} />
                <StatCard title="Completed" value={completedRuns} icon={CheckCircle} color="text-green-500" />
                <StatCard title="Failed" value={failedRuns} icon={XCircle} color="text-red-500" />
                <StatCard title="Avg Latency" value={`${avgLatency}ms`} icon={Clock} className="col-span-1" />
                <StatCard title="Total Cost" value={`$${totalCost.toFixed(4)}`} icon={DollarSign} className="col-span-1" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
                <div className="p-4 md:p-6 rounded-xl bg-card border border-border shadow-sm flex items-center justify-between sm:block">
                    <div className="flex items-center gap-2 sm:block">
                        <Zap className="w-4 h-4 text-muted-foreground sm:hidden" />
                        <span className="text-xs md:text-sm font-medium text-muted-foreground">Tokens</span>
                    </div>
                    <div className="text-lg md:text-2xl font-bold">{totalTokens.toLocaleString()}</div>
                </div>
                <div className="p-4 md:p-6 rounded-xl bg-card border border-border shadow-sm flex items-center justify-between sm:block">
                    <div className="flex items-center gap-2 sm:block">
                        <Bot className="w-4 h-4 text-muted-foreground sm:hidden" />
                        <span className="text-xs md:text-sm font-medium text-muted-foreground">Graphs</span>
                    </div>
                    <div className="text-lg md:text-2xl font-bold">{new Set(runs.map(r => r.graph_id).filter(Boolean)).size}</div>
                </div>
                <div className="p-4 md:p-6 rounded-xl bg-card border border-border shadow-sm flex items-center justify-between sm:block">
                    <div className="flex items-center gap-2 sm:block">
                        <Activity className="w-4 h-4 text-muted-foreground sm:hidden" />
                        <span className="text-xs md:text-sm font-medium text-muted-foreground">Nodes</span>
                    </div>
                    <div className="text-lg md:text-2xl font-bold">{runs.reduce((acc, r) => acc + (r.node_count || 0), 0)}</div>
                </div>
            </div>

            {extensionWidgets.length > 0 && (
                <div className="space-y-4">
                    <h3 className="font-semibold text-base md:text-lg">Extension Widgets</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {extensionWidgets.map(widget => (
                            <ExtensionWidget
                                key={`${widget.extensionId}-${widget.id}`}
                                extensionName={widget.extensionName}
                                apiBaseUrl={widget.apiBaseUrl}
                                widgetId={widget.id}
                                title={widget.title}
                                description={widget.description}
                                width={widget.width}
                                height={widget.height}
                            />
                        ))}
                    </div>
                </div>
            )}

            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                <div className="p-4 md:p-6 border-b border-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <h3 className="font-semibold text-base md:text-lg">Recent Runs</h3>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full sm:w-auto bg-accent/50 border-none rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                    >
                        <option value="">All Status</option>
                        <option value="completed">Completed</option>
                        <option value="failed">Failed</option>
                        <option value="running">Running</option>
                    </select>
                </div>

                <div className="divide-y divide-border">
                    {loading ? (
                        <div className="p-8 text-center text-muted-foreground">
                            <Activity className="w-6 h-6 animate-spin mx-auto mb-2" />
                            Loading runs...
                        </div>
                    ) : runs.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">
                            <Bot className="w-10 h-10 mx-auto mb-3 opacity-50" />
                            <p className="mb-2 font-medium">No workflow runs yet</p>
                            <p className="text-sm">Send a trace to /api/traces to see it here.</p>
                        </div>
                    ) : (
                        runs.map((run, i) => (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.02 }}
                                key={run.id}
                            >
                                <Link
                                    to={`/runs/${run.id}`}
                                    className="flex items-start sm:items-center justify-between p-4 hover:bg-accent/50 transition-colors group active:bg-accent/70"
                                >
                                    <div className="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0 flex-1">
                                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                            {getStatusIcon(run.status)}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="font-medium text-foreground flex flex-wrap items-center gap-2">
                                                <span className="truncate">{run.graph_id || 'Unnamed'}</span>
                                                <span className="text-xs px-2 py-0.5 bg-accent rounded-full text-muted-foreground flex-shrink-0">
                                                    {run.framework}
                                                </span>
                                            </div>
                                            <div className="text-xs text-muted-foreground font-mono truncate mt-0.5">{run.id.slice(0, 12)}...</div>
                                            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1.5 text-xs text-muted-foreground">
                                                <span className="flex items-center gap-1">
                                                    <Activity className="w-3 h-3" />
                                                    {run.node_count}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Zap className="w-3 h-3" />
                                                    {run.total_tokens}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {run.total_latency_ms}ms
                                                </span>
                                            </div>
                                            {run.error && (
                                                <p className="text-xs text-red-500 mt-1.5 line-clamp-1">
                                                    {run.error}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 sm:gap-4 ml-2 flex-shrink-0">
                                        <div className="text-xs sm:text-sm text-muted-foreground text-right hidden xs:block">
                                            {formatDistanceToNow(new Date(run.started_at), { addSuffix: true })}
                                        </div>
                                        <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                    </div>
                                </Link>
                            </motion.div>
                        ))
                    )}
                </div>
            </div>
        </div>
    )
}

function StatCard({ title, value, icon: Icon, color, className }: { title: string; value: string | number; icon: any; color?: string; className?: string }) {
    return (
        <div className={`p-4 md:p-6 rounded-xl bg-card border border-border shadow-sm ${className || ''}`}>
            <div className="flex items-center justify-between mb-2 md:mb-4">
                <span className="text-xs md:text-sm font-medium text-muted-foreground">{title}</span>
                <Icon className={`w-4 h-4 ${color || 'text-muted-foreground'}`} />
            </div>
            <div className="text-xl md:text-3xl font-bold truncate">{value}</div>
        </div>
    )
}
