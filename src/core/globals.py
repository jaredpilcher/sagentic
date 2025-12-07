from typing import Optional
from ..extensions.manager import ExtensionManager

# Singleton instance
_extension_manager: Optional[ExtensionManager] = None

def set_extension_manager(manager: ExtensionManager):
    global _extension_manager
    _extension_manager = manager

def get_extension_manager() -> ExtensionManager:
    if not _extension_manager:
        raise RuntimeError("Extension Manager not initialized")
    return _extension_manager
