import { useEffect, useState, useCallback } from 'react'
import { X, Loader2, AlertCircle } from 'lucide-react'
import { useExtensions } from '../lib/extensions'

export default function ExtensionModal() {
    const { modalState, closeModal } = useExtensions()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [content, setContent] = useState<{
        html?: string
        data?: Record<string, unknown>
        actions?: Array<{ id: string; label: string; primary?: boolean }>
    } | null>(null)

    const fetchModalContent = useCallback(async () => {
        if (!modalState.extensionName || !modalState.modalId) return

        try {
            setLoading(true)
            setError(null)
            const res = await fetch(
                `/api/extensions/${modalState.extensionName}/modals/${modalState.modalId}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(modalState.context)
                }
            )
            if (!res.ok) {
                throw new Error('Failed to load modal content')
            }
            const data = await res.json()
            setContent(data)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load modal')
        } finally {
            setLoading(false)
        }
    }, [modalState.extensionName, modalState.modalId, modalState.context])

    useEffect(() => {
        if (modalState.isOpen && modalState.extensionName && modalState.modalId) {
            fetchModalContent()
        } else {
            setContent(null)
            setError(null)
        }
    }, [modalState.isOpen, modalState.extensionName, modalState.modalId, fetchModalContent])

    const handleAction = async (actionId: string) => {
        if (!modalState.extensionName || !modalState.modalId) return

        try {
            setLoading(true)
            const res = await fetch(
                `/api/extensions/${modalState.extensionName}/modals/${modalState.modalId}/actions/${actionId}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...modalState.context, ...content?.data })
                }
            )
            if (!res.ok) {
                throw new Error('Action failed')
            }
            const result = await res.json()
            if (result.close) {
                closeModal()
            } else if (result.refresh) {
                fetchModalContent()
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Action failed')
        } finally {
            setLoading(false)
        }
    }

    if (!modalState.isOpen) return null

    const widthClass = {
        small: 'max-w-sm',
        medium: 'max-w-lg',
        large: 'max-w-2xl',
        full: 'max-w-4xl'
    }[modalState.width]

    const heightClass = {
        auto: '',
        small: 'h-48',
        medium: 'h-96',
        large: 'h-[32rem]',
        full: 'h-[80vh]'
    }[modalState.height]

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={closeModal}
            />
            <div className={`relative bg-card border border-border rounded-xl shadow-xl w-full mx-4 ${widthClass} ${heightClass} flex flex-col`}>
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                    <h2 className="font-semibold text-lg">{modalState.title}</h2>
                    <button
                        onClick={closeModal}
                        className="p-1 hover:bg-muted rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-auto p-4">
                    {loading && (
                        <div className="flex items-center justify-center h-32">
                            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                        </div>
                    )}

                    {error && (
                        <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {!loading && !error && content && (
                        <>
                            {content.html && (
                                <div
                                    className="prose prose-invert max-w-none"
                                    dangerouslySetInnerHTML={{ __html: content.html }}
                                />
                            )}
                            {content.data && !content.html && (
                                <div className="space-y-4">
                                    {Object.entries(content.data).map(([key, value]) => (
                                        <div key={key} className="space-y-1">
                                            <label className="text-sm font-medium text-muted-foreground capitalize">
                                                {key.replace(/_/g, ' ')}
                                            </label>
                                            <div className="text-foreground">
                                                {typeof value === 'object'
                                                    ? JSON.stringify(value, null, 2)
                                                    : String(value)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {content?.actions && content.actions.length > 0 && (
                    <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border">
                        {content.actions.map(action => (
                            <button
                                key={action.id}
                                onClick={() => handleAction(action.id)}
                                disabled={loading}
                                className={`px-4 py-2 rounded-lg font-medium transition-colors ${action.primary
                                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                                    : 'bg-muted text-foreground hover:bg-muted/80'
                                    }`}
                            >
                                {action.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
