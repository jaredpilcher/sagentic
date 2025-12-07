from typing import List, Optional, Dict, Any, Tuple
from sqlalchemy.orm import Session
import uuid
import os
import tempfile
from datetime import datetime

from ..repositories.extension_repository import ExtensionRepository
from ..db.models import Extension, ExtensionStatusUpdate
from ..extensions.manager import ExtensionManager

class ExtensionService:
    def __init__(self, db: Session, extension_manager: ExtensionManager):
        self.db = db
        self.repo = ExtensionRepository(db)
        self.manager = extension_manager

    def list_extensions(self, status: Optional[str] = None) -> List[Extension]:
        return self.repo.list_extensions(status)

    def get_extension(self, extension_id: str) -> Optional[Extension]:
        return self.repo.get(extension_id)

    async def install_extension(self, file_content: bytes, filename: str) -> Dict[str, Any]:
        if not filename.endswith('.zip'):
             raise ValueError("File must be a .zip archive")

        with tempfile.NamedTemporaryFile(delete=False, suffix='.zip') as temp_file:
            temp_file.write(file_content)
            temp_path = temp_file.name

        try:
            success, message, manifest = self.manager.install_from_zip(temp_path)
            
            if not success:
                return {"success": False, "message": message}
            
            existing = self.repo.get_by_name(manifest["name"])
            if existing:
                existing.version = manifest["version"]
                existing.description = manifest.get("description")
                existing.manifest = manifest
                existing.has_backend = bool(manifest.get("backend_entry"))
                existing.has_frontend = bool(manifest.get("frontend_entry"))
                existing.updated_at = datetime.utcnow()
                ext_id = existing.id
            else:
                ext_id = str(uuid.uuid4())
                ext = Extension(
                    id=ext_id,
                    name=manifest["name"],
                    version=manifest["version"],
                    description=manifest.get("description"),
                    status="enabled",
                    manifest=manifest,
                    install_path=str(self.manager.get_extension_path(manifest["name"], manifest["version"])),
                    has_backend=bool(manifest.get("backend_entry")),
                    has_frontend=bool(manifest.get("frontend_entry"))
                )
                self.repo.create(ext) # Using generic create
            
            self.db.commit() # Ensure committed
            
            if manifest.get("backend_entry"):
                load_success, load_msg = self.manager.load_backend(
                    ext_id, manifest["name"], manifest["version"], manifest["backend_entry"]
                )
                if not load_success:
                    return {
                        "success": True,
                        "extension_id": ext_id,
                        "name": manifest["name"],
                        "message": f"Installed but backend failed to load: {load_msg}"
                    }
            
            return {
                "success": True,
                "extension_id": ext_id,
                "name": manifest["name"],
                "message": message
            }
        finally:
            os.unlink(temp_path)

    def uninstall_extension(self, extension_id: str) -> Dict[str, Any]:
        ext = self.repo.get(extension_id)
        if not ext:
            return {"success": False, "message": "Extension not found"}
        
        self.manager.unload_backend(extension_id)
        success, message = self.manager.uninstall(ext.name, ext.version)
        
        self.repo.delete(extension_id)
        
        return {
            "success": success,
            "extension_id": extension_id,
            "name": ext.name,
            "message": message
        }

    def update_status(self, extension_id: str, status: str) -> Dict[str, Any]:
        ext = self.repo.get(extension_id)
        if not ext:
            raise ValueError("Extension not found")
        
        if status == "disabled" and ext.status == "enabled":
            self.manager.unload_backend(extension_id)
        elif status == "enabled" and ext.status == "disabled":
            if ext.has_backend and ext.manifest.get("backend_entry"):
                self.manager.load_backend(
                    ext.id, ext.name, ext.version, ext.manifest["backend_entry"]
                )
        
        ext.status = status
        ext.updated_at = datetime.utcnow()
        self.db.commit()
        return {"success": True, "status": status}
