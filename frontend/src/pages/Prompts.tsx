import { useEffect, useState } from 'react'
import axios from 'axios'
import { formatDistanceToNow } from 'date-fns'
import { Plus, Terminal } from 'lucide-react'
import { motion } from 'framer-motion'

interface Prompt {
    id: string
    name: string
    version: number
    template: string
    input_variables: string[]
    created_at: string
    label?: string
}

export default function Prompts() {
    const [prompts, setPrompts] = useState<Prompt[]>([])
    const [loading, setLoading] = useState(true)
    const [showNew, setShowNew] = useState(false)

    // New Prompt State
    const [newName, setNewName] = useState('')
    const [newTemplate, setNewTemplate] = useState('')

    const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null)
    const [history, setHistory] = useState<Prompt[]>([])
    const [showHistory, setShowHistory] = useState(false)

    useEffect(() => {
        fetchPrompts()
    }, [])

    const fetchPrompts = () => {
        setLoading(true)
        axios.get('http://localhost:3000/api/prompts')
            .then(res => setPrompts(res.data))
            .catch(err => console.error(err))
            .finally(() => setLoading(false))
    }

    const fetchHistory = (name: string) => {
        axios.get(`http://localhost:3000/api/prompts/${name}/history`)
            .then(res => {
                setHistory(res.data)
                setShowHistory(true)
            })
            .catch(err => console.error(err))
    }

    const handlePromote = (name: string, version: number) => {
        axios.post(`http://localhost:3000/api/prompts/${name}/promote`, { version, label: 'production' })
            .then(() => {
                fetchHistory(name) // Refresh history
                // Refresh main list
                axios.get('http://localhost:3000/api/prompts').then(res => setPrompts(res.data))
            })
            .catch(err => console.error(err))
    }

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            // Extract variables from template (simple regex for {var})
            const variables = (newTemplate.match(/\{([^}]+)\}/g) || []).map(v => v.slice(1, -1))

            await axios.post('http://localhost:3000/api/prompts', {
                id: crypto.randomUUID(),
                name: newName,
                version: 1, // Backend handles version increment if name exists
                template: newTemplate,
                input_variables: variables,
                created_at: new Date().toISOString()
            })
            setShowNew(false)
            setNewName('')
            setNewTemplate('')
            fetchPrompts()
        } catch (err) {
            console.error(err)
        }
    }

    return (
        <div className="space-y-8">
            <header className="flex justify-between items-start">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Prompt Registry</h2>
                    <p className="text-muted-foreground mt-2">Manage and version your agent prompts.</p>
                </div>
                <button
                    onClick={() => setShowNew(!showNew)}
                    className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    New Prompt
                </button>
            </header>

            {/* New Prompt Form */}
            {showNew && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="bg-card border border-border rounded-xl p-6 shadow-sm"
                >
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Name</label>
                            <input
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                                placeholder="e.g. customer-support-system"
                                className="w-full bg-accent/50 border border-border rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-primary/50"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Template</label>
                            <textarea
                                value={newTemplate}
                                onChange={e => setNewTemplate(e.target.value)}
                                placeholder="You are a helpful assistant. Context: {context}"
                                className="w-full h-32 bg-accent/50 border border-border rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-primary/50 font-mono text-sm"
                                required
                            />
                        </div>
                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setShowNew(false)}
                                className="px-4 py-2 text-sm hover:bg-accent rounded-lg"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm hover:bg-primary/90"
                            >
                                Create Version
                            </button>
                        </div>
                    </form>
                </motion.div>
            )}

            {/* Prompts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {loading ? (
                    <div className="col-span-2 text-center text-muted-foreground py-12">Loading prompts...</div>
                ) : (
                    prompts.map((prompt, i) => (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            key={prompt.id}
                            className="bg-card border border-border rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="font-semibold text-lg flex items-center gap-2">
                                        <Terminal className="w-4 h-4 text-primary" />
                                        {prompt.name}
                                    </h3>
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded-full">
                                            v{prompt.version}
                                        </span>
                                        {prompt.label && (
                                            <span className="text-xs bg-green-500/10 text-green-500 px-2 py-1 rounded-full border border-green-500/20">
                                                {prompt.label}
                                            </span>
                                        )}
                                        <span className="text-xs text-muted-foreground">
                                            {new Date(prompt.created_at).toLocaleDateString()}
                                        </span>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                fetchHistory(prompt.name)
                                            }}
                                            className="ml-auto text-xs text-primary hover:underline"
                                        >
                                            History
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-muted/50 rounded-lg p-3 font-mono text-xs text-muted-foreground mb-4 line-clamp-3">
                                {prompt.template}
                            </div>

                            <div className="flex items-center gap-2">
                                {prompt.input_variables.map(v => (
                                    <span key={v} className="px-1.5 py-0.5 bg-primary/10 text-primary rounded text-[10px] font-medium">
                                        {v}
                                    </span>
                                ))}
                            </div>
                        </motion.div>
                    ))
                )}
                {/* History Modal/Panel */}
                {showHistory && (
                    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowHistory(false)}>
                        <div className="bg-card border border-border rounded-xl shadow-lg w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                            <div className="p-4 border-b border-border flex justify-between items-center">
                                <h3 className="font-semibold">Version History</h3>
                                <button onClick={() => setShowHistory(false)} className="text-muted-foreground hover:text-foreground">✕</button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                {history.map(v => (
                                    <div key={v.id} className="border border-border rounded-lg p-4 space-y-2">
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium">v{v.version}</span>
                                                {v.label && (
                                                    <span className="text-xs bg-green-500/10 text-green-500 px-2 py-0.5 rounded-full border border-green-500/20">
                                                        {v.label}
                                                    </span>
                                                )}
                                                <span className="text-xs text-muted-foreground">
                                                    {new Date(v.created_at).toLocaleString()}
                                                </span>
                                            </div>
                                            {!v.label && (
                                                <button
                                                    onClick={() => handlePromote(v.name, v.version)}
                                                    className="text-xs bg-primary/10 text-primary px-2 py-1 rounded hover:bg-primary/20"
                                                >
                                                    Promote
                                                </button>
                                            )}
                                        </div>
                                        <pre className="bg-muted p-2 rounded text-xs overflow-x-auto whitespace-pre-wrap font-mono">
                                            {v.template}
                                        </pre>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
