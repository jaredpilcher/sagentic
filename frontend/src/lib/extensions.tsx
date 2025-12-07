// Re-export new providers and types for backward compatibility (mostly)
// or just to have a single entry point

export * from './extension-types'
export { ExtensionRegistryProvider, useExtensionRegistry } from './extension-registry'
export { ExtensionModalProvider, useExtensionModal } from './extension-modal'

// Legacy hook wrapper for easy migration if needed, 
// OR we update consumers to use the specific hook they need.
// For SOLID, consumers should use specific hooks (ISP).
// But for "easily maintainable system", providing a unified hook isn't terrible if documented.
// Let's create `useExtensions` that aggregates both for backward compat but deprecate it in spirit.

import { useExtensionRegistry } from './extension-registry'
import { useExtensionModal } from './extension-modal'

export function useExtensions() {
    const registry = useExtensionRegistry()
    const modal = useExtensionModal()

    return {
        ...registry,
        ...modal
    }
}
