import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import axios from 'axios'
import { ArrowLeft, Clock, Zap, DollarSign, CheckCircle, XCircle, ChevronDown, ChevronRight, MessageSquare, GitBranch, Activity, Copy, Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface Message {
    id: string
    order: number
    role: string
    content: string | null
    model: string | null
    provider: string | null
    input_tokens: number | null
    output_tokens: number | null
    total_tokens: number | null
    cost: number | null
    latency_ms: number | null
    tool_calls: any[] | null
    tool_results: any[] | null
}

interface NodeExecution {
    id: string
    node_key: string
    node_type: string | null
    order: number
    status: string
    started_at: string | null
    ended_at: string | null
    latency_ms: number | null
    state_in: Record<string, any> | null
    state_out: Record<string, any> | null
    state_diff: { added: Record<string, any>; removed: Record<string, any>; modified: Record<string, any> } | null
    error: string | null
    messages: Message[]
}

interface Edge {
    id: string
    from_node: string
    to_node: string
    condition_label: string | null
    order: number
}

interface RunDetail {
    id: string
    graph_id: string | null
    graph_version: string | null
    framework: string
    agent_id: string | null
    status: string
    started_at: string
    ended_at: string | null
    input_state: Record<string, any> | null
    output_state: Record<string, any> | null
    total_tokens: number
    total_cost: number
    total_latency_ms: number
    error: string | null
    tags: string[] | null
    run_metadata: Record<string, any> | null
    nodes: NodeExecution[]
    edges: Edge[]
}

export default function RunDetailPage() {
    const { runId } = useParams<{ runId: string }>()
    const [run, setRun] = useState<RunDetail | null>(null)
    const [loading, setLoading] = useState(true)
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
    const [activeTab, setActiveTab] = useState<'timeline' | 'graph'>('timeline')
    const [copied, setCopied] = useState(false)

    useEffect(() => {
        if (!runId) return
        axios.get(`/api/runs/${runId}`)
            .then(res => {
                setRun(res.data)
                if (res.data.nodes.length > 0) {
                    setExpandedNodes(new Set([res.data.nodes[0].id]))
                }
            })
            .catch(err => console.error(err))
            .finally(() => setLoading(false))
    }, [runId])

    const toggleNode = (nodeId: string) => {
        setExpandedNodes(prev => {
            const newSet = new Set(prev)
            if (newSet.has(nodeId)) {
                newSet.delete(nodeId)
            } else {
                newSet.add(nodeId)
            }
            return newSet
        })
    }

    const copyRunId = () => {
        if (run?.id) {
            navigator.clipboard.writeText(run.id)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Activity className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (!run) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
                <div className="text-muted-foreground">Run not found</div>
                <Link to="/" className="text-primary hover:underline">Back to Dashboard</Link>
            </div>
        )
    }

    return (
        <div className="space-y-4 md:space-y-6">
            <div className="flex items-start gap-3 md:gap-4">
                <Link 
                    to="/" 
                    className="p-2.5 hover:bg-accent rounded-xl transition-colors flex-shrink-0 active:scale-[0.95]"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div className="min-w-0 flex-1">
                    <h2 className="text-xl md:text-2xl font-bold truncate">{run.graph_id || 'Workflow Run'}</h2>
                    <button 
                        onClick={copyRunId}
                        className="text-xs md:text-sm text-muted-foreground font-mono flex items-center gap-1.5 hover:text-foreground transition-colors mt-0.5"
                    >
                        <span className="truncate max-w-[200px] md:max-w-none">{run.id}</span>
                        {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                    </button>
                </div>
                <div className="flex-shrink-0">
                    {run.status === 'completed' ? (
                        <span className="flex items-center gap-1.5 text-green-500 text-sm bg-green-500/10 px-3 py-1.5 rounded-full">
                            <CheckCircle className="w-4 h-4" />
                            <span className="hidden sm:inline">Completed</span>
                        </span>
                    ) : run.status === 'failed' ? (
                        <span className="flex items-center gap-1.5 text-red-500 text-sm bg-red-500/10 px-3 py-1.5 rounded-full">
                            <XCircle className="w-4 h-4" />
                            <span className="hidden sm:inline">Failed</span>
                        </span>
                    ) : (
                        <span className="flex items-center gap-1.5 text-blue-500 text-sm bg-blue-500/10 px-3 py-1.5 rounded-full">
                            <Activity className="w-4 h-4 animate-pulse" />
                            <span className="hidden sm:inline">Running</span>
                        </span>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 md:p-4 rounded-xl bg-card border border-border">
                    <div className="text-xs text-muted-foreground mb-1">Framework</div>
                    <div className="font-medium text-sm md:text-base truncate">{run.framework}</div>
                </div>
                <div className="p-3 md:p-4 rounded-xl bg-card border border-border">
                    <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Latency
                    </div>
                    <div className="font-medium text-sm md:text-base">{run.total_latency_ms}ms</div>
                </div>
                <div className="p-3 md:p-4 rounded-xl bg-card border border-border">
                    <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                        <Zap className="w-3 h-3" /> Tokens
                    </div>
                    <div className="font-medium text-sm md:text-base">{run.total_tokens.toLocaleString()}</div>
                </div>
                <div className="p-3 md:p-4 rounded-xl bg-card border border-border">
                    <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                        <DollarSign className="w-3 h-3" /> Cost
                    </div>
                    <div className="font-medium text-sm md:text-base">${run.total_cost.toFixed(4)}</div>
                </div>
            </div>

            {run.error && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500">
                    <div className="font-medium mb-1 text-sm">Error</div>
                    <div className="text-sm font-mono break-all">{run.error}</div>
                </div>
            )}

            <div className="flex gap-1 p-1 bg-accent/50 rounded-xl w-fit">
                <button
                    onClick={() => setActiveTab('timeline')}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-all active:scale-[0.98] ${
                        activeTab === 'timeline'
                            ? 'bg-card text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                    Timeline
                </button>
                <button
                    onClick={() => setActiveTab('graph')}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-all active:scale-[0.98] ${
                        activeTab === 'graph'
                            ? 'bg-card text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                    Graph
                </button>
            </div>

            {activeTab === 'timeline' && (
                <div className="space-y-3">
                    {run.nodes.map((node, index) => (
                        <motion.div
                            key={node.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="bg-card border border-border rounded-xl overflow-hidden"
                        >
                            <button
                                onClick={() => toggleNode(node.id)}
                                className="w-full p-4 flex items-center justify-between hover:bg-accent/50 transition-colors active:bg-accent/70"
                            >
                                <div className="flex items-center gap-3 md:gap-4 min-w-0">
                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold flex-shrink-0">
                                        {index + 1}
                                    </div>
                                    <div className="text-left min-w-0">
                                        <div className="font-medium flex flex-wrap items-center gap-2">
                                            <span className="truncate">{node.node_key}</span>
                                            {node.node_type && (
                                                <span className="text-xs px-2 py-0.5 bg-accent rounded text-muted-foreground flex-shrink-0">
                                                    {node.node_type}
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-2 md:gap-3 mt-1">
                                            {node.latency_ms != null && <span>{node.latency_ms}ms</span>}
                                            <span>{node.messages.length} messages</span>
                                            {node.status === 'failed' && (
                                                <span className="text-red-500">Failed</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex-shrink-0 ml-2">
                                    {expandedNodes.has(node.id) ? (
                                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                                    ) : (
                                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                                    )}
                                </div>
                            </button>

                            <AnimatePresence>
                                {expandedNodes.has(node.id) && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="border-t border-border overflow-hidden"
                                    >
                                        <div className="p-4 space-y-4">
                                            {node.state_diff && (Object.keys(node.state_diff.added).length > 0 || 
                                                Object.keys(node.state_diff.removed).length > 0 || 
                                                Object.keys(node.state_diff.modified).length > 0) && (
                                                <div className="space-y-2">
                                                    <h4 className="text-sm font-medium text-muted-foreground">State Changes</h4>
                                                    <div className="space-y-2">
                                                        {Object.keys(node.state_diff.added).length > 0 && (
                                                            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                                                                <div className="text-xs font-medium text-green-500 mb-2">Added</div>
                                                                <pre className="text-xs overflow-auto max-h-32 break-all whitespace-pre-wrap">
                                                                    {JSON.stringify(node.state_diff.added, null, 2)}
                                                                </pre>
                                                            </div>
                                                        )}
                                                        {Object.keys(node.state_diff.removed).length > 0 && (
                                                            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                                                                <div className="text-xs font-medium text-red-500 mb-2">Removed</div>
                                                                <pre className="text-xs overflow-auto max-h-32 break-all whitespace-pre-wrap">
                                                                    {JSON.stringify(node.state_diff.removed, null, 2)}
                                                                </pre>
                                                            </div>
                                                        )}
                                                        {Object.keys(node.state_diff.modified).length > 0 && (
                                                            <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                                                                <div className="text-xs font-medium text-yellow-500 mb-2">Modified</div>
                                                                <pre className="text-xs overflow-auto max-h-32 break-all whitespace-pre-wrap">
                                                                    {JSON.stringify(node.state_diff.modified, null, 2)}
                                                                </pre>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {node.messages.length > 0 && (
                                                <div className="space-y-2">
                                                    <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                                        <MessageSquare className="w-4 h-4" /> Messages
                                                    </h4>
                                                    <div className="space-y-2">
                                                        {node.messages.map((msg) => (
                                                            <div
                                                                key={msg.id}
                                                                className={`p-3 rounded-lg ${
                                                                    msg.role === 'assistant'
                                                                        ? 'bg-primary/5 border border-primary/20'
                                                                        : msg.role === 'user'
                                                                        ? 'bg-accent/50'
                                                                        : msg.role === 'system'
                                                                        ? 'bg-yellow-500/5 border border-yellow-500/20'
                                                                        : 'bg-accent'
                                                                }`}
                                                            >
                                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
                                                                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                                                        {msg.role}
                                                                    </span>
                                                                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                                                        {msg.model && <span className="bg-accent px-1.5 py-0.5 rounded">{msg.model}</span>}
                                                                        {msg.total_tokens != null && <span>{msg.total_tokens} tokens</span>}
                                                                        {msg.latency_ms != null && <span>{msg.latency_ms}ms</span>}
                                                                    </div>
                                                                </div>
                                                                <div className="text-sm whitespace-pre-wrap break-words">
                                                                    {msg.content || (msg.tool_calls ? (
                                                                        <div className="space-y-1">
                                                                            {msg.tool_calls.map((tc, i) => (
                                                                                <div key={i} className="font-mono text-xs bg-background/50 p-2 rounded break-all">
                                                                                    Tool: {tc.name || tc.function?.name || 'unknown'}
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    ) : 'No content')}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {node.error && (
                                                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                                                    <div className="text-xs font-medium text-red-500 mb-1">Error</div>
                                                    <div className="text-sm font-mono text-red-400 break-all">{node.error}</div>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    ))}
                </div>
            )}

            {activeTab === 'graph' && (
                <div className="bg-card border border-border rounded-xl p-4 md:p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <GitBranch className="w-5 h-5 text-primary" />
                        <h3 className="font-medium">Workflow Graph</h3>
                    </div>
                    <div className="overflow-x-auto pb-4">
                        <div className="flex items-center gap-2 min-w-max">
                            {run.nodes.map((node, index) => (
                                <div key={node.id} className="flex items-center gap-2">
                                    <div
                                        className={`px-3 md:px-4 py-2 rounded-lg border-2 ${
                                            node.status === 'failed'
                                                ? 'border-red-500 bg-red-500/10'
                                                : 'border-primary bg-primary/10'
                                        }`}
                                    >
                                        <div className="font-medium text-xs md:text-sm whitespace-nowrap">{node.node_key}</div>
                                        <div className="text-xs text-muted-foreground">{node.latency_ms}ms</div>
                                    </div>
                                    {index < run.nodes.length - 1 && (
                                        <div className="flex items-center flex-shrink-0">
                                            <div className="w-6 md:w-8 h-0.5 bg-border"></div>
                                            <div className="w-0 h-0 border-t-4 border-b-4 border-l-4 border-transparent border-l-border"></div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                    {run.edges.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-border">
                            <h4 className="text-sm font-medium text-muted-foreground mb-2">Transitions</h4>
                            <div className="flex flex-wrap gap-2">
                                {run.edges.map((edge) => (
                                    <div key={edge.id} className="text-xs bg-accent px-2 py-1.5 rounded-lg">
                                        {edge.from_node} → {edge.to_node}
                                        {edge.condition_label && (
                                            <span className="ml-1 text-muted-foreground">({edge.condition_label})</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {(run.input_state || run.output_state) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                    {run.input_state && (
                        <div className="bg-card border border-border rounded-xl p-4">
                            <h3 className="font-medium mb-2 text-sm md:text-base">Input State</h3>
                            <pre className="text-xs bg-background p-3 rounded-lg overflow-auto max-h-48 break-all whitespace-pre-wrap">
                                {JSON.stringify(run.input_state, null, 2)}
                            </pre>
                        </div>
                    )}
                    {run.output_state && (
                        <div className="bg-card border border-border rounded-xl p-4">
                            <h3 className="font-medium mb-2 text-sm md:text-base">Output State</h3>
                            <pre className="text-xs bg-background p-3 rounded-lg overflow-auto max-h-48 break-all whitespace-pre-wrap">
                                {JSON.stringify(run.output_state, null, 2)}
                            </pre>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
