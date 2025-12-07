import os
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

from .routers import runs, traces, extensions, agents, mcp_server
# Future: from .routers import agents, data

from ..db.database import init_db, SessionLocal
from ..extensions.manager import ExtensionManager
from ..core.globals import set_extension_manager

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize DB tables - moved to explicit migration/seed step to avoid Gunicorn worker race conditions
# init_db()

# --- Lifecycle ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle events."""
    # Startup
    logger.info("Starting up Sagentic...")
    
    # Initialize extension manager
    manager = ExtensionManager(app)
    set_extension_manager(manager)
    
    # Load enabled extensions backends
    db = SessionLocal()
    try:
        # We need to access the repo logic. 
        # Since we haven't strictly separated models from db yet (we import models in repo), this is fine.
        from ..repositories.extension_repository import ExtensionRepository
        repo = ExtensionRepository(db)
        enabled_exts = repo.list_extensions(status="enabled")
        
        for ext in enabled_exts:
             if ext.has_backend and ext.manifest.get("backend_entry"):
                logger.info(f"Loading extension backend: {ext.name}")
                await manager.load_backend(ext.id, ext.name, ext.version, ext.manifest["backend_entry"])
    except Exception as e:
        logger.error(f"Error loading extensions on startup: {e}")
    finally:
        db.close()
        
    yield
    
    # Shutdown
    logger.info("Shutting down...")


app = FastAPI(
    title="Sagentic API",
    description="Agentic Application Platform",
    version="0.1.0",
    lifespan=lifespan
)

# --- Middleware ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Routers ---
app.include_router(runs.router)
app.include_router(traces.router)
app.include_router(extensions.router)
app.include_router(agents.router)
app.include_router(mcp_server.router)

# --- Static ---
# Serve frontend if built
# Frontend dist is likely in project_root/frontend/dist
# Currently __file__ is src/api/server.py
# So ../../../frontend/dist
# Static file serving
# Prioritize 'static' dir in CWD (Docker), fallback to relative 'frontend/dist' (Local)
STATIC_DIR = os.path.join(os.getcwd(), "static")
if not os.path.exists(STATIC_DIR):
    FRONTEND_DIST = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "frontend", "dist")
    if os.path.exists(FRONTEND_DIST):
        STATIC_DIR = FRONTEND_DIST
    else:
        STATIC_DIR = None

if STATIC_DIR:
    app.mount("/assets", StaticFiles(directory=os.path.join(STATIC_DIR, "assets")), name="assets")
    
    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        # API fallthrough check
        if full_path.startswith("api/"):
            return JSONResponse(status_code=404, content={"detail": "Not Found"})

        path = os.path.join(STATIC_DIR, full_path)
        if os.path.exists(path) and os.path.isfile(path):
            return FileResponse(path)
        
        # Fallback to index.html for SPA routing
        return FileResponse(os.path.join(STATIC_DIR, "index.html"))
else:
    @app.get("/")
    def read_root():
        return {"message": "Sagentic Backend Running. Frontend not found (run 'npm run build' in frontend/)."}
