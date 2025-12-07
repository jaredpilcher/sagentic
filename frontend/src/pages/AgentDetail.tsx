import { useEffect, useState } from 'react'
import axios from 'axios'
import { useParams, Link } from 'react-router-dom'
import { formatDistanceToNow, format } from 'date-fns'
import { 
    Bot, Activity, Zap, Clock, DollarSign, CheckCircle, XCircle, 
    ArrowLeft, TrendingUp, Calendar
} from 'lucide-react'
import { motion } from 'framer-motion'
import RunsList from '../components/RunsList'
import { useExtensions } from '../lib/extensions'

interface AgentStats {
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

export default function AgentDetail() {
    const { graphId } = useParams<{ graphId: string }>()
    const [agent, setAgent] = useState<AgentStats | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    
    const { getRunActions } = useExtensions()
    const agentActions = getRunActions()

    useEffect(() => {
        if (!graphId) return
        
        setLoading(true)
        axios.get(`/api/agents/${encodeURIComponent(graphId)}`)
            .then(res => {
                setAgent(res.data)
                setError(null)
            })
            .catch(err => {
                console.error(err)
                setError(err.response?.data?.detail || 'Failed to load agent')
            })
            .finally(() => setLoading(false))
    }, [graphId])

    if (loading) {
        return (
            <div className="p-8 text-center text-muted-foreground">
                <Activity className="w-6 h-6 animate-spin mx-auto mb-2" />
                Loading agent...
            </div>
        )
    }

    if (error || !agent) {
        return (
            <div className="space-y-4">
                <Link to="/agents" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                    <ArrowLeft className="w-4 h-4" />
                    Back to Agents
                </Link>
                <div className="bg-card border border-border rounded-xl p-8 text-center">
                    <Bot className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                    <h3 className="text-lg font-semibold mb-2">Agent not found</h3>
                    <p className="text-muted-foreground text-sm">
                        {error || 'The requested agent could not be found.'}
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <Link to="/agents" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="w-4 h-4" />
                Back to Agents
            </Link>

            <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                        <Bot className="w-7 h-7 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">{agent.graph_id}</h2>
                        <p className="text-muted-foreground text-sm mt-1">
                            {agent.last_run_at ? (
                                <>Last run {formatDistanceToNow(new Date(agent.last_run_at), { addSuffix: true })}</>
                            ) : (
                                'No runs yet'
                            )}
                        </p>
                    </div>
                </div>
                {agentActions.length > 0 && (
                    <div className="flex items-center gap-2">
                        {agentActions.map(action => (
                            <Link
                                key={`${action.extensionId}-${action.id}`}
                                to={`/extensions/${action.extensionName}?graph=${encodeURIComponent(agent.graph_id)}`}
                                className="flex items-center gap-2 px-4 py-2.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl transition-colors text-sm font-medium"
                            >
                                {action.title}
                            </Link>
                        ))}
                    </div>
                )}
            </header>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-card border border-border rounded-xl p-4"
                >
                    <div className="flex items-center gap-2 text-muted-foreground mb-2">
                        <Activity className="w-4 h-4" />
                        <span className="text-sm">Total Runs</span>
                    </div>
                    <p className="text-3xl font-bold">{agent.total_runs}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                            <CheckCircle className="w-3 h-3 text-green-500" />
                            {agent.completed_runs} completed
                        </span>
                        <span className="flex items-center gap-1">
                            <XCircle className="w-3 h-3 text-red-500" />
                            {agent.failed_runs} failed
                        </span>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                    className="bg-card border border-border rounded-xl p-4"
                >
                    <div className="flex items-center gap-2 text-muted-foreground mb-2">
                        <TrendingUp className="w-4 h-4" />
                        <span className="text-sm">Success Rate</span>
                    </div>
                    <p className={`text-3xl font-bold ${
                        agent.success_rate >= 90 ? 'text-green-500' :
                        agent.success_rate >= 70 ? 'text-yellow-500' : 'text-red-500'
                    }`}>
                        {agent.success_rate}%
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                        {agent.running_runs > 0 && `${agent.running_runs} currently running`}
                    </p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-card border border-border rounded-xl p-4"
                >
                    <div className="flex items-center gap-2 text-muted-foreground mb-2">
                        <Zap className="w-4 h-4" />
                        <span className="text-sm">Total Tokens</span>
                    </div>
                    <p className="text-3xl font-bold">{(agent.total_tokens / 1000).toFixed(1)}k</p>
                    <p className="text-xs text-muted-foreground mt-2">
                        ~{Math.round(agent.total_tokens / Math.max(agent.total_runs, 1))} per run
                    </p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="bg-card border border-border rounded-xl p-4"
                >
                    <div className="flex items-center gap-2 text-muted-foreground mb-2">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm">Avg Latency</span>
                    </div>
                    <p className="text-3xl font-bold">{agent.avg_latency_ms}ms</p>
                    {agent.total_cost > 0 && (
                        <p className="text-xs text-green-500 mt-2 flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            ${agent.total_cost.toFixed(2)} total cost
                        </p>
                    )}
                </motion.div>
            </div>

            {agent.first_run_at && agent.last_run_at && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="flex items-center gap-4 text-sm text-muted-foreground"
                >
                    <span className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        First run: {format(new Date(agent.first_run_at), 'MMM d, yyyy')}
                    </span>
                    <span>-</span>
                    <span>
                        Last run: {format(new Date(agent.last_run_at), 'MMM d, yyyy HH:mm')}
                    </span>
                </motion.div>
            )}

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
            >
                <RunsList 
                    graphId={graphId}
                    showGraphFilter={false}
                    showTitle={false}
                    title={`Runs for ${agent.graph_id}`}
                    subtitle={`All workflow runs for this agent`}
                    showStatePreview={true}
                />
            </motion.div>
        </div>
    )
}
