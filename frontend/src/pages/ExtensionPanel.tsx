import { useState, useEffect } from 'react'
import { useParams, Link, useLocation } from 'react-router-dom'
import { Loader2, AlertCircle, ArrowLeft, RefreshCw, ChevronRight } from 'lucide-react'
import { useExtensions } from '../lib/extensions'
import * as LucideIcons from 'lucide-react'

interface PageData {
    title?: string
    html?: string
    data?: Record<string, unknown>
    sections?: Array<{
        id: string
        title: string
        type: 'stats' | 'table' | 'list' | 'cards' | 'custom'
        data: unknown
    }>
    navigation?: Array<{
        id: string
        path: string
        title: string
        icon?: string
    }>
}

const iconMap: Record<string, React.ElementType> = {
    BarChart3: LucideIcons.BarChart3,
    Settings: LucideIcons.Settings,
    Activity: LucideIcons.Activity,
    TrendingUp: LucideIcons.TrendingUp,
    Users: LucideIcons.Users,
    Star: LucideIcons.Star,
    Bookmark: LucideIcons.Bookmark,
    Calendar: LucideIcons.Calendar,
    Clock: LucideIcons.Clock,
    Zap: LucideIcons.Zap,
    Package: LucideIcons.Package,
    FileText: LucideIcons.FileText,
    Home: LucideIcons.Home
}

export default function ExtensionPanel() {
    const { extensionName, '*': subPath } = useParams<{ extensionName: string; '*': string }>()
    const location = useLocation()
    const { getExtensionPages } = useExtensions()
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [pageData, setPageData] = useState<PageData | null>(null)

    const pages = extensionName ? getExtensionPages(extensionName) : []
    const currentPath = subPath || ''

    const fetchPageData = async () => {
        if (!extensionName) return

        try {
            setLoading(true)
            setError(null)

            const pagePath = currentPath || 'index'
            const res = await fetch(`/api/extensions/${extensionName}/pages/${pagePath}`)
            
            if (res.ok) {
                const data = await res.json()
                setPageData(data)
            } else if (res.status === 404) {
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

                const sections: PageData['sections'] = []
                if (stats) {
                    sections.push({ id: 'stats', title: 'Overview (Last 30 Days)', type: 'stats', data: stats })
                }
                if (daily?.daily || daily) {
                    sections.push({ id: 'daily', title: 'Daily Breakdown', type: 'table', data: daily?.daily || daily })
                }
                if (graphs?.graphs || graphs) {
                    sections.push({ id: 'graphs', title: 'Per-Graph Statistics', type: 'cards', data: graphs?.graphs || graphs })
                }

                setPageData({ sections })
            } else {
                throw new Error('Failed to load page')
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load extension data')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchPageData()
    }, [extensionName, currentPath])

    const renderStats = (data: Record<string, unknown>) => (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {Object.entries(data).map(([key, value]) => (
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
    )

    const renderTable = (data: Array<Record<string, unknown>>) => {
        if (!data.length) return <p className="text-muted-foreground">No data available</p>
        return (
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-border">
                            {Object.keys(data[0]).map(key => (
                                <th key={key} className="text-left py-2 px-3 font-medium text-muted-foreground capitalize">
                                    {key.replace(/_/g, ' ')}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((row, i) => (
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
        )
    }

    const renderCards = (data: Array<Record<string, unknown>>) => (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {data.map((card, i) => (
                <div key={i} className="p-4 bg-muted/30 rounded-lg">
                    <h3 className="font-medium mb-2 truncate">{String(card.graph_id || card.title || card.name || `Item ${i + 1}`)}</h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                        {Object.entries(card)
                            .filter(([k]) => !['graph_id', 'title', 'name', 'id'].includes(k))
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
    )

    const renderSection = (section: NonNullable<PageData['sections']>[0]) => {
        switch (section.type) {
            case 'stats':
                return renderStats(section.data as Record<string, unknown>)
            case 'table':
                return renderTable(section.data as Array<Record<string, unknown>>)
            case 'cards':
                return renderCards(section.data as Array<Record<string, unknown>>)
            case 'list':
                return (
                    <ul className="space-y-2">
                        {(section.data as Array<unknown>).map((item, i) => (
                            <li key={i} className="p-3 bg-muted/30 rounded-lg">
                                {typeof item === 'object' ? JSON.stringify(item) : String(item)}
                            </li>
                        ))}
                    </ul>
                )
            case 'custom':
                if (typeof section.data === 'string') {
                    return <div dangerouslySetInnerHTML={{ __html: section.data }} />
                }
                return <pre className="text-xs bg-muted/30 p-4 rounded-lg overflow-auto">{JSON.stringify(section.data, null, 2)}</pre>
            default:
                return null
        }
    }

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
                        <ChevronRight className="w-4 h-4" />
                        <Link to={`/extensions/${extensionName}`} className="hover:text-foreground">{extensionName}</Link>
                        {currentPath && (
                            <>
                                <ChevronRight className="w-4 h-4" />
                                <span className="capitalize">{currentPath.replace(/\//g, ' / ')}</span>
                            </>
                        )}
                    </div>
                    <h1 className="text-2xl md:text-3xl font-bold capitalize">
                        {pageData?.title || extensionName?.replace(/-/g, ' ')}
                    </h1>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={fetchPageData}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card border border-border hover:bg-accent transition-colors"
                    >
                        <RefreshCw className="w-4 h-4" />
                        <span className="hidden sm:inline">Refresh</span>
                    </button>
                </div>
            </div>

            {pages.length > 0 && (
                <div className="flex flex-wrap gap-2 border-b border-border pb-4">
                    <Link
                        to={`/extensions/${extensionName}`}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            !currentPath 
                                ? 'bg-primary text-primary-foreground' 
                                : 'bg-muted/30 hover:bg-muted/50'
                        }`}
                    >
                        Overview
                    </Link>
                    {pages.map(page => {
                        const Icon = iconMap[page.icon || 'Package'] || LucideIcons.FileText
                        const isActive = currentPath === page.path.replace(/^\//, '')
                        return (
                            <Link
                                key={page.id}
                                to={`/extensions/${extensionName}/${page.path.replace(/^\//, '')}`}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    isActive 
                                        ? 'bg-primary text-primary-foreground' 
                                        : 'bg-muted/30 hover:bg-muted/50'
                                }`}
                            >
                                <Icon className="w-4 h-4" />
                                {page.title}
                            </Link>
                        )
                    })}
                </div>
            )}

            {pageData?.navigation && (
                <div className="flex flex-wrap gap-2 border-b border-border pb-4">
                    {pageData.navigation.map(nav => {
                        const Icon = iconMap[nav.icon || 'Package'] || LucideIcons.FileText
                        const isActive = location.pathname.endsWith(nav.path)
                        return (
                            <Link
                                key={nav.id}
                                to={`/extensions/${extensionName}${nav.path}`}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    isActive 
                                        ? 'bg-primary text-primary-foreground' 
                                        : 'bg-muted/30 hover:bg-muted/50'
                                }`}
                            >
                                <Icon className="w-4 h-4" />
                                {nav.title}
                            </Link>
                        )
                    })}
                </div>
            )}

            {pageData?.html && (
                <div 
                    className="prose prose-invert max-w-none bg-card border border-border rounded-xl p-6"
                    dangerouslySetInnerHTML={{ __html: pageData.html }}
                />
            )}

            {pageData?.sections?.map(section => (
                <div key={section.id} className="bg-card border border-border rounded-xl p-6">
                    <h2 className="text-lg font-semibold mb-4">{section.title}</h2>
                    {renderSection(section)}
                </div>
            ))}

            {pageData?.data && !pageData.sections && !pageData.html && (
                <div className="bg-card border border-border rounded-xl p-6">
                    <pre className="text-xs overflow-auto">{JSON.stringify(pageData.data, null, 2)}</pre>
                </div>
            )}
        </div>
    )
}
