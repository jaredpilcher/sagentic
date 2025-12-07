from typing import List, Optional
from sqlalchemy.orm import Session
from .base import BaseRepository
from ..db.models import Extension, ExtensionData, ExtensionNetworkAudit

class ExtensionRepository(BaseRepository[Extension]):
    def __init__(self, db: Session):
        super().__init__(db, Extension)

    def get_by_name(self, name: str) -> Optional[Extension]:
        return self.db.query(Extension).filter(Extension.name == name).first()
    
    def list_extensions(self, status: Optional[str] = None) -> List[Extension]:
        query = self.db.query(Extension)
        if status:
            query = query.filter(Extension.status == status)
        return query.order_by(Extension.name).all()

    # --- Extension Data Methods ---
    # These could belong to a separate ExtensionDataRepository, but since they are tight
    # coupled to Extension, keeping them here or in a separate one is a choice.
    # For strict SRP, let's keep them somewhat separate or make clear methods.
    
    def get_data_entry(self, extension_id: str, key: str) -> Optional[ExtensionData]:
        return self.db.query(ExtensionData).filter(
            ExtensionData.extension_id == extension_id,
            ExtensionData.key == key
        ).first()

    def list_data_entries(self, extension_id: str, prefix: Optional[str] = None) -> List[ExtensionData]:
        query = self.db.query(ExtensionData).filter(ExtensionData.extension_id == extension_id)
        if prefix:
            query = query.filter(ExtensionData.key.startswith(prefix))
        return query.order_by(ExtensionData.key).all()
        
    def create_or_update_data(self, extension_id: str, key: str, value: dict, id_gen_func) -> ExtensionData:
        entry = self.get_data_entry(extension_id, key)
        if entry:
            entry.value = value
            # entry.updated_at is handled by onupdate in model? Or manually
            # Model has onupdate=datetime.utcnow, so it should auto update
        else:
            entry = ExtensionData(
                id=id_gen_func(),
                extension_id=extension_id,
                key=key,
                value=value
            )
            self.db.add(entry)
        self.db.commit()
        return entry

    def delete_data_entry(self, extension_id: str, key: str) -> bool:
        entry = self.get_data_entry(extension_id, key)
        if entry:
            self.db.delete(entry)
            self.db.commit()
            return True
        return False
    
    # --- Audit Methods ---
    def add_audit_log(self, audit: ExtensionNetworkAudit):
        self.db.add(audit)
        self.db.commit()
        
    def list_audit_logs(
        self, 
        limit: int, 
        offset: int, 
        extension_id: Optional[str] = None, 
        extension_name: Optional[str] = None,
        allowed_only: Optional[bool] = None,
        blocked_only: Optional[bool] = None
    ) -> List[ExtensionNetworkAudit]:
        query = self.db.query(ExtensionNetworkAudit)
        
        if extension_id:
            query = query.filter(ExtensionNetworkAudit.extension_id == extension_id)
        if extension_name:
            query = query.filter(ExtensionNetworkAudit.extension_name == extension_name)
        
        if allowed_only:
            query = query.filter(ExtensionNetworkAudit.allowed == True)
        elif blocked_only:
            query = query.filter(ExtensionNetworkAudit.allowed == False)
            
        return query.order_by(ExtensionNetworkAudit.created_at.desc()).offset(offset).limit(limit).all()

    def count_audit_logs(
        self, 
        extension_id: Optional[str] = None,
        extension_name: Optional[str] = None,
        allowed_only: Optional[bool] = None,
        blocked_only: Optional[bool] = None
    ) -> int:
        query = self.db.query(ExtensionNetworkAudit)
        if extension_id:
            query = query.filter(ExtensionNetworkAudit.extension_id == extension_id)
        if extension_name:
            query = query.filter(ExtensionNetworkAudit.extension_name == extension_name)
        if allowed_only:
            query = query.filter(ExtensionNetworkAudit.allowed == True)
        elif blocked_only:
            query = query.filter(ExtensionNetworkAudit.allowed == False)
        return query.count()
