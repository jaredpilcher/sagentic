import { useState, useEffect } from 'react'
import { Loader2, AlertCircle, ExternalLink } from 'lucide-react'

interface ExtensionWidgetProps {
    extensionName: string
    apiBaseUrl: string
    widgetId: string
    title: string
    description?: string
    width?: 'small' | 'medium' | 'large' | 'full'
    height?: 'small' | 'medium' | 'large'
}

const widthClasses = {
    small: 'col-span-1',
    medium: 'col-span-1 md:col-span-2',
    large: 'col-span-1 md:col-span-2 lg:col-span-3',
    full: 'col-span-full'
}

const heightClasses = {
    small: 'min-h-[200px]',
    medium: 'min-h-[300px]',
    large: 'min-h-[400px]'
}

interface WidgetData {
    type: 'stats' | 'chart' | 'table' | 'custom'
    data: Record<string, unknown>
    html?: string
}

export default function ExtensionWidget({
    extensionName,
    apiBaseUrl,
    widgetId,
    title,
    description,
    width = 'medium',
    height = 'medium'
}: ExtensionWidgetProps) {
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [widgetData, setWidgetData] = useState<WidgetData | null>(null)

    useEffect(() => {
        const fetchWidgetData = async () => {
            try {
                setLoading(true)
                const res = await fetch(`${apiBaseUrl}/widget/${widgetId}`)
                if (!res.ok) {
                    if (res.status === 404) {
                        const statsRes = await fetch(`${apiBaseUrl}/stats?days=7`)
                        if (statsRes.ok) {
                            const stats = await statsRes.json()
                            setWidgetData({ type: 'stats', data: stats })
                        } else {
                            throw new Error('Widget endpoint not found')
                        }
                    } else {
                        throw new Error('Failed to load widget')
                    }
                } else {
                    const data = await res.json()
                    setWidgetData(data)
                }
                setError(null)
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load widget')
            } finally {
                setLoading(false)
            }
        }

        fetchWidgetData()
    }, [apiBaseUrl, widgetId])

    const renderStats = (data: Record<string, unknown>) => {
        const stats = Object.entries(data).slice(0, 6)
        return (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {stats.map(([key, value]) => (
                    <div key={key} className="text-center p-3 bg-muted/30 rounded-lg">
                        <div className="text-2xl font-bold text-primary">
                            {typeof value === 'number'
                                ? value.toLocaleString(undefined, { maximumFractionDigits: 2 })
                                : String(value)}
                        </div>
                        <div className="text-xs text-muted-foreground capitalize">
                            {key.replace(/_/g, ' ')}
                        </div>
                    </div>
                ))}
            </div>
        )
    }

    return (
        <div className={`${widthClasses[width]} ${heightClasses[height]} bg-card border border-border rounded-xl p-4 flex flex-col`}>
            <div className="flex items-center justify-between mb-3">
                <div>
                    <h3 className="font-semibold">{title}</h3>
                    {description && (
                        <p className="text-sm text-muted-foreground">{description}</p>
                    )}
                </div>
                <a
                    href={`/extensions/${extensionName}`}
                    className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                    title="Open extension"
                >
                    <ExternalLink className="w-4 h-4 text-muted-foreground" />
                </a>
            </div>

            <div className="flex-1 flex items-center justify-center">
                {loading ? (
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                ) : error ? (
                    <div className="text-center text-muted-foreground">
                        <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">{error}</p>
                    </div>
                ) : widgetData ? (
                    <div className="w-full">
                        {widgetData.type === 'stats' && renderStats(widgetData.data)}
                        {widgetData.type === 'custom' && widgetData.html && (
                            <div dangerouslySetInnerHTML={{ __html: widgetData.html }} />
                        )}
                        {!widgetData.type && renderStats(widgetData.data || widgetData as unknown as Record<string, unknown>)}
                    </div>
                ) : (
                    <p className="text-muted-foreground">No data available</p>
                )}
            </div>
        </div>
    )
}
