/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, type ReactNode } from 'react'

export interface ExtensionModalState {
    isOpen: boolean
    extensionName?: string
    modalId?: string
    title?: string
    context?: Record<string, unknown>
    width: 'small' | 'medium' | 'large' | 'full'
    height: 'auto' | 'small' | 'medium' | 'large' | 'full'
}

interface ExtensionModalContextType {
    modalState: ExtensionModalState
    openModal: (params: Omit<ExtensionModalState, 'isOpen' | 'width' | 'height'> & { width?: ExtensionModalState['width']; height?: ExtensionModalState['height'] }) => void
    closeModal: () => void
}

const ExtensionModalContext = createContext<ExtensionModalContextType | null>(null)

export function ExtensionModalProvider({ children }: { children: ReactNode }) {
    const [modalState, setModalState] = useState<ExtensionModalState>({
        isOpen: false,
        width: 'medium',
        height: 'auto'
    })

    const openModal = (params: Omit<ExtensionModalState, 'isOpen' | 'width' | 'height'> & { width?: ExtensionModalState['width']; height?: ExtensionModalState['height'] }) => {
        setModalState({
            isOpen: true,
            width: 'medium',
            height: 'auto',
            ...params
        })
    }

    const closeModal = () => {
        setModalState(prev => ({ ...prev, isOpen: false }))
    }

    return (
        <ExtensionModalContext.Provider value={{
            modalState,
            openModal,
            closeModal
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
