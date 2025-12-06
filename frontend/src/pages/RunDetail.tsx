import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import axios from 'axios'
import { ArrowLeft, Clock, Zap, DollarSign, CheckCircle, XCircle, ChevronDown, ChevronRight, MessageSquare, GitBranch } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
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

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-muted-foreground">Loading run details...</div>
            </div>
        )
    }

    if (!run) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-muted-foreground">Run not found</div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link to="/" className="p-2 hover:bg-accent rounded-lg transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h2 className="text-2xl font-bold">{run.graph_id || 'Workflow Run'}</h2>
                    <p className="text-sm text-muted-foreground font-mono">{run.id}</p>
                </div>
                <div className="ml-auto flex items-center gap-2">
                    {run.status === 'completed' ? (
                        <span className="flex items-center gap-1 text-green-500 text-sm">
                            <CheckCircle className="w-4 h-4" /> Completed
                        </span>
                    ) : run.status === 'failed' ? (
                        <span className="flex items-center gap-1 text-red-500 text-sm">
                            <XCircle className="w-4 h-4" /> Failed
                        </span>
                    ) : (
                        <span className="flex items-center gap-1 text-blue-500 text-sm">
                            <Clock className="w-4 h-4" /> Running
                        </span>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-lg bg-card border border-border">
                    <div className="text-xs text-muted-foreground mb-1">Framework</div>
                    <div className="font-medium">{run.framework}</div>
                </div>
                <div className="p-4 rounded-lg bg-card border border-border">
                    <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Latency
                    </div>
                    <div className="font-medium">{run.total_latency_ms}ms</div>
                </div>
                <div className="p-4 rounded-lg bg-card border border-border">
                    <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                        <Zap className="w-3 h-3" /> Tokens
                    </div>
                    <div className="font-medium">{run.total_tokens.toLocaleString()}</div>
                </div>
                <div className="p-4 rounded-lg bg-card border border-border">
                    <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                        <DollarSign className="w-3 h-3" /> Cost
                    </div>
                    <div className="font-medium">${run.total_cost.toFixed(4)}</div>
                </div>
            </div>

            {run.error && (
                <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500">
                    <div className="font-medium mb-1">Error</div>
                    <div className="text-sm font-mono">{run.error}</div>
                </div>
            )}

            <div className="flex gap-2 border-b border-border">
                <button
                    onClick={() => setActiveTab('timeline')}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                        activeTab === 'timeline'
                            ? 'text-primary border-b-2 border-primary'
                            : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                    Timeline View
                </button>
                <button
                    onClick={() => setActiveTab('graph')}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                        activeTab === 'graph'
                            ? 'text-primary border-b-2 border-primary'
                            : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                    Graph View
                </button>
            </div>

            {activeTab === 'timeline' && (
                <div className="space-y-4">
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
                                className="w-full p-4 flex items-center justify-between hover:bg-accent/50 transition-colors"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">
                                        {index + 1}
                                    </div>
                                    <div className="text-left">
                                        <div className="font-medium flex items-center gap-2">
                                            {node.node_key}
                                            {node.node_type && (
                                                <span className="text-xs px-2 py-0.5 bg-accent rounded text-muted-foreground">
                                                    {node.node_type}
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-xs text-muted-foreground flex items-center gap-3">
                                            {node.latency_ms && <span>{node.latency_ms}ms</span>}
                                            <span>{node.messages.length} messages</span>
                                            {node.status === 'failed' && (
                                                <span className="text-red-500">Failed</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                {expandedNodes.has(node.id) ? (
                                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                                ) : (
                                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                                )}
                            </button>

                            <AnimatePresence>
                                {expandedNodes.has(node.id) && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="border-t border-border"
                                    >
                                        <div className="p-4 space-y-4">
                                            {node.state_diff && (
                                                <div className="space-y-2">
                                                    <h4 className="text-sm font-medium text-muted-foreground">State Changes</h4>
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                        {Object.keys(node.state_diff.added).length > 0 && (
                                                            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                                                                <div className="text-xs font-medium text-green-500 mb-2">Added</div>
                                                                <pre className="text-xs overflow-auto max-h-32">
                                                                    {JSON.stringify(node.state_diff.added, null, 2)}
                                                                </pre>
                                                            </div>
                                                        )}
                                                        {Object.keys(node.state_diff.removed).length > 0 && (
                                                            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                                                                <div className="text-xs font-medium text-red-500 mb-2">Removed</div>
                                                                <pre className="text-xs overflow-auto max-h-32">
                                                                    {JSON.stringify(node.state_diff.removed, null, 2)}
                                                                </pre>
                                                            </div>
                                                        )}
                                                        {Object.keys(node.state_diff.modified).length > 0 && (
                                                            <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                                                                <div className="text-xs font-medium text-yellow-500 mb-2">Modified</div>
                                                                <pre className="text-xs overflow-auto max-h-32">
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
                                                                <div className="flex items-center justify-between mb-2">
                                                                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                                                        {msg.role}
                                                                    </span>
                                                                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                                                        {msg.model && <span>{msg.model}</span>}
                                                                        {msg.total_tokens && <span>{msg.total_tokens} tokens</span>}
                                                                        {msg.latency_ms && <span>{msg.latency_ms}ms</span>}
                                                                    </div>
                                                                </div>
                                                                <div className="text-sm whitespace-pre-wrap">
                                                                    {msg.content || (msg.tool_calls ? (
                                                                        <div className="space-y-1">
                                                                            {msg.tool_calls.map((tc, i) => (
                                                                                <div key={i} className="font-mono text-xs bg-background/50 p-2 rounded">
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
                                                    <div className="text-sm font-mono text-red-400">{node.error}</div>
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
                <div className="bg-card border border-border rounded-xl p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <GitBranch className="w-5 h-5 text-primary" />
                        <h3 className="font-medium">Workflow Graph</h3>
                    </div>
                    <div className="flex flex-wrap items-center gap-4">
                        {run.nodes.map((node, index) => (
                            <div key={node.id} className="flex items-center gap-2">
                                <div
                                    className={`px-4 py-2 rounded-lg border-2 ${
                                        node.status === 'failed'
                                            ? 'border-red-500 bg-red-500/10'
                                            : 'border-primary bg-primary/10'
                                    }`}
                                >
                                    <div className="font-medium text-sm">{node.node_key}</div>
                                    <div className="text-xs text-muted-foreground">{node.latency_ms}ms</div>
                                </div>
                                {index < run.nodes.length - 1 && (
                                    <div className="flex items-center">
                                        <div className="w-8 h-0.5 bg-border"></div>
                                        <div className="w-0 h-0 border-t-4 border-b-4 border-l-4 border-transparent border-l-border"></div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                    {run.edges.length > 0 && (
                        <div className="mt-6 pt-4 border-t border-border">
                            <h4 className="text-sm font-medium text-muted-foreground mb-2">Transitions</h4>
                            <div className="flex flex-wrap gap-2">
                                {run.edges.map((edge) => (
                                    <div key={edge.id} className="text-xs bg-accent px-2 py-1 rounded">
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {run.input_state && (
                        <div className="bg-card border border-border rounded-xl p-4">
                            <h3 className="font-medium mb-2">Input State</h3>
                            <pre className="text-xs bg-background p-3 rounded-lg overflow-auto max-h-48">
                                {JSON.stringify(run.input_state, null, 2)}
                            </pre>
                        </div>
                    )}
                    {run.output_state && (
                        <div className="bg-card border border-border rounded-xl p-4">
                            <h3 className="font-medium mb-2">Output State</h3>
                            <pre className="text-xs bg-background p-3 rounded-lg overflow-auto max-h-48">
                                {JSON.stringify(run.output_state, null, 2)}
                            </pre>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
