import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Loader2, AlertCircle, ArrowLeft, ExternalLink, RefreshCw } from 'lucide-react'

interface ExtensionData {
    name: string
    version: string
    description?: string
    stats?: Record<string, unknown>
    daily?: Array<Record<string, unknown>>
    graphs?: Array<Record<string, unknown>>
}

export default function ExtensionPanel() {
    const { extensionName } = useParams<{ extensionName: string }>()
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [data, setData] = useState<ExtensionData | null>(null)

    const fetchData = async () => {
        if (!extensionName) return

        try {
            setLoading(true)
            setError(null)

            const [statsRes, dailyRes, graphsRes] = await Promise.allSettled([
                fetch(`/api/extensions/${extensionName}/stats?days=30`),
                fetch(`/api/extensions/${extensionName}/daily?days=14`),
                fetch(`/api/extensions/${extensionName}/graphs`)
            ])

            const stats = statsRes.status === 'fulfilled' && statsRes.value.ok 
                ? await statsRes.value.json() 
                : null
            const daily = dailyRes.status === 'fulfilled' && dailyRes.value.ok 
                ? await dailyRes.value.json() 
                : null
            const graphs = graphsRes.status === 'fulfilled' && graphsRes.value.ok 
                ? await graphsRes.value.json() 
                : null

            if (!stats && !daily && !graphs) {
                throw new Error('Extension has no data endpoints')
            }

            setData({
                name: extensionName,
                version: '1.0.0',
                stats,
                daily: daily?.daily || daily,
                graphs: graphs?.graphs || graphs
            })
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load extension data')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [extensionName])

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
                <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
                <h2 className="text-xl font-semibold mb-2">Extension Not Available</h2>
                <p className="text-muted-foreground mb-4">{error}</p>
                <Link to="/extensions" className="text-primary hover:underline flex items-center gap-2">
                    <ArrowLeft className="w-4 h-4" />
                    Back to Extensions
                </Link>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                        <Link to="/extensions" className="hover:text-foreground">Extensions</Link>
                        <span>/</span>
                        <span>{extensionName}</span>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-bold capitalize">{extensionName?.replace(/-/g, ' ')}</h1>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={fetchData}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card border border-border hover:bg-accent transition-colors"
                    >
                        <RefreshCw className="w-4 h-4" />
                        <span className="hidden sm:inline">Refresh</span>
                    </button>
                    <a
                        href={`/api/extensions/${extensionName}/assets/index.html`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                        <ExternalLink className="w-4 h-4" />
                        <span>Open Full Dashboard</span>
                    </a>
                </div>
            </div>

            {data?.stats && (
                <div className="bg-card border border-border rounded-xl p-6">
                    <h2 className="text-lg font-semibold mb-4">Overview (Last 30 Days)</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                        {Object.entries(data.stats).map(([key, value]) => (
                            <div key={key} className="text-center p-4 bg-muted/30 rounded-lg">
                                <div className="text-2xl md:text-3xl font-bold text-primary">
                                    {typeof value === 'number' 
                                        ? key.includes('rate') || key.includes('percent')
                                            ? `${value.toFixed(1)}%`
                                            : key.includes('cost')
                                                ? `$${value.toFixed(4)}`
                                                : key.includes('latency') || key.includes('ms')
                                                    ? `${value.toFixed(0)}ms`
                                                    : value.toLocaleString()
                                        : String(value)}
                                </div>
                                <div className="text-xs text-muted-foreground capitalize mt-1">
                                    {key.replace(/_/g, ' ')}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {data?.daily && Array.isArray(data.daily) && data.daily.length > 0 && (
                <div className="bg-card border border-border rounded-xl p-6">
                    <h2 className="text-lg font-semibold mb-4">Daily Breakdown</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border">
                                    {Object.keys(data.daily[0] || {}).map(key => (
                                        <th key={key} className="text-left py-2 px-3 font-medium text-muted-foreground capitalize">
                                            {key.replace(/_/g, ' ')}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {data.daily.map((row, i) => (
                                    <tr key={i} className="border-b border-border/50 hover:bg-muted/30">
                                        {Object.values(row).map((value, j) => (
                                            <td key={j} className="py-2 px-3">
                                                {typeof value === 'number' 
                                                    ? value.toLocaleString(undefined, { maximumFractionDigits: 2 })
                                                    : String(value)}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {data?.graphs && Array.isArray(data.graphs) && data.graphs.length > 0 && (
                <div className="bg-card border border-border rounded-xl p-6">
                    <h2 className="text-lg font-semibold mb-4">Per-Graph Statistics</h2>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {data.graphs.map((graph, i) => (
                            <div key={i} className="p-4 bg-muted/30 rounded-lg">
                                <h3 className="font-medium mb-2 truncate">{String(graph.graph_id || `Graph ${i + 1}`)}</h3>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    {Object.entries(graph)
                                        .filter(([k]) => k !== 'graph_id')
                                        .map(([key, value]) => (
                                            <div key={key}>
                                                <div className="text-muted-foreground capitalize text-xs">{key.replace(/_/g, ' ')}</div>
                                                <div className="font-medium">
                                                    {typeof value === 'number' 
                                                        ? value.toLocaleString(undefined, { maximumFractionDigits: 2 })
                                                        : String(value)}
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
