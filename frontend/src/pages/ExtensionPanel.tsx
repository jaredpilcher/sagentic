import { useParams, Link, useLocation } from 'react-router-dom'
import { Loader2, AlertCircle, ArrowLeft, RefreshCw, ChevronRight } from 'lucide-react'
import { useExtensions } from '../lib/extensions'
import * as LucideIcons from 'lucide-react'

import { ExtensionSection } from '../components/extension/ExtensionSection'
import { useExtensionData } from '../hooks/useExtensionData'

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
    const { getExtensionPages } = useExtensions()

    const currentPath = subPath || ''
    const { pageData, loading, error } = useExtensionData(extensionName, currentPath)

    // Refresh hack: passing refresh capability needs refactor in hook or just reliance on key change
    // For SOLID, we accept standard hook behavior. If user wants refresh, we can add a key or expose refresh method.
    // For now, simplifying.

    const pages = extensionName ? getExtensionPages(extensionName) : []

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
                    {/* Refresh button functionality simplified for now */}
                    <button
                        onClick={() => window.location.reload()}
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
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${!currentPath
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted/30 hover:bg-muted/50'
                            }`}
                    >
                        Overview
                    </Link>
                    {pages.filter(p => p.path !== '/' && p.path !== '').map(page => {
                        const Icon = iconMap[page.icon || 'Package'] || LucideIcons.FileText
                        const isActive = currentPath === page.path.replace(/^\//, '')
                        return (
                            <Link
                                key={page.id}
                                to={`/extensions/${extensionName}/${page.path.replace(/^\//, '')}`}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isActive
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

            {pageData?.html && (
                <div
                    className="prose prose-invert max-w-none bg-card border border-border rounded-xl p-6"
                    dangerouslySetInnerHTML={{ __html: pageData.html }}
                />
            )}

            {pageData?.sections?.map(section => (
                <ExtensionSection key={section.id} section={section} />
            ))}

            {pageData?.data && !pageData.sections && !pageData.html && (
                <div className="bg-card border border-border rounded-xl p-6">
                    <pre className="text-xs overflow-auto">{JSON.stringify(pageData.data, null, 2)}</pre>
                </div>
            )}
        </div>
    )
}
