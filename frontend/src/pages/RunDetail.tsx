
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'
import { format } from 'date-fns'
import { Bot, User, Terminal, Cpu } from 'lucide-react'
import { cn } from '../lib/utils'

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

export default function RunDetail() {
    const { runId } = useParams()
    const [steps, setSteps] = useState<Step[]>([])
    const [selectedStepId, setSelectedStepId] = useState<string | null>(null)
    const [stepDetail, setStepDetail] = useState<StepDetail | null>(null)

    useEffect(() => {
        axios.get(`http://localhost:3000/api/runs/${runId}/steps`)
            .then(res => {
                setSteps(res.data)
                if (res.data.length > 0) setSelectedStepId(res.data[0].id)
            })
    }, [runId])

    useEffect(() => {
        if (selectedStepId) {
            axios.get(`http://localhost:3000/api/steps/${selectedStepId}`)
                .then(res => setStepDetail(res.data))
        }
    }, [selectedStepId])

    return (
        <div className="h-[calc(100vh-8rem)] flex gap-6">
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
                                        <CodeBlock content={stepDetail.prompt.system} />
                                    </div>
                                )}
                                {stepDetail.prompt.user && (
                                    <div>
                                        <div className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">User</div>
                                        <CodeBlock content={stepDetail.prompt.user} />
                                    </div>
                                )}
                                {stepDetail.prompt.tools_trace && stepDetail.prompt.tools_trace.length > 0 && (
                                    <div className="mt-4">
                                        <div className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Tool Usage</div>
                                        <div className="space-y-2">
                                            {stepDetail.prompt.tools_trace.map((trace, i) => (
                                                <div key={i} className="bg-accent/30 rounded p-3 border border-border/50">
                                                    <div className="font-mono text-sm text-blue-400 mb-1">{trace.name}</div>
                                                    <pre className="text-xs text-muted-foreground overflow-x-auto">{JSON.stringify(trace.args, null, 2)}</pre>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </Section>

                            {/* Response Section */}
                            {stepDetail.response && (
                                <Section title="Response" icon={Bot}>
                                    <CodeBlock content={stepDetail.response} />
                                </Section>
                            )}

                            {/* Metadata Section */}
                            {stepDetail.metadata && Object.keys(stepDetail.metadata).length > 0 && (
                                <Section title="Metadata" icon={Cpu}>
                                    <CodeBlock content={JSON.stringify(stepDetail.metadata, null, 2)} language="json" />
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
    )
}

function Badge({ role, size = "sm" }: { role: string; size?: "sm" | "lg" }) {
    const isUser = role === 'user'
    const Icon = isUser ? User : Bot

    return (
        <div className={cn(
            "inline-flex items-center gap-2 rounded-full font-medium capitalize",
            isUser ? "bg-blue-500/10 text-blue-400" : "bg-purple-500/10 text-purple-400",
            size === "sm" ? "px-2.5 py-0.5 text-xs" : "px-4 py-1.5 text-sm"
        )}>
            <Icon className={size === "sm" ? "w-3 h-3" : "w-4 h-4"} />
            {role}
        </div>
    )
}

function Section({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
    return (
        <div>
            <div className="flex items-center gap-2 mb-3 text-foreground font-medium">
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
