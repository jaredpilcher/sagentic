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
}

export default function Prompts() {
    const [prompts, setPrompts] = useState<Prompt[]>([])
    const [loading, setLoading] = useState(true)
    const [showNew, setShowNew] = useState(false)

    // New Prompt State
    const [newName, setNewName] = useState('')
    const [newTemplate, setNewTemplate] = useState('')

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
                                    <div className="text-xs text-muted-foreground mt-1">
                                        Updated {formatDistanceToNow(new Date(prompt.created_at), { addSuffix: true })}
                                    </div>
                                </div>
                                <span className="px-2 py-1 bg-accent rounded text-xs font-mono font-medium">
                                    v{prompt.version}
                                </span>
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
            </div>
        </div>
    )
}
