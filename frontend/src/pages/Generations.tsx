import { useEffect, useState } from 'react'
import axios from 'axios'
import { formatDistanceToNow } from 'date-fns'
import { Activity, Clock, DollarSign, Search } from 'lucide-react'
import { motion } from 'framer-motion'

interface Generation {
    span_id: string
    trace_id: string
    name: string
    start_time: string
    end_time: string
    attributes: any
    status_code: string
}

export default function Generations() {
    const [generations, setGenerations] = useState<Generation[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        axios.get('http://localhost:3000/api/generations')
            .then(res => setGenerations(res.data))
            .catch(err => console.error(err))
            .finally(() => setLoading(false))
    }, [])

    return (
        <div className="space-y-8">
            <header>
                <h2 className="text-3xl font-bold tracking-tight">Generations</h2>
                <p className="text-muted-foreground mt-2">Global view of all LLM calls across agents.</p>
            </header>

            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                <div className="p-6 border-b border-border flex justify-between items-center">
                    <h3 className="font-semibold text-lg">LLM Spans</h3>
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search generations..."
                            className="bg-accent/50 border-none rounded-full pl-9 pr-4 py-1.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted/50 text-muted-foreground font-medium">
                            <tr>
                                <th className="px-6 py-3">Timestamp</th>
                                <th className="px-6 py-3">Name</th>
                                <th className="px-6 py-3">Model</th>
                                <th className="px-6 py-3">Latency</th>
                                <th className="px-6 py-3">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-muted-foreground">Loading generations...</td>
                                </tr>
                            ) : (
                                generations.map((gen, i) => {
                                    const duration = new Date(gen.end_time).getTime() - new Date(gen.start_time).getTime()
                                    return (
                                        <motion.tr
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: i * 0.03 }}
                                            key={gen.span_id}
                                            className="hover:bg-accent/50 transition-colors"
                                        >
                                            <td className="px-6 py-4 text-muted-foreground">
                                                {formatDistanceToNow(new Date(gen.start_time), { addSuffix: true })}
                                            </td>
                                            <td className="px-6 py-4 font-medium">{gen.name}</td>
                                            <td className="px-6 py-4">
                                                <span className="px-2 py-1 bg-primary/10 text-primary rounded text-xs font-mono">
                                                    {gen.attributes.model || 'unknown'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 font-mono text-muted-foreground">
                                                {duration}ms
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded text-xs font-medium ${gen.status_code === 'OK'
                                                        ? 'bg-green-500/10 text-green-500'
                                                        : 'bg-red-500/10 text-red-500'
                                                    }`}>
                                                    {gen.status_code}
                                                </span>
                                            </td>
                                        </motion.tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
