import { useState, useEffect, useRef } from 'react'
import { Package, Upload, Trash2, ToggleLeft, ToggleRight, RefreshCw, AlertCircle, Check, X, Server, Layout } from 'lucide-react'
import { cn } from '../lib/utils'

interface Extension {
    id: string
    name: string
    version: string
    description: string | null
    status: string
    has_backend: boolean
    has_frontend: boolean
    manifest: {
        name: string
        version: string
        description?: string
        author?: string
        backend_entry?: string
        frontend_entry?: string
        nav_items?: Array<Record<string, unknown>>
        routes?: Array<Record<string, unknown>>
    }
    created_at: string
    updated_at: string
}

export default function Extensions() {
    const [extensions, setExtensions] = useState<Extension[]>([])
    const [loading, setLoading] = useState(true)
    const [uploading, setUploading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const fetchExtensions = async () => {
        try {
            setLoading(true)
            const res = await fetch('/api/extensions')
            const data = await res.json()
            setExtensions(data.extensions || [])
            setError(null)
        } catch {
            setError('Failed to load extensions')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchExtensions()
    }, [])

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (!file.name.endsWith('.zip')) {
            setError('Please upload a .zip file')
            return
        }

        setUploading(true)
        setError(null)
        setSuccess(null)

        const formData = new FormData()
        formData.append('file', file)

        try {
            const res = await fetch('/api/extensions/install', {
                method: 'POST',
                body: formData
            })
            const data = await res.json()

            if (data.success) {
                setSuccess(`Extension "${data.name}" installed successfully`)
                fetchExtensions()
            } else {
                setError(data.message || 'Installation failed')
            }
        } catch {
            setError('Failed to upload extension')
        } finally {
            setUploading(false)
            if (fileInputRef.current) {
                fileInputRef.current.value = ''
            }
        }
    }

    const handleToggleStatus = async (ext: Extension) => {
        const newStatus = ext.status === 'enabled' ? 'disabled' : 'enabled'
        try {
            const res = await fetch(`/api/extensions/${ext.id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            })
            if (res.ok) {
                setSuccess(`Extension "${ext.name}" ${newStatus}`)
                fetchExtensions()
            }
        } catch {
            setError('Failed to update extension status')
        }
    }

    const handleUninstall = async (ext: Extension) => {
        if (!confirm(`Are you sure you want to uninstall "${ext.name}"?`)) return

        try {
            const res = await fetch(`/api/extensions/${ext.id}`, {
                method: 'DELETE'
            })
            const data = await res.json()

            if (data.success) {
                setSuccess(`Extension "${ext.name}" uninstalled`)
                fetchExtensions()
            } else {
                setError(data.message || 'Uninstall failed')
            }
        } catch {
            setError('Failed to uninstall extension')
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold">Extensions</h1>
                    <p className="text-muted-foreground mt-1">Manage plugins to extend platform functionality</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={fetchExtensions}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card border border-border hover:bg-accent transition-colors"
                    >
                        <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                        <span className="hidden sm:inline">Refresh</span>
                    </button>
                    <label className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer">
                        <Upload className="w-4 h-4" />
                        <span>{uploading ? 'Uploading...' : 'Install Extension'}</span>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".zip"
                            onChange={handleUpload}
                            className="hidden"
                            disabled={uploading}
                        />
                    </label>
                </div>
            </div>

            {error && (
                <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                    <p className="text-red-400">{error}</p>
                    <button onClick={() => setError(null)} className="ml-auto p-1 hover:bg-red-500/20 rounded">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {success && (
                <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-500 shrink-0" />
                    <p className="text-green-400">{success}</p>
                    <button onClick={() => setSuccess(null)} className="ml-auto p-1 hover:bg-green-500/20 rounded">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
            ) : extensions.length === 0 ? (
                <div className="bg-card border border-border rounded-xl p-12 text-center">
                    <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Extensions Installed</h3>
                    <p className="text-muted-foreground mb-4">Upload a .zip extension package to get started</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {extensions.map(ext => (
                        <div key={ext.id} className="bg-card border border-border rounded-xl p-4 md:p-6">
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <h3 className="text-lg font-semibold">{ext.name}</h3>
                                        <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
                                            v{ext.version}
                                        </span>
                                        <span className={cn(
                                            "text-xs px-2 py-1 rounded-full",
                                            ext.status === 'enabled'
                                                ? "bg-green-500/10 text-green-500"
                                                : "bg-yellow-500/10 text-yellow-500"
                                        )}>
                                            {ext.status}
                                        </span>
                                    </div>
                                    {ext.description && (
                                        <p className="text-muted-foreground mt-2">{ext.description}</p>
                                    )}
                                    <div className="flex flex-wrap gap-3 mt-3">
                                        {ext.has_backend && (
                                            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                <Server className="w-3.5 h-3.5" />
                                                Backend
                                            </span>
                                        )}
                                        {ext.has_frontend && (
                                            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                <Layout className="w-3.5 h-3.5" />
                                                Frontend
                                            </span>
                                        )}
                                        {ext.manifest.author && (
                                            <span className="text-xs text-muted-foreground">
                                                by {ext.manifest.author}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleToggleStatus(ext)}
                                        className={cn(
                                            "flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm",
                                            ext.status === 'enabled'
                                                ? "bg-green-500/10 text-green-500 hover:bg-green-500/20"
                                                : "bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20"
                                        )}
                                    >
                                        {ext.status === 'enabled' ? (
                                            <>
                                                <ToggleRight className="w-4 h-4" />
                                                <span className="hidden sm:inline">Enabled</span>
                                            </>
                                        ) : (
                                            <>
                                                <ToggleLeft className="w-4 h-4" />
                                                <span className="hidden sm:inline">Disabled</span>
                                            </>
                                        )}
                                    </button>
                                    <button
                                        onClick={() => handleUninstall(ext)}
                                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors text-sm"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        <span className="hidden sm:inline">Uninstall</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="bg-card border border-border rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-3">Extension Package Format</h3>
                <p className="text-muted-foreground mb-4">
                    Extensions are zip files containing a manifest.json and optional backend/frontend directories.
                </p>
                <pre className="bg-muted/50 rounded-lg p-4 text-sm overflow-x-auto">
                    {`extension.zip/
├── manifest.json      # Required: name, version, description
├── backend/           # Optional: Python backend code
│   └── routes.py      # Exports register(router) function
└── frontend/          # Optional: Frontend assets
    └── index.js       # Frontend entry point`}
                </pre>
            </div>
        </div>
    )
}
