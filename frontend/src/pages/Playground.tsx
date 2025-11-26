import { useState } from 'react'
import axios from 'axios'
import { Play, Zap, ExternalLink } from 'lucide-react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'

export default function Playground() {
    const [prompt, setPrompt] = useState('')
    const [model, setModel] = useState('gpt-4')
    const [response, setResponse] = useState('')
    const [lastRunId, setLastRunId] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    const handleRun = async () => {
        if (!prompt) return
        setLoading(true)
        setResponse("") // Clear previous response
        setLastRunId(null) // Clear previous run ID
        try {
            const res = await axios.post('http://localhost:3000/api/playground/run', {
                prompt,
                model
            })
            setResponse(res.data.response)
            if (res.data.run_id) {
                setLastRunId(res.data.run_id)
            }
        } catch (err) {
            console.error(err)
            setResponse("Error running prompt")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="h-[calc(100vh-8rem)] flex flex-col gap-6">
            <header className="flex justify-between items-center shrink-0">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Playground</h2>
                    <p className="text-muted-foreground mt-1">Test prompts and experiment with models.</p>
                </div>
                <div className="flex gap-2">
                    <select
                        value={model}
                        onChange={e => setModel(e.target.value)}
                        className="bg-card border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50"
                    >
                        <option value="gpt-4">GPT-4</option>
                        <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                        <option value="claude-3-opus">Claude 3 Opus</option>
                    </select>
                    <button
                        onClick={handleRun}
                        disabled={loading || !prompt}
                        className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                        {loading ? <Zap className="w-4 h-4 animate-pulse" /> : <Play className="w-4 h-4" />}
                        Run
                    </button>
                </div>
            </header>

            <div className="flex-1 flex gap-6 min-h-0">
                {/* Input Area */}
                <div className="flex-1 flex flex-col gap-2">
                    <label className="text-sm font-medium text-muted-foreground">Prompt</label>
                    <textarea
                        value={prompt}
                        onChange={e => setPrompt(e.target.value)}
                        placeholder="Enter your prompt here... Use {{variable}} for templates."
                        className="flex-1 bg-card border border-border rounded-xl p-4 font-mono text-sm outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                    />
                </div>

                {/* Output Area */}
                <div className="flex-1 flex flex-col gap-2">
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-sm font-medium text-muted-foreground">Response</label>
                        {lastRunId && (
                            <Link
                                to={`/runs/${lastRunId}`}
                                className="flex items-center gap-1 text-xs text-primary hover:underline"
                            >
                                View Trace <ExternalLink className="w-3 h-3" />
                            </Link>
                        )}
                    </div>
                    <div className="flex-1 bg-card border border-border rounded-xl p-4 font-mono text-sm overflow-y-auto relative">
                        {loading ? (
                            <div className="absolute inset-0 flex items-center justify-center bg-card/50 backdrop-blur-sm">
                                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                    <Zap className="w-8 h-8 animate-bounce text-primary" />
                                    <span>Generating...</span>
                                </div>
                            </div>
                        ) : response ? (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="space-y-4"
                            >
                                <div className="whitespace-pre-wrap">{response.response}</div>
                                <div className="pt-4 border-t border-border flex gap-4 text-xs text-muted-foreground">
                                    <span>Latency: {response.latency_ms}ms</span>
                                    <span>Tokens: {response.tokens}</span>
                                    <span>Model: {response.model}</span>
                                </div>
                            </motion.div>
                        ) : (
                            <div className="h-full flex items-center justify-center text-muted-foreground/50">
                                Run a prompt to see the output
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
