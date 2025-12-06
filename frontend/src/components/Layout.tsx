import { useState, useEffect, useLayoutEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, MessageSquare, Activity, Menu, X } from 'lucide-react'
import { cn } from '../lib/utils'

const getIsMobile = () => typeof window !== 'undefined' && window.innerWidth < 768

export default function Layout({ children }: { children: React.ReactNode }) {
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [isMobile, setIsMobile] = useState(getIsMobile)
    const location = useLocation()

    useLayoutEffect(() => {
        const mql = window.matchMedia('(max-width: 767px)')
        const handleChange = (e: MediaQueryListEvent | MediaQueryList) => setIsMobile(e.matches)
        handleChange(mql)
        mql.addEventListener('change', handleChange)
        return () => mql.removeEventListener('change', handleChange)
    }, [])

    useEffect(() => {
        setSidebarOpen(false)
    }, [location.pathname])

    return (
        <div className="min-h-screen bg-background font-sans antialiased">
            {isMobile && sidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            <aside className={cn(
                "fixed h-full z-50 bg-card/95 backdrop-blur-xl border-r border-border transition-transform duration-300 ease-in-out",
                isMobile 
                    ? sidebarOpen ? "translate-x-0 w-72" : "-translate-x-full w-72"
                    : "translate-x-0 w-64"
            )}>
                <div className="p-4 md:p-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                            Sagentic
                        </h1>
                        <p className="text-xs text-muted-foreground mt-0.5">LangGraph Observability</p>
                    </div>
                    {isMobile && (
                        <button 
                            onClick={() => setSidebarOpen(false)}
                            className="p-2 hover:bg-accent rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    )}
                </div>
                <nav className="px-3 md:px-4 space-y-1">
                    <NavItem to="/" icon={LayoutDashboard} label="Dashboard" />
                    <NavItem to="/evaluations" icon={MessageSquare} label="Evaluations" />
                </nav>
                <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Activity className="w-3 h-3 text-green-500" />
                        <span>Connected</span>
                    </div>
                </div>
            </aside>

            {isMobile && (
                <header className="fixed top-0 left-0 right-0 h-14 bg-card/95 backdrop-blur-xl border-b border-border z-30 flex items-center px-4 gap-3">
                    <button 
                        onClick={() => setSidebarOpen(true)}
                        className="p-2 -ml-2 hover:bg-accent rounded-lg transition-colors"
                    >
                        <Menu className="w-5 h-5" />
                    </button>
                    <h1 className="text-lg font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                        Sagentic
                    </h1>
                </header>
            )}

            <main className={cn(
                "min-h-screen transition-all duration-300",
                isMobile ? "pt-14 pb-20" : "ml-64"
            )}>
                <div className="p-4 md:p-8 max-w-7xl mx-auto">
                    {children}
                </div>
            </main>

            {isMobile && (
                <nav className="fixed bottom-0 left-0 right-0 h-16 bg-card/95 backdrop-blur-xl border-t border-border z-30 flex items-center justify-around px-4 safe-area-pb">
                    <MobileNavItem to="/" icon={LayoutDashboard} label="Dashboard" />
                    <MobileNavItem to="/evaluations" icon={MessageSquare} label="Evaluations" />
                </nav>
            )}
        </div>
    )
}

function NavItem({ to, icon: Icon, label }: { to: string; icon: any; label: string }) {
    const location = useLocation()
    const isActive = location.pathname === to

    return (
        <Link
            to={to}
            className={cn(
                "flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 active:scale-[0.98]",
                isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
        >
            <Icon className="w-5 h-5" />
            <span className="font-medium">{label}</span>
        </Link>
    )
}

function MobileNavItem({ to, icon: Icon, label }: { to: string; icon: any; label: string }) {
    const location = useLocation()
    const isActive = location.pathname === to

    return (
        <Link
            to={to}
            className={cn(
                "flex flex-col items-center gap-1 py-2 px-6 rounded-xl transition-all duration-200 active:scale-[0.95]",
                isActive
                    ? "text-primary"
                    : "text-muted-foreground"
            )}
        >
            <Icon className={cn("w-5 h-5", isActive && "drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]")} />
            <span className="text-xs font-medium">{label}</span>
        </Link>
    )
}
