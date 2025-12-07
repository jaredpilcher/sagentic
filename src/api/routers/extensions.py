from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional

from ...db.database import get_db
from ...services.extension_service import ExtensionService
from ...extensions.manager import ExtensionManager
from ...extensions.schemas import (
    ExtensionListResponse, ExtensionInfo, ExtensionManifest, ExtensionInstallResponse, 
    ExtensionStatusUpdate, FrontendExtensionManifest
)

# Need a way to get the singleton ExtensionManager since it holds state
# In server.py: extension_manager = ExtensionManager(app)
# We need to inject this.
# For now, we'll try to instantiate or get it from app state if possible, 
# or use a global singleton pattern for the manager.
# Given server.py initializes it with `app`, we might need a dependency provider.

from ...core.globals import get_extension_manager # We need to create this

router = APIRouter(prefix="/api/extensions", tags=["extensions"])

def get_service(
    db: Session = Depends(get_db),
    manager: ExtensionManager = Depends(get_extension_manager)
) -> ExtensionService:
    return ExtensionService(db, manager)

@router.get("", response_model=ExtensionListResponse)
def list_extensions(
    status: Optional[str] = None,
    service: ExtensionService = Depends(get_service)
):
    """List extensions."""
    extensions = service.list_extensions(status)
    return ExtensionListResponse(
        extensions=[ExtensionInfo(
            id=e.id,
            name=e.name,
            version=e.version,
            description=e.description,
            status=e.status,
            has_backend=e.has_backend or False,
            has_frontend=e.has_frontend or False,
            manifest=ExtensionManifest(**e.manifest),
            created_at=e.created_at,
            updated_at=e.updated_at
        ) for e in extensions],
        total=len(extensions)
    )

@router.post("/install", response_model=ExtensionInstallResponse)
async def install_extension(
    file: UploadFile = File(...),
    service: ExtensionService = Depends(get_service)
):
    """Install extension from zip."""
    content = await file.read()
    result = await service.install_extension(content, file.filename)
    return ExtensionInstallResponse(**result)

@router.delete("/{extension_id}", response_model=ExtensionInstallResponse)
def uninstall_extension(
    extension_id: str,
    service: ExtensionService = Depends(get_service)
):
    """Uninstall extension."""
    result = service.uninstall_extension(extension_id)
    if not result["success"] and result["message"] == "Extension not found":
        raise HTTPException(status_code=404, detail="Extension not found")
    return ExtensionInstallResponse(**result)
