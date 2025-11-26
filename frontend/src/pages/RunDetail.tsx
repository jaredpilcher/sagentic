import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'
import { format } from 'date-fns'
import { Bot, User, Terminal, Cpu, Layers, Activity, ThumbsUp, ThumbsDown, MessageSquare } from 'lucide-react'
import { cn } from '../lib/utils'
import TraceView from '../components/TraceView'

interface Step {
    id: string
    role: string
    timestamp: string
}

interface StepDetail extends Step {
    prompt: {
        user?: string
        system?: string
        assistant_context?: string
        tools_trace?: any[]
    }
    response?: string
    metadata?: any
    analyses?: any[]
}

interface Span {
    span_id: string
    trace_id: string
    parent_id: string | null
    name: string
    start_time: string
    end_time: string | null
    span_kind: 'AGENT' | 'LLM' | 'TOOL' | 'CHAIN'
    attributes: any
    status_code: 'OK' | 'ERROR'
}

interface Score {
    score_id: string
    trace_id: string
    name: string
    value: number // Changed from float to number for TypeScript
    comment?: string
    timestamp: string
}

export default function RunDetail() {
    const { runId } = useParams()
    const [activeTab, setActiveTab] = useState<'timeline' | 'trace' | 'evals'>('timeline')

    const [steps, setSteps] = useState<Step[]>([])
    const [selectedStepId, setSelectedStepId] = useState<string | null>(null)
    const [stepDetail, setStepDetail] = useState<StepDetail | null>(null)

    const [spans, setSpans] = useState<Span[]>([])
    const [scores, setScores] = useState<Score[]>([])

    const fetchScores = () => {
        axios.get(`http://localhost:3000/api/runs/${runId}/scores`)
            .then(res => setScores(res.data))
            .catch(err => console.log("Error fetching scores", err))
    }

    useEffect(() => {
        axios.get(`http://localhost:3000/api/runs/${runId}/steps`)
            .then(res => {
                setSteps(res.data)
                if (res.data.length > 0) setSelectedStepId(res.data[0].id)
            })

        axios.get(`http://localhost:3000/api/runs/${runId}/spans`)
            .then(res => setSpans(res.data))
            .catch(err => console.log("No spans found or error fetching spans"))

        fetchScores()
    }, [runId])

    useEffect(() => {
        if (selectedStepId && activeTab === 'timeline') {
            axios.get(`http://localhost:3000/api/steps/${selectedStepId}`)
                .then(res => setStepDetail(res.data))
        }
    }, [selectedStepId, activeTab])

    const submitScore = (name: string, value: number) => {
        const scoreId = crypto.randomUUID()
        axios.post('http://localhost:3000/api/scores', {
            score_id: scoreId,
            trace_id: runId,
            name: name,
            value: value,
            timestamp: new Date().toISOString()
        }).then(() => {
            fetchScores()
        })
    }

    return (
        <div className="h-[calc(100vh-8rem)] flex flex-col gap-4">
            {/* Tab Switcher */}
            <div className="flex gap-2 border-b border-border pb-2">
                <button
                    onClick={() => setActiveTab('timeline')}
                    className={cn(
                        "px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2",
                        activeTab === 'timeline' ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent"
                    )}
                >
                    <Activity className="w-4 h-4" />
                    Timeline
                </button>
                <button
                    onClick={() => setActiveTab('trace')}
                    className={cn(
                        "px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2",
                        activeTab === 'trace' ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent"
                    )}
                >
                    <Layers className="w-4 h-4" />
                    Trace View
                </button>
                <button
                    onClick={() => setActiveTab('evals')}
                    className={cn(
                        "px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2",
                        activeTab === 'evals' ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent"
                    )}
                >
                    <MessageSquare className="w-4 h-4" />
                    Evaluations
                </button>
            </div>

            {activeTab === 'trace' ? (
                <div className="flex-1 bg-card border border-border rounded-xl p-6 overflow-y-auto">
                    <TraceView spans={spans} />
                </div>
            ) : activeTab === 'evals' ? (
                <div className="flex-1 bg-card border border-border rounded-xl p-6 overflow-y-auto">
                    <div className="max-w-2xl mx-auto space-y-8">
                        <div className="bg-muted/30 p-6 rounded-xl border border-border">
                            <h3 className="text-lg font-semibold mb-4">Add Evaluation</h3>
                            <div className="flex gap-4">
                                <button
                                    onClick={() => submitScore('user_feedback', 1.0)}
                                    className="flex items-center gap-2 px-4 py-2 bg-green-500/10 text-green-500 border border-green-500/20 rounded-md hover:bg-green-500/20 transition-colors"
                                >
                                    <ThumbsUp className="w-4 h-4" />
                                    Thumbs Up
                                </button>
                                <button
                                    onClick={() => submitScore('user_feedback', 0.0)}
                                    className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded-md hover:bg-red-500/20 transition-colors"
                                >
                                    <ThumbsDown className="w-4 h-4" />
                                    Thumbs Down
                                </button>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold mb-4">Score History</h3>
                            <div className="space-y-3">
                                {scores.length === 0 ? (
                                    <div className="text-muted-foreground text-sm">No evaluations yet.</div>
                                ) : (
                                    scores.map(score => (
                                        <div key={score.score_id} className="flex items-center justify-between p-4 bg-card border border-border rounded-lg">
                                            <div className="flex items-center gap-3">
                                                {score.name === 'user_feedback' && (
                                                    score.value === 1.0 ? <ThumbsUp className="w-5 h-5 text-green-500" /> : <ThumbsDown className="w-5 h-5 text-red-500" />
                                                )}
                                                <div>
                                                    <div className="font-medium">{score.name}</div>
                                                    <div className="text-xs text-muted-foreground">{format(new Date(score.timestamp), 'PPpp')}</div>
                                                </div>
                                            </div>
                                            <div className="font-mono font-semibold text-lg">{score.value}</div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex gap-6 overflow-hidden">
                    {/* Timeline Sidebar */}
                    <div className="w-1/3 bg-card border border-border rounded-xl overflow-hidden flex flex-col">
                        <div className="p-4 border-b border-border bg-muted/30">
                            <h3 className="font-semibold">Run Timeline</h3>
                            <p className="text-xs text-muted-foreground font-mono mt-1">{runId}</p>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-2">
                            {steps.map((step) => (
                                <button
                                    key={step.id}
                                    onClick={() => setSelectedStepId(step.id)}
                                    className={cn(
                                        "w-full text-left p-3 rounded-lg text-sm transition-all border border-transparent",
                                        selectedStepId === step.id
                                            ? "bg-primary/10 border-primary/20 shadow-sm"
                                            : "hover:bg-accent/50"
                                    )}
                                >
                                    <div className="flex items-center gap-3 mb-2">
                                        <Badge role={step.role} />
                                        <span className="text-xs text-muted-foreground ml-auto">
                                            {format(new Date(step.timestamp), 'HH:mm:ss')}
                                        </span>
                                    </div>
                                    <div className="text-xs text-muted-foreground font-mono truncate">
                                        {step.id}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Detail View */}
                    <div className="flex-1 bg-card border border-border rounded-xl overflow-hidden flex flex-col">
                        {stepDetail ? (
                            <div className="flex-1 overflow-y-auto">
                                {/* Header */}
                                <div className="p-6 border-b border-border bg-muted/10">
                                    <div className="flex items-center justify-between mb-4">
                                        <Badge role={stepDetail.role} size="lg" />
                                        <div className="text-sm text-muted-foreground font-mono">{stepDetail.timestamp}</div>
                                    </div>

                                    {/* Analysis Stats */}
                                    {stepDetail.analyses && stepDetail.analyses.length > 0 && (
                                        <div className="flex gap-4 mt-4">
                                            {stepDetail.analyses.map((analysis, i) => (
                                                <div key={i} className="bg-background/50 border border-border rounded px-3 py-2 text-xs">
                                                    <div className="font-semibold text-primary mb-1">{analysis.engine_id}</div>
                                                    <div className="text-muted-foreground">{analysis.summary}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Content */}
                                <div className="p-6 space-y-8">
                                    {/* Prompt Section */}
                                    <Section title="Prompt" icon={Terminal}>
                                        {stepDetail.prompt.system && (
                                            <div className="mb-4">
                                                <div className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">System</div>
                                                <div className="bg-muted/30 p-3 rounded-md text-sm font-mono whitespace-pre-wrap">{stepDetail.prompt.system}</div>
                                            </div>
                                        )}
                                        {stepDetail.prompt.user && (
                                            <div>
                                                <div className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">User</div>
                                                <div className="bg-muted/30 p-3 rounded-md text-sm whitespace-pre-wrap">{stepDetail.prompt.user}</div>
                                            </div>
                                        )}
                                    </Section>

                                    {/* Response Section */}
                                    {stepDetail.response && (
                                        <Section title="Response" icon={Bot}>
                                            <div className="bg-muted/30 p-4 rounded-md text-sm whitespace-pre-wrap leading-relaxed">
                                                {stepDetail.response}
                                            </div>
                                        </Section>
                                    )}

                                    {/* Tools Section */}
                                    {stepDetail.prompt.tools_trace && stepDetail.prompt.tools_trace.length > 0 && (
                                        <Section title="Tool Usage" icon={Cpu}>
                                            <div className="space-y-3">
                                                {stepDetail.prompt.tools_trace.map((tool, i) => (
                                                    <div key={i} className="border border-border rounded-md overflow-hidden">
                                                        <div className="bg-muted/50 px-3 py-2 text-xs font-mono border-b border-border flex justify-between">
                                                            <span className="font-semibold">{tool.tool_name}</span>
                                                            <span className="text-muted-foreground">Duration: {tool.duration_ms}ms</span>
                                                        </div>
                                                        <div className="p-3 text-xs space-y-2">
                                                            <div>
                                                                <span className="text-muted-foreground">Input:</span>
                                                                <pre className="mt-1 overflow-x-auto">{JSON.stringify(tool.input, null, 2)}</pre>
                                                            </div>
                                                            <div>
                                                                <span className="text-muted-foreground">Output:</span>
                                                                <pre className="mt-1 overflow-x-auto text-primary">{JSON.stringify(tool.output, null, 2)}</pre>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </Section>
                                    )}

                                    {/* Metadata Section */}
                                    {stepDetail.metadata && Object.keys(stepDetail.metadata).length > 0 && (
                                        <Section title="Metadata" icon={Activity}>
                                            <div className="grid grid-cols-2 gap-4">
                                                {Object.entries(stepDetail.metadata).map(([key, value]) => (
                                                    <div key={key} className="bg-muted/30 p-3 rounded-md">
                                                        <div className="text-xs text-muted-foreground mb-1">{key}</div>
                                                        <div className="text-sm font-mono truncate">{String(value)}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </Section>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-muted-foreground">
                                Select a step to view details
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

function Badge({ role, size = 'sm' }: { role: string; size?: 'sm' | 'lg' }) {
    const colors = {
        user: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
        assistant: 'bg-green-500/10 text-green-500 border-green-500/20',
        system: 'bg-orange-500/10 text-orange-500 border-orange-500/20'
    }

    const icons = {
        user: User,
        assistant: Bot,
        system: Terminal
    }

    const Icon = icons[role as keyof typeof icons] || Activity

    return (
        <span className={cn(
            "inline-flex items-center gap-1.5 rounded-full border font-medium capitalize",
            colors[role as keyof typeof colors] || "bg-gray-500/10 text-gray-500",
            size === 'sm' ? "px-2.5 py-0.5 text-xs" : "px-3 py-1 text-sm"
        )}>
            <Icon className={size === 'sm' ? "w-3 h-3" : "w-4 h-4"} />
            {role}
        </span>
    )
}

function Section({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
    return (
        <div>
            <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-foreground/80">
                <Icon className="w-4 h-4 text-primary" />
                {title}
            </div>
            {children}
        </div>
    )
}


function CodeBlock({ content }: { content: string; language?: string }) {
    return (
        <div className="bg-muted/50 rounded-lg p-4 font-mono text-sm overflow-x-auto border border-border/50">
            <pre className="whitespace-pre-wrap break-words">{content}</pre>
        </div>
    )
}
