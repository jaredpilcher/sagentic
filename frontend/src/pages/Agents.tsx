import { useEffect, useState } from 'react'
import axios from 'axios'
import { Link } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { 
    Bot, Activity, Zap, Clock, DollarSign, CheckCircle, XCircle, 
    RefreshCw, TrendingUp, ArrowRight
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useExtensions } from '../lib/extensions'

interface Agent {
    graph_id: string
    total_runs: number
    completed_runs: number
    failed_runs: number
    running_runs: number
    success_rate: number
    total_tokens: number
    total_cost: number
    avg_latency_ms: number
    last_run_at: string | null
    first_run_at: string | null
}

export default function Agents() {
    const [agents, setAgents] = useState<Agent[]>([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    
    const { getAgentActions } = useExtensions()
    const agentActions = getAgentActions()

    const fetchAgents = (isRefresh = false) => {
        if (isRefresh) setRefreshing(true)
        else setLoading(true)
        
        axios.get('/api/agents')
            .then(res => setAgents(res.data.agents || []))
            .catch(err => console.error(err))
            .finally(() => {
                setLoading(false)
                setRefreshing(false)
            })
    }

    useEffect(() => {
        fetchAgents()
    }, [])

    return (
        <div className="space-y-6">
            <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Agents</h2>
                    <p className="text-muted-foreground text-sm md:text-base mt-1">
                        All LangGraph agents with aggregated performance metrics.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => fetchAgents(true)}
                        disabled={refreshing}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl transition-colors active:scale-[0.98] disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                        <span className="font-medium text-sm hidden sm:inline">Refresh</span>
                    </button>
                </div>
            </header>

            {loading ? (
                <div className="p-8 text-center text-muted-foreground">
                    <Activity className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Loading agents...
                </div>
            ) : agents.length === 0 ? (
                <div className="bg-card border border-border rounded-xl p-8 text-center">
                    <Bot className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                    <h3 className="text-lg font-semibold mb-2">No agents found</h3>
                    <p className="text-muted-foreground text-sm max-w-md mx-auto">
                        Agents are automatically discovered when you send traces with a graph_id.
                        Send a trace to /api/traces to see your agents here.
                    </p>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {agents.map((agent, i) => (
                        <motion.div
                            key={agent.graph_id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                        >
                            <Link
                                to={`/agents/${encodeURIComponent(agent.graph_id)}`}
                                className="block bg-card border border-border rounded-xl p-5 hover:border-primary/50 hover:shadow-lg transition-all group"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                            <Bot className="w-5 h-5 text-primary" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                                                {agent.graph_id}
                                            </h3>
                                            {agent.last_run_at && (
                                                <p className="text-xs text-muted-foreground">
                                                    Last run {formatDistanceToNow(new Date(agent.last_run_at), { addSuffix: true })}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                </div>

                                <div className="grid grid-cols-2 gap-3 mb-4">
                                    <div className="bg-accent/50 rounded-lg p-3">
                                        <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                                            <Activity className="w-3 h-3" />
                                            <span className="text-xs">Total Runs</span>
                                        </div>
                                        <p className="text-lg font-bold">{agent.total_runs}</p>
                                    </div>
                                    <div className="bg-accent/50 rounded-lg p-3">
                                        <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                                            <TrendingUp className="w-3 h-3" />
                                            <span className="text-xs">Success Rate</span>
                                        </div>
                                        <p className={`text-lg font-bold ${
                                            agent.success_rate >= 90 ? 'text-green-500' :
                                            agent.success_rate >= 70 ? 'text-yellow-500' : 'text-red-500'
                                        }`}>
                                            {agent.success_rate}%
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-3">
                                    <div className="flex items-center gap-3">
                                        <span className="flex items-center gap-1">
                                            <CheckCircle className="w-3 h-3 text-green-500" />
                                            {agent.completed_runs}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <XCircle className="w-3 h-3 text-red-500" />
                                            {agent.failed_runs}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="flex items-center gap-1">
                                            <Zap className="w-3 h-3" />
                                            {(agent.total_tokens / 1000).toFixed(1)}k
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {agent.avg_latency_ms}ms
                                        </span>
                                        {agent.total_cost > 0 && (
                                            <span className="flex items-center gap-1 text-green-500">
                                                <DollarSign className="w-3 h-3" />
                                                {agent.total_cost.toFixed(2)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </Link>
                        </motion.div>
                    ))}
                </div>
            )}

            {agentActions.length > 0 && agents.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-4">
                    <span>Extension analytics: </span>
                    {agentActions.map((action, i) => (
                        <span key={`${action.extensionId}-${action.id}`}>
                            <Link 
                                to={`/extensions/${action.extensionName}`}
                                className="text-primary hover:underline"
                            >
                                {action.title}
                            </Link>
                            {i < agentActions.length - 1 && ', '}
                        </span>
                    ))}
                </div>
            )}
        </div>
    )
}
