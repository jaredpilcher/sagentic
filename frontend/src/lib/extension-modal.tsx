import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { useExtensionRegistry } from './extension-registry'

export interface ModalState {
    isOpen: boolean
    extensionName: string | null
    modalId: string | null
    title: string
    width: 'small' | 'medium' | 'large' | 'full'
    height: 'auto' | 'small' | 'medium' | 'large' | 'full'
    context: Record<string, unknown>
}

const defaultModalState: ModalState = {
    isOpen: false,
    extensionName: null,
    modalId: null,
    title: '',
    width: 'medium',
    height: 'auto',
    context: {}
}

interface ExtensionModalContextType {
    modalState: ModalState
    openModal: (extensionName: string, modalId: string, context?: Record<string, unknown>) => void
    closeModal: () => void
    executeAction: (extensionName: string, actionId: string, context: Record<string, unknown>) => Promise<unknown>
}

const ExtensionModalContext = createContext<ExtensionModalContextType | null>(null)

export function ExtensionModalProvider({ children }: { children: ReactNode }) {
    const [modalState, setModalState] = useState<ModalState>(defaultModalState)
    const { extensions } = useExtensionRegistry()

    const openModal = useCallback((extensionName: string, modalId: string, context: Record<string, unknown> = {}) => {
        const ext = extensions.find(e => e.name === extensionName)
        const modal = ext?.contributes?.modals?.find(m => m.id === modalId)
        if (modal) {
            setModalState({
                isOpen: true,
                extensionName,
                modalId,
                title: modal.title,
                width: modal.width || 'medium',
                height: modal.height || 'auto',
                context
            })
        }
    }, [extensions])

    const closeModal = useCallback(() => {
        setModalState(defaultModalState)
    }, [])

    const executeAction = useCallback(async (extensionName: string, actionId: string, context: Record<string, unknown>) => {
        const res = await fetch(`/api/extensions/${extensionName}/actions/${actionId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(context)
        })
        if (!res.ok) throw new Error('Action failed')
        return res.json()
    }, [])

    return (
        <ExtensionModalContext.Provider value={{
            modalState,
            openModal,
            closeModal,
            executeAction
        }}>
            {children}
        </ExtensionModalContext.Provider>
    )
}

export function useExtensionModal() {
    const context = useContext(ExtensionModalContext)
    if (!context) throw new Error('useExtensionModal must be used within ExtensionModalProvider')
    return context
}
