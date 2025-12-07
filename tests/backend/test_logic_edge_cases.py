
import pytest
from unittest.mock import MagicMock, ANY
from src.services.run_service import RunService
from src.core.schemas import TraceIngest, NodeExecutionCreate
from src.db.models import Run, NodeExecution

def test_run_service_ingest_logic_mocked():
    """Test ingest trace logic using mocks."""
    mock_db = MagicMock()
    service = RunService(mock_db)
    
    # Setup Mocks
    service.repo.get = MagicMock(return_value=None) # No existing run
    
    # Input Trace
    trace = TraceIngest(
        run_id="run-A",
        graph_id="g1",
        nodes=[NodeExecutionCreate(
            node_key="step1", 
            status="started", 
            messages=[],
            started_at="2024-01-01T10:00:00Z" # String format simulation
        )]
    )
    
    # Execute
    service.ingest_trace(trace)
    
    # Verify DB interactions
    # 1. Check Run creation
    assert mock_db.add.call_count >= 2 # Run + Node
    
    # Inspect calls to find Run and Node
    # db.add is called with Run, Node, Messages...
    # We can filter calls
    
    added_objects = [call.args[0] for call in mock_db.add.call_args_list]
    
    run_obj = next((o for o in added_objects if isinstance(o, Run)), None)
    assert run_obj is not None
    assert run_obj.id == "run-A"
    
    node_obj = next((o for o in added_objects if isinstance(o, NodeExecution)), None)
    assert node_obj is not None
    assert node_obj.status == "started"  # This verifies our Logic + Schema fix works!

def test_run_service_merging_logic_mocked():
    """Verify that we DELETE existing run before creating new one (Current Logic)."""
    mock_db = MagicMock()
    service = RunService(mock_db)
    
    # Setup Mock to return existing run
    mock_existing_run = MagicMock()
    service.repo.get = MagicMock(return_value=mock_existing_run)
    service.repo.delete_run_cascade = MagicMock()
    
    trace = TraceIngest(run_id="run-B", nodes=[])
    
    service.ingest_trace(trace)
    
    # Verify Delete called
    service.repo.delete_run_cascade.assert_called_with("run-B")
    # Verify New Create
    assert mock_db.add.called


