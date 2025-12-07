from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ...db.database import get_db
from ...services.run_service import RunService
from ...core.schemas import TraceIngest, IngestResponse

router = APIRouter(prefix="/api/traces", tags=["traces"])

def get_service(db: Session = Depends(get_db)) -> RunService:
    return RunService(db)

@router.post("", response_model=IngestResponse)
def ingest_trace(trace: TraceIngest, service: RunService = Depends(get_service)):
    """Digest a trace from langgraph. Upserts if run_id exists."""
    result = service.ingest_trace(trace)
    return IngestResponse(**result)
