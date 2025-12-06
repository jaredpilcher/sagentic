import { useEffect, useState } from 'react'
import axios from 'axios'
import { Link } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { Activity, ArrowRight, Bot, Clock, Search, DollarSign, Zap, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { motion } from 'framer-motion'

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
    const [statusFilter, setStatusFilter] = useState<string>('')

    useEffect(() => {
        setLoading(true)
        axios.get('/api/runs', {
            params: { 
                status: statusFilter || undefined,
                limit: 100
            }
        })
            .then(res => setRuns(res.data))
            .catch(err => console.error(err))
            .finally(() => setLoading(false))
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
                return <CheckCircle className="w-4 h-4 text-green-500" />
            case 'failed':
                return <XCircle className="w-4 h-4 text-red-500" />
            case 'running':
                return <Activity className="w-4 h-4 text-blue-500 animate-pulse" />
            default:
                return <AlertCircle className="w-4 h-4 text-yellow-500" />
        }
    }

    return (
        <div className="space-y-8">
            <header>
                <h2 className="text-3xl font-bold tracking-tight">Workflow Traces</h2>
                <p className="text-muted-foreground mt-2">Monitor and analyze your LangGraph agent executions.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                <StatCard title="Total Runs" value={runs.length} icon={Activity} />
                <StatCard title="Completed" value={completedRuns} icon={CheckCircle} color="text-green-500" />
                <StatCard title="Failed" value={failedRuns} icon={XCircle} color="text-red-500" />
                <StatCard title="Avg Latency" value={`${avgLatency}ms`} icon={Clock} />
                <StatCard title="Total Cost" value={`$${totalCost.toFixed(4)}`} icon={DollarSign} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 rounded-xl bg-card border border-border shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-muted-foreground">Total Tokens</span>
                        <Zap className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="text-2xl font-bold">{totalTokens.toLocaleString()}</div>
                </div>
                <div className="p-6 rounded-xl bg-card border border-border shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-muted-foreground">Unique Graphs</span>
                        <Bot className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="text-2xl font-bold">{new Set(runs.map(r => r.graph_id).filter(Boolean)).size}</div>
                </div>
                <div className="p-6 rounded-xl bg-card border border-border shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-muted-foreground">Total Nodes Executed</span>
                        <Activity className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="text-2xl font-bold">{runs.reduce((acc, r) => acc + (r.node_count || 0), 0)}</div>
                </div>
            </div>

            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                <div className="p-6 border-b border-border flex justify-between items-center">
                    <h3 className="font-semibold text-lg">Recent Workflow Runs</h3>
                    <div className="flex items-center gap-4">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="bg-accent/50 border-none rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                        >
                            <option value="">All Status</option>
                            <option value="completed">Completed</option>
                            <option value="failed">Failed</option>
                            <option value="running">Running</option>
                        </select>
                    </div>
                </div>

                <div className="divide-y divide-border">
                    {loading ? (
                        <div className="p-8 text-center text-muted-foreground">Loading runs...</div>
                    ) : runs.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">
                            <p className="mb-2">No workflow runs yet.</p>
                            <p className="text-sm">Send a trace to /api/traces to see it here.</p>
                        </div>
                    ) : (
                        runs.map((run, i) => (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.03 }}
                                key={run.id}
                            >
                                <Link
                                    to={`/runs/${run.id}`}
                                    className="flex items-center justify-between p-4 hover:bg-accent/50 transition-colors group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                            {getStatusIcon(run.status)}
                                        </div>
                                        <div>
                                            <div className="font-medium text-foreground flex items-center gap-2">
                                                {run.graph_id || 'Unnamed Workflow'}
                                                <span className="text-xs px-2 py-0.5 bg-accent rounded-full text-muted-foreground">
                                                    {run.framework}
                                                </span>
                                            </div>
                                            <div className="text-xs text-muted-foreground font-mono">{run.id.slice(0, 12)}...</div>
                                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                                <span>{run.node_count} nodes</span>
                                                <span>{run.total_tokens} tokens</span>
                                                <span>{run.total_latency_ms}ms</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        {run.error && (
                                            <span className="text-xs text-red-500 max-w-[200px] truncate">
                                                {run.error}
                                            </span>
                                        )}
                                        <div className="text-sm text-muted-foreground">
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

function StatCard({ title, value, icon: Icon, color }: { title: string; value: string | number; icon: any; color?: string }) {
    return (
        <div className="p-6 rounded-xl bg-card border border-border shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-muted-foreground">{title}</span>
                <Icon className={`w-4 h-4 ${color || 'text-muted-foreground'}`} />
            </div>
            <div className="text-3xl font-bold">{value}</div>
        </div>
    )
}
