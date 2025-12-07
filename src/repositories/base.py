from typing import Generic, TypeVar, Type, Optional, List, Any
from sqlalchemy.orm import Session

T = TypeVar("T")

class BaseRepository(Generic[T]):
    """Base repository implementing common CRUD operations."""
    
    def __init__(self, db: Session, model: Type[T]):
        self.db = db
        self.model = model

    def get(self, id: Any) -> Optional[T]:
        return self.db.query(self.model).filter(self.model.id == id).first()

    def list(self, skip: int = 0, limit: int = 100) -> List[T]:
        return self.db.query(self.model).offset(skip).limit(limit).all()

    def create(self, obj: T) -> T:
        self.db.add(obj)
        self.db.commit()
        self.db.refresh(obj)
        return obj

    def update(self, db_obj: T, obj_in: Any) -> T:
        # Simple update logic, can be extended
        for field in obj_in:
            if hasattr(db_obj, field):
                setattr(db_obj, field, obj_in[field])
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj

    def delete(self, id: Any) -> T:
        obj = self.get(id)
        if obj:
            self.db.delete(obj)
            self.db.commit()
        return obj
