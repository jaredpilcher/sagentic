import { useState, useEffect } from 'react'

export interface PageData {
    title?: string
    html?: string
    data?: Record<string, unknown>
    sections?: Array<{
        id: string
        title: string
        type: 'stats' | 'table' | 'list' | 'cards' | 'custom'
        data: unknown
    }>
}

export function useExtensionData(extensionName: string | undefined, currentPath: string) {
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [pageData, setPageData] = useState<PageData | null>(null)

    useEffect(() => {
        const fetchPageData = async () => {
            if (!extensionName) return

            try {
                setLoading(true)
                setError(null)

                if (currentPath) {
                    const pageRes = await fetch(`/api/extensions/${extensionName}/pages/${currentPath}`)
                    if (pageRes.ok) {
                        const data = await pageRes.json()
                        if (data.sections || data.html || data.data) {
                            setPageData(data)
                            return
                        }
                    }
                }

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
                    // If it was a specific path and failed, or overview and failed
                    if (currentPath) {
                        // Fallthrough or specific error
                    } else {
                        throw new Error('Extension has no data endpoints')
                    }
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

                if (sections.length > 0) {
                    setPageData({ sections })
                } else {
                    setPageData(null)
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load extension data')
            } finally {
                setLoading(false)
            }
        }

        fetchPageData()
    }, [extensionName, currentPath])

    return { pageData, loading, error, refresh: () => { } } # TODO: expose refresh properly if needed, but depend on effect for now
}
