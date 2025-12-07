import { Link } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { Activity, ArrowRight, Bot, CheckCircle, XCircle, AlertCircle, Clock, Zap } from 'lucide-react'

interface Run {
    id: string
    graph_id: string | null
    framework: string
    status: string
    started_at: string
    total_tokens: number
    total_latency_ms: number
    node_count: number
    error: string | null
}

interface RecentRunsWidgetProps {
    runs: Run[]
    loading: boolean
}

export default function RecentRunsWidget({ runs, loading }: RecentRunsWidgetProps) {
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
        <div className="h-full flex flex-col bg-card rounded-xl border border-border overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex-shrink-0">
                <h3 className="font-semibold text-sm">Recent Runs</h3>
            </div>
            <div className="flex-1 overflow-auto divide-y divide-border">
                {loading ? (
                    <div className="p-4 text-center text-muted-foreground text-sm">
                        <Activity className="w-5 h-5 animate-spin mx-auto mb-2" />
                        Loading...
                    </div>
                ) : runs.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground text-sm">
                        <Bot className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        No runs yet
                    </div>
                ) : (
                    runs.slice(0, 10).map(run => (
                        <Link
                            key={run.id}
                            to={`/runs/${run.id}`}
                            className="flex items-center justify-between p-3 hover:bg-accent/50 transition-colors group"
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                    {getStatusIcon(run.status)}
                                </div>
                                <div className="min-w-0">
                                    <div className="font-medium text-sm flex items-center gap-2">
                                        <span className="truncate">{run.graph_id || 'Unnamed'}</span>
                                        <span className="text-[10px] px-1.5 py-0.5 bg-accent rounded-full text-muted-foreground flex-shrink-0">
                                            {run.framework}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                        <span className="flex items-center gap-0.5">
                                            <Activity className="w-2.5 h-2.5" />
                                            {run.node_count}
                                        </span>
                                        <span className="flex items-center gap-0.5">
                                            <Zap className="w-2.5 h-2.5" />
                                            {run.total_tokens}
                                        </span>
                                        <span className="flex items-center gap-0.5">
                                            <Clock className="w-2.5 h-2.5" />
                                            {run.total_latency_ms}ms
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                                <span className="text-[10px] text-muted-foreground hidden sm:block">
                                    {formatDistanceToNow(new Date(run.started_at), { addSuffix: true })}
                                </span>
                                <ArrowRight className="w-3 h-3 text-muted-foreground group-hover:text-primary" />
                            </div>
                        </Link>
                    ))
                )}
            </div>
        </div>
    )
}
