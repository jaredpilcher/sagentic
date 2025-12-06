import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, GitBranch, MessageSquare, Activity } from 'lucide-react'
import { cn } from '../lib/utils'

export default function Layout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-background font-sans antialiased flex">
            <aside className="w-64 border-r border-border bg-card/50 backdrop-blur-xl fixed h-full z-50">
                <div className="p-6">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                        Sagentic
                    </h1>
                    <p className="text-xs text-muted-foreground mt-1">LangGraph Observability</p>
                </div>
                <nav className="px-4 space-y-2">
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

            <main className="flex-1 ml-64 p-8">
                <div className="max-w-7xl mx-auto">
                    {children}
                </div>
            </main>
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
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200",
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
