"""
Storage helper for extensions.

Simple api for extensions to stash persistent data without touching the db directly.

Usage:
    from src.extensions.storage import ExtensionStorage
    
    storage = ExtensionStorage("my-extension")
    storage.set("preferences", {"theme": "dark"})
    prefs = storage.get("preferences")
"""

from typing import Any, Optional, List, Dict
from datetime import datetime
from ..db.database import SessionLocal
from ..db.models import Extension, ExtensionData
import uuid


class ExtensionStorage:
    """Key-value store for extensions.
    
    Namespace isolated per extension. Stored in postgres.
    """
    
    def __init__(self, extension_name: str):
        """Setup storage for an extension."""
        self.extension_name = extension_name
        self._extension_id: Optional[str] = None
    
    def _get_extension_id(self) -> str:
        """Get the db id for the ext, cache it."""
        if self._extension_id:
            return self._extension_id
        
        db = SessionLocal()
        try:
            ext = db.query(Extension).filter(
                Extension.name == self.extension_name
            ).first()
            if not ext:
                raise ValueError(f"Extension '{self.extension_name}' MIA")
            self._extension_id = ext.id
            return self._extension_id
        finally:
            db.close()
    
    def get(self, key: str, default: Any = None) -> Any:
        """Get value by key, or default if missing."""
        db = SessionLocal()
        try:
            entry = db.query(ExtensionData).filter(
                ExtensionData.extension_id == self._get_extension_id(),
                ExtensionData.key == key
            ).first()
            
            if entry is None:
                return default
            return entry.value
        finally:
            db.close()
    
    def set(self, key: str, value: Any) -> bool:
        """Save a value. Must be json serializable."""
        db = SessionLocal()
        try:
            ext_id = self._get_extension_id()
            entry = db.query(ExtensionData).filter(
                ExtensionData.extension_id == ext_id,
                ExtensionData.key == key
            ).first()
            
            if entry:
                entry.value = value
                entry.updated_at = datetime.utcnow()
            else:
                entry = ExtensionData(
                    id=str(uuid.uuid4()),
                    extension_id=ext_id,
                    key=key,
                    value=value
                )
                db.add(entry)
            
            db.commit()
            return True
        except Exception as e:
            db.rollback()
            raise e
        finally:
            db.close()
    
    def delete(self, key: str) -> bool:
        """Nuke a key."""
        db = SessionLocal()
        try:
            entry = db.query(ExtensionData).filter(
                ExtensionData.extension_id == self._get_extension_id(),
                ExtensionData.key == key
            ).first()
            
            if entry:
                db.delete(entry)
                db.commit()
                return True
            return False
        finally:
            db.close()
    
    def list(self, prefix: Optional[str] = None) -> List[str]:
        """List keys, maybe filter with prefix."""
        db = SessionLocal()
        try:
            query = db.query(ExtensionData.key).filter(
                ExtensionData.extension_id == self._get_extension_id()
            )
            
            if prefix:
                query = query.filter(ExtensionData.key.startswith(prefix))
            
            return [row.key for row in query.order_by(ExtensionData.key).all()]
        finally:
            db.close()
    
    def get_all(self, prefix: Optional[str] = None) -> Dict[str, Any]:
        """Get all key-value pairs.
        
        Args:
            prefix: Optional prefix to filter keys
            
        Returns:
            Dictionary of all key-value pairs
        """
        db = SessionLocal()
        try:
            query = db.query(ExtensionData).filter(
                ExtensionData.extension_id == self._get_extension_id()
            )
            
            if prefix:
                query = query.filter(ExtensionData.key.startswith(prefix))
            
            return {
                entry.key: entry.value 
                for entry in query.order_by(ExtensionData.key).all()
            }
        finally:
            db.close()
    
    def clear(self) -> int:
        """Delete all data for this extension.
        
        Returns:
            Number of keys deleted
        """
        db = SessionLocal()
        try:
            count = db.query(ExtensionData).filter(
                ExtensionData.extension_id == self._get_extension_id()
            ).delete()
            db.commit()
            return count
        finally:
            db.close()
