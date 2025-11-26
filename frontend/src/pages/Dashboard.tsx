
import { useEffect, useState } from 'react'
import axios from 'axios'
import { Link } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { Activity, ArrowRight, Bot, Clock, Search } from 'lucide-react'
import { motion } from 'framer-motion'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'

interface Run {
    id: string
    agent_id: string
    created_at: string
    tags: string[]
}

export default function Dashboard() {
    const [runs, setRuns] = useState<Run[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTags, setSearchTags] = useState('')
    const [debouncedTags, setDebouncedTags] = useState('')

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedTags(searchTags), 500)
        return () => clearTimeout(timer)
    }, [searchTags])

    useEffect(() => {
        setLoading(true)
        axios.get('http://localhost:3000/api/runs', {
            params: { tags: debouncedTags || undefined }
        })
            .then(res => setRuns(res.data))
            .catch(err => console.error(err))
            .finally(() => setLoading(false))
    }, [debouncedTags])

    return (
        <div className="space-y-8">
            <header>
                <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
                <p className="text-muted-foreground mt-2">Overview of agent activity and recent runs.</p>
            </header>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title="Total Runs" value={runs.length} icon={Activity} />
                <StatCard title="Active Agents" value={new Set(runs.map(r => r.agent_id)).size} icon={Bot} />
                <StatCard title="Avg Latency" value="240ms" icon={Clock} />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                    <h3 className="font-semibold mb-4">Latency Trend</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={runs.slice(0, 20).reverse()}>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                <XAxis dataKey="created_at" tickFormatter={(t: string) => formatDistanceToNow(new Date(t))} stroke="hsl(var(--muted-foreground))" fontSize={10} />
                                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                                />
                                <Line type="monotone" dataKey="latency" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                    <h3 className="font-semibold mb-4">Run Volume</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={runs.slice(0, 20).reverse()}>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                <XAxis dataKey="created_at" tickFormatter={(t: string) => formatDistanceToNow(new Date(t))} stroke="hsl(var(--muted-foreground))" fontSize={10} />
                                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                                />
                                <Bar dataKey="id" fill="hsl(var(--primary))" opacity={0.5} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>


            {/* Recent Runs List */}
            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                <div className="p-6 border-b border-border flex justify-between items-center">
                    <h3 className="font-semibold text-lg">Recent Runs</h3>
                    <div className="relative flex items-center gap-2">
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Filter by tags..."
                                value={searchTags}
                                onChange={(e) => setSearchTags(e.target.value)}
                                className="bg-accent/50 border-none rounded-full pl-9 pr-4 py-1.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all w-64"
                            />
                        </div>
                    </div>
                </div>

                <div className="divide-y divide-border">
                    {loading ? (
                        <div className="p-8 text-center text-muted-foreground">Loading runs...</div>
                    ) : (
                        runs.map((run, i) => (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                key={run.id}
                            >
                                <Link
                                    to={`/runs/${run.id}`}
                                    className="flex items-center justify-between p-4 hover:bg-accent/50 transition-colors group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                            <Bot className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className="font-medium text-foreground">{run.agent_id}</div>
                                            <div className="text-xs text-muted-foreground font-mono">{run.id.slice(0, 8)}...</div>
                                            <div className="flex items-center gap-2 mt-1">
                                                {run.tags && run.tags.length > 0 && run.tags.map(tag => (
                                                    <span key={tag} className="px-1.5 py-0.5 bg-accent rounded text-[10px] font-medium text-muted-foreground">
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div className="text-sm text-muted-foreground">
                                            {formatDistanceToNow(new Date(run.created_at), { addSuffix: true })}
                                        </div>
                                        <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                    </div>
                                </Link>
                            </motion.div>
                        ))
                    )}
                </div>
            </div>
        </div >
    )
}

function StatCard({ title, value, icon: Icon }: { title: string; value: string | number; icon: any }) {
    return (
        <div className="p-6 rounded-xl bg-card border border-border shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-muted-foreground">{title}</span>
                <Icon className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="text-3xl font-bold">{value}</div>
        </div>
    )
}
