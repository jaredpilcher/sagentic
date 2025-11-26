import { useEffect, useState } from 'react'
import axios from 'axios'
import { formatDistanceToNow } from 'date-fns'
import { Database, Plus, Search, ChevronRight } from 'lucide-react'
import { motion } from 'framer-motion'

interface DatasetItem {
    id: string
    input: string
    expected_output: string
    created_at: string
}

interface Dataset {
    id: string
    name: string
    description: string
    created_at: string
    items_count: number
    items?: DatasetItem[]
}

export default function Datasets() {
    const [datasets, setDatasets] = useState<Dataset[]>([])
    const [loading, setLoading] = useState(true)
    const [showNew, setShowNew] = useState(false)
    const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null)

    // New Dataset State
    const [newName, setNewName] = useState('')
    const [newDesc, setNewDesc] = useState('')

    // New Item State
    const [newItemInput, setNewItemInput] = useState('')
    const [newItemOutput, setNewItemOutput] = useState('')

    useEffect(() => {
        fetchDatasets()
    }, [])

    const fetchDatasets = () => {
        setLoading(true)
        axios.get('http://localhost:3000/api/datasets')
            .then(res => setDatasets(res.data))
            .catch(err => console.error(err))
            .finally(() => setLoading(false))
    }

    const fetchDatasetDetails = (id: string) => {
        axios.get(`http://localhost:3000/api/datasets/${id}`)
            .then(res => setSelectedDataset(res.data))
            .catch(err => console.error(err))
    }

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            await axios.post('http://localhost:3000/api/datasets', {
                id: crypto.randomUUID(),
                name: newName,
                description: newDesc,
                created_at: new Date().toISOString()
            })
            setShowNew(false)
            setNewName('')
            setNewDesc('')
            fetchDatasets()
        } catch (err) {
            console.error(err)
        }
    }

    const handleAddItem = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedDataset) return
        try {
            await axios.post(`http://localhost:3000/api/datasets/${selectedDataset.id}/items`, {
                id: crypto.randomUUID(),
                dataset_id: selectedDataset.id,
                input: newItemInput,
                expected_output: newItemOutput,
                created_at: new Date().toISOString()
            })
            setNewItemInput('')
            setNewItemOutput('')
            fetchDatasetDetails(selectedDataset.id)
            fetchDatasets() // Update counts
        } catch (err) {
            console.error(err)
        }
    }

    return (
        <div className="space-y-8 h-[calc(100vh-8rem)] flex flex-col">
            <header className="flex justify-between items-start shrink-0">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Datasets</h2>
                    <p className="text-muted-foreground mt-2">Manage test sets for evaluation.</p>
                </div>
                <button
                    onClick={() => setShowNew(!showNew)}
                    className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    New Dataset
                </button>
            </header>

            {/* New Dataset Form */}
            {showNew && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="bg-card border border-border rounded-xl p-6 shadow-sm shrink-0"
                >
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Name</label>
                                <input
                                    value={newName}
                                    onChange={e => setNewName(e.target.value)}
                                    placeholder="e.g. Golden Set v1"
                                    className="w-full bg-accent/50 border border-border rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-primary/50"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Description</label>
                                <input
                                    value={newDesc}
                                    onChange={e => setNewDesc(e.target.value)}
                                    placeholder="Optional description"
                                    className="w-full bg-accent/50 border border-border rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-primary/50"
                                />
                            </div>
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
                                Create Dataset
                            </button>
                        </div>
                    </form>
                </motion.div>
            )}

            <div className="flex gap-6 flex-1 min-h-0">
                {/* Datasets List */}
                <div className="w-1/3 overflow-y-auto pr-2 space-y-4">
                    {loading ? (
                        <div className="text-center text-muted-foreground py-12">Loading...</div>
                    ) : (
                        datasets.map((dataset, i) => (
                            <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.05 }}
                                key={dataset.id}
                                onClick={() => fetchDatasetDetails(dataset.id)}
                                className={`bg-card border rounded-xl p-4 shadow-sm cursor-pointer transition-all ${selectedDataset?.id === dataset.id
                                        ? 'border-primary ring-1 ring-primary'
                                        : 'border-border hover:border-primary/50'
                                    }`}
                            >
                                <div className="flex justify-between items-start">
                                    <h3 className="font-semibold flex items-center gap-2">
                                        <Database className="w-4 h-4 text-primary" />
                                        {dataset.name}
                                    </h3>
                                    <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${selectedDataset?.id === dataset.id ? 'rotate-90' : ''
                                        }`} />
                                </div>
                                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{dataset.description}</p>
                                <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                                    <span>{dataset.items_count} items</span>
                                    <span>{formatDistanceToNow(new Date(dataset.created_at), { addSuffix: true })}</span>
                                </div>
                            </motion.div>
                        ))
                    )}
                </div>

                {/* Dataset Details & Items */}
                <div className="flex-1 bg-card border border-border rounded-xl overflow-hidden flex flex-col shadow-sm">
                    {selectedDataset ? (
                        <>
                            <div className="p-6 border-b border-border bg-muted/20 shrink-0">
                                <h3 className="font-bold text-xl">{selectedDataset.name}</h3>
                                <p className="text-muted-foreground text-sm mt-1">{selectedDataset.description}</p>
                            </div>

                            {/* Add Item Form */}
                            <div className="p-4 border-b border-border bg-accent/20 shrink-0">
                                <form onSubmit={handleAddItem} className="flex gap-4 items-end">
                                    <div className="flex-1">
                                        <label className="block text-xs font-medium mb-1 text-muted-foreground">Input</label>
                                        <input
                                            value={newItemInput}
                                            onChange={e => setNewItemInput(e.target.value)}
                                            className="w-full bg-background border border-border rounded px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
                                            placeholder="User input..."
                                            required
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-xs font-medium mb-1 text-muted-foreground">Expected Output</label>
                                        <input
                                            value={newItemOutput}
                                            onChange={e => setNewItemOutput(e.target.value)}
                                            className="w-full bg-background border border-border rounded px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
                                            placeholder="Expected response..."
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        className="bg-primary text-primary-foreground px-3 py-1.5 rounded text-sm hover:bg-primary/90 h-[34px]"
                                    >
                                        Add Item
                                    </button>
                                </form>
                            </div>

                            {/* Items List */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                {selectedDataset.items?.map((item) => (
                                    <div key={item.id} className="bg-background border border-border rounded-lg p-3 text-sm">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <span className="text-xs font-mono text-muted-foreground block mb-1">INPUT</span>
                                                <div className="bg-accent/30 p-2 rounded">{item.input}</div>
                                            </div>
                                            <div>
                                                <span className="text-xs font-mono text-muted-foreground block mb-1">EXPECTED OUTPUT</span>
                                                <div className="bg-green-500/10 text-green-700 dark:text-green-400 p-2 rounded">
                                                    {item.expected_output || <span className="italic text-muted-foreground">None</span>}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {(!selectedDataset.items || selectedDataset.items.length === 0) && (
                                    <div className="text-center text-muted-foreground py-8">No items yet. Add one above!</div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-muted-foreground">
                            Select a dataset to view items
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
