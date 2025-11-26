import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ArrowRight, BarChart2, GitCompare } from 'lucide-react'

export default function Compare() {
    const [searchParams] = useSearchParams()
    const baseRunId = searchParams.get('base')
    const candidateRunId = searchParams.get('candidate')

    const [metrics] = useState({
        latency_diff: -150,
        score_diff: 0.2,
        cost_diff: 0.002
    })

    return (
        <div className="space-y-8">
            <header>
                <div className="flex items-center gap-3 text-muted-foreground mb-2">
                    <GitCompare className="w-5 h-5" />
                    <span className="text-sm font-medium uppercase tracking-wider">Comparison</span>
                </div>
                <h2 className="text-3xl font-bold tracking-tight">Run Comparison</h2>
                <div className="flex items-center gap-4 mt-4 text-sm font-mono bg-muted/30 p-4 rounded-lg border border-border w-fit">
                    <div className="text-muted-foreground">{baseRunId || 'Select Base Run'}</div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    <div className="text-primary font-semibold">{candidateRunId || 'Select Candidate Run'}</div>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <MetricCard
                    title="Latency Change"
                    value={`${metrics.latency_diff}ms`}
                    trend="good"
                    description="Faster response time"
                />
                <MetricCard
                    title="Score Improvement"
                    value={`+${metrics.score_diff}`}
                    trend="good"
                    description="Higher quality score"
                />
                <MetricCard
                    title="Cost Increase"
                    value={`+$${metrics.cost_diff}`}
                    trend="bad"
                    description="Slightly higher cost"
                />
            </div>

            <div className="bg-card border border-border rounded-xl p-6">
                <h3 className="font-semibold mb-6 flex items-center gap-2">
                    <BarChart2 className="w-4 h-4 text-primary" />
                    Detailed Metrics
                </h3>
                <div className="h-64 flex items-center justify-center text-muted-foreground bg-muted/10 rounded-lg border border-dashed border-border">
                    Chart placeholder (Recharts implementation)
                </div>
            </div>
        </div>
    )
}

function MetricCard({ title, value, trend, description }: { title: string; value: string; trend: 'good' | 'bad' | 'neutral'; description: string }) {
    const colors = {
        good: 'text-green-500',
        bad: 'text-red-500',
        neutral: 'text-muted-foreground'
    }

    return (
        <div className="p-6 rounded-xl bg-card border border-border shadow-sm">
            <div className="text-sm font-medium text-muted-foreground mb-2">{title}</div>
            <div className={`text-3xl font-bold mb-1 ${colors[trend]}`}>{value}</div>
            <div className="text-xs text-muted-foreground">{description}</div>
        </div>
    )
}
