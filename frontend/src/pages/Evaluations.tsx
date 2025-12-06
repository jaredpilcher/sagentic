import { useEffect, useState } from 'react'
import axios from 'axios'
import { MessageSquare, ThumbsUp, ThumbsDown, Star } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { Link } from 'react-router-dom'

interface Run {
    id: string
    graph_id: string | null
    framework: string
    status: string
    started_at: string
    total_tokens: number
    node_count: number
}

interface Evaluation {
    id: string
    run_id: string
    evaluator: string | null
    score: number | null
    label: string | null
    comment: string | null
    is_automated: boolean
    created_at: string
}

export default function Evaluations() {
    const [runs, setRuns] = useState<Run[]>([])
    const [selectedRun, setSelectedRun] = useState<string | null>(null)
    const [evaluations, setEvaluations] = useState<Evaluation[]>([])
    const [loading, setLoading] = useState(true)
    const [score, setScore] = useState<number | null>(null)
    const [comment, setComment] = useState('')
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        axios.get('/api/runs', { params: { limit: 50 } })
            .then(res => setRuns(res.data))
            .catch(err => console.error(err))
            .finally(() => setLoading(false))
    }, [])

    useEffect(() => {
        if (selectedRun) {
            axios.get(`/api/runs/${selectedRun}/evaluations`)
                .then(res => setEvaluations(res.data))
                .catch(err => console.error(err))
        }
    }, [selectedRun])

    const submitEvaluation = async (value: number) => {
        if (!selectedRun) return
        setSubmitting(true)
        try {
            await axios.post('/api/evaluations', {
                run_id: selectedRun,
                score: value,
                comment: comment || null,
                label: value >= 0.5 ? 'positive' : 'negative',
                evaluator: 'user'
            })
            setScore(value)
            const res = await axios.get(`/api/runs/${selectedRun}/evaluations`)
            setEvaluations(res.data)
            setComment('')
        } catch (err) {
            console.error(err)
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="space-y-6">
            <header>
                <h2 className="text-3xl font-bold tracking-tight">Evaluations</h2>
                <p className="text-muted-foreground mt-2">Provide feedback on workflow executions to track quality.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1 bg-card border border-border rounded-xl overflow-hidden">
                    <div className="p-4 border-b border-border">
                        <h3 className="font-semibold">Select a Run</h3>
                    </div>
                    <div className="divide-y divide-border max-h-[600px] overflow-y-auto">
                        {loading ? (
                            <div className="p-4 text-center text-muted-foreground">Loading...</div>
                        ) : runs.length === 0 ? (
                            <div className="p-4 text-center text-muted-foreground">No runs available</div>
                        ) : (
                            runs.map(run => (
                                <button
                                    key={run.id}
                                    onClick={() => setSelectedRun(run.id)}
                                    className={`w-full p-4 text-left hover:bg-accent/50 transition-colors ${
                                        selectedRun === run.id ? 'bg-primary/10' : ''
                                    }`}
                                >
                                    <div className="font-medium text-sm">{run.graph_id || 'Unnamed'}</div>
                                    <div className="text-xs text-muted-foreground font-mono">{run.id.slice(0, 12)}...</div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                        {formatDistanceToNow(new Date(run.started_at), { addSuffix: true })}
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                <div className="md:col-span-2 space-y-6">
                    {selectedRun ? (
                        <>
                            <div className="bg-card border border-border rounded-xl p-6">
                                <h3 className="font-semibold mb-4 flex items-center gap-2">
                                    <Star className="w-5 h-5 text-primary" />
                                    Add Evaluation
                                </h3>
                                <div className="space-y-4">
                                    <textarea
                                        value={comment}
                                        onChange={(e) => setComment(e.target.value)}
                                        placeholder="Optional comment about this run..."
                                        className="w-full p-3 bg-accent/50 border border-border rounded-lg text-sm resize-none h-24 focus:ring-2 focus:ring-primary/50 outline-none"
                                    />
                                    <div className="flex gap-4">
                                        <button
                                            onClick={() => submitEvaluation(1.0)}
                                            disabled={submitting}
                                            className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-colors ${
                                                score === 1.0
                                                    ? 'bg-green-500/20 text-green-500 border border-green-500/30'
                                                    : 'bg-green-500/10 text-green-500 border border-green-500/20 hover:bg-green-500/20'
                                            }`}
                                        >
                                            <ThumbsUp className="w-5 h-5" />
                                            Good
                                        </button>
                                        <button
                                            onClick={() => submitEvaluation(0.0)}
                                            disabled={submitting}
                                            className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-colors ${
                                                score === 0.0
                                                    ? 'bg-red-500/20 text-red-500 border border-red-500/30'
                                                    : 'bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20'
                                            }`}
                                        >
                                            <ThumbsDown className="w-5 h-5" />
                                            Bad
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-card border border-border rounded-xl overflow-hidden">
                                <div className="p-4 border-b border-border flex items-center justify-between">
                                    <h3 className="font-semibold flex items-center gap-2">
                                        <MessageSquare className="w-5 h-5" />
                                        Evaluation History
                                    </h3>
                                    <Link
                                        to={`/runs/${selectedRun}`}
                                        className="text-sm text-primary hover:underline"
                                    >
                                        View Run Details
                                    </Link>
                                </div>
                                <div className="divide-y divide-border">
                                    {evaluations.length === 0 ? (
                                        <div className="p-8 text-center text-muted-foreground">
                                            No evaluations yet for this run.
                                        </div>
                                    ) : (
                                        evaluations.map(evaluation => (
                                            <div key={evaluation.id} className="p-4 flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    {evaluation.score !== null && evaluation.score >= 0.5 ? (
                                                        <ThumbsUp className="w-5 h-5 text-green-500" />
                                                    ) : (
                                                        <ThumbsDown className="w-5 h-5 text-red-500" />
                                                    )}
                                                    <div>
                                                        <div className="font-medium text-sm">
                                                            {evaluation.label || 'Feedback'}
                                                        </div>
                                                        {evaluation.comment && (
                                                            <div className="text-sm text-muted-foreground">{evaluation.comment}</div>
                                                        )}
                                                        <div className="text-xs text-muted-foreground">
                                                            {formatDistanceToNow(new Date(evaluation.created_at), { addSuffix: true })}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-mono font-bold text-lg">
                                                        {evaluation.score !== null ? evaluation.score.toFixed(1) : '-'}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {evaluation.is_automated ? 'Automated' : 'Manual'}
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="bg-card border border-border rounded-xl p-12 text-center">
                            <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-lg font-medium mb-2">Select a Run to Evaluate</h3>
                            <p className="text-muted-foreground">
                                Choose a workflow run from the left to add evaluations and feedback.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
