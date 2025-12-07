
import { useParams, Link, NavLink, Navigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { DOCS_NAV, getDocContent } from '../docs/content'
import { BookOpen, Menu, ChevronRight } from 'lucide-react'
import { useState } from 'react'

export default function Docs() {
    const { slug } = useParams<{ slug: string }>()

    if (!slug) {
        return <Navigate to="/docs/intro" replace />
    }

    const activeSlug = slug || 'intro'
    const content = getDocContent(activeSlug)
    const [sidebarOpen, setSidebarOpen] = useState(false)

    return (
        <div className="flex h-[calc(100vh-4rem)] -m-6 relative">
            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                w-64 bg-card border-r border-border h-full overflow-y-auto
                fixed md:static inset-y-0 left-0 z-50 transition-transform duration-200 ease-in-out
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            `}>
                <div className="p-4 border-b border-border flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-primary" />
                    <h2 className="font-bold text-lg">Documentation</h2>
                </div>
                <nav className="p-4 space-y-6">
                    {DOCS_NAV.map(section => (
                        <div key={section.id}>
                            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">
                                {section.title}
                            </h3>
                            <ul className="space-y-1">
                                {section.items.map(item => (
                                    <li key={item.id}>
                                        <NavLink
                                            to={`/docs/${item.id}`}
                                            onClick={() => setSidebarOpen(false)}
                                            className={({ isActive }) => `
                                                flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors
                                                ${isActive || (activeSlug === item.id)
                                                    ? 'bg-primary/10 text-primary font-medium'
                                                    : 'text-foreground/80 hover:text-foreground hover:bg-accent/50'}
                                            `}
                                        >
                                            {item.title}
                                            {(activeSlug === item.id) && <ChevronRight className="w-3 h-3 ml-auto" />}
                                        </NavLink>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto relative bg-background">
                {/* Mobile Header */}
                <div className="md:hidden flex items-center p-4 border-b border-border sticky top-0 bg-background/80 backdrop-blur-sm z-30">
                    <button onClick={() => setSidebarOpen(true)} className="p-2 mr-2 -ml-2 hover:bg-accent rounded-md">
                        <Menu className="w-5 h-5" />
                    </button>
                    <span className="font-semibold">Docs</span>
                </div>

                <div className="max-w-3xl mx-auto px-6 py-10">
                    {content ? (
                        <article className="prose prose-sm md:prose-base dark:prose-invert max-w-none 
                            prose-headings:scroll-mt-20 prose-headings:font-bold prose-h1:text-3xl prose-h2:text-2xl
                            prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none
                            prose-pre:bg-stone-900 prose-pre:border prose-pre:border-border/50
                            ">
                            <ReactMarkdown>{content}</ReactMarkdown>
                        </article>
                    ) : (
                        <div className="text-center py-20">
                            <h2 className="text-2xl font-bold mb-2">Page Not Found</h2>
                            <p className="text-muted-foreground">The requested documentation page does not exist.</p>
                            <Link to="/docs/intro" className="text-primary hover:underline mt-4 inline-block">
                                Back to Introduction
                            </Link>
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}
