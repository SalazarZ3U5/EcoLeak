"""
FastAPI application entry point.

Initializes the app, mounts all routers, loads data, and syncs ChromaDB
on startup. Run with:

    uvicorn backend.main:app --reload
"""

from __future__ import annotations

import logging
import sys
from contextlib import asynccontextmanager
from pathlib import Path

# Ensure project root is in sys.path so 'backend' can be imported whether run from root or backend/
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# Load environment variables before anything else
load_dotenv()

from backend.api import health, analyze, chat, recommendations, audits
from backend.services import csv_loader, chroma_service, auth_service, supabase_service

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Lifespan — startup / shutdown
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load CSV data and sync ChromaDB on startup."""
    logger.info("=== Starting EcoLeak Platform ===")

    # Stage 1: Load CSV data
    try:
        csv_loader.reload_data()
        ef_count = len(csv_loader.get_emission_factors())
        ci_count = len(csv_loader.get_circular_interventions())
        logger.info("CSV data loaded: %d emission factors, %d circular interventions", ef_count, ci_count)
    except Exception as e:
        logger.error("Failed to load CSV data: %s", e)
        raise

    # Stage 2: Sync ChromaDB
    try:
        doc_count = chroma_service.sync_collection()
        logger.info("ChromaDB synced: %d documents", doc_count)
    except Exception as e:
        logger.error("Failed to sync ChromaDB: %s", e)
        # Non-fatal — circular recommendations will be degraded

    # Stage 3: Initialize authentication services
    auth_status = auth_service.get_auth_status()
    logger.info(
        "Auth services: Firebase=%s, Supabase=%s",
        auth_status["firebase_admin_configured"],
        auth_status["supabase_backend_configured"],
    )
    if supabase_service.is_configured():
        logger.info("Supabase audit persistence: ENABLED")
    else:
        logger.info("Supabase audit persistence: DISABLED (no credentials)")

    logger.info("=== EcoLeak Startup complete ===")
    yield
    logger.info("=== EcoLeak Shutting down ===")


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

app = FastAPI(
    title="EcoLeak — Industrial Emission Leak-Point Detector",
    description=(
        "Detects carbon emission hotspots for SME factories and recommends "
        "circular economy alternatives with CO2e savings and financial impact."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow all origins for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routers
app.include_router(health.router)
app.include_router(analyze.router)
app.include_router(chat.router)
app.include_router(recommendations.router)
app.include_router(audits.router)

# ---------------------------------------------------------------------------
# Frontend — serve static files and index.html
# ---------------------------------------------------------------------------

_FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend"
_DIST_DIR = _FRONTEND_DIR / "dist"

if _DIST_DIR.exists():
    # Production / Built React SPA
    if (_DIST_DIR / "assets").exists():
        app.mount("/assets", StaticFiles(directory=str(_DIST_DIR / "assets")), name="assets")
    app.mount("/static", StaticFiles(directory=str(_FRONTEND_DIR)), name="static")

    @app.get("/")
    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str = ""):
        """Serve the built React SPA."""
        # Never intercept API or health endpoints
        if full_path.startswith("api") or full_path.startswith("health") or full_path.startswith("docs") or full_path.startswith("openapi.json"):
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Endpoint not found")
        return FileResponse(str(_DIST_DIR / "index.html"))

    logger.info("React SPA frontend mounted from %s", _DIST_DIR)
elif _FRONTEND_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(_FRONTEND_DIR)), name="static")

    @app.get("/")
    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str = ""):
        """Serve the frontend SPA."""
        if full_path.startswith("api") or full_path.startswith("health") or full_path.startswith("docs") or full_path.startswith("openapi.json"):
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Endpoint not found")
        return FileResponse(str(_FRONTEND_DIR / "index.html"))

    logger.info("Frontend mounted from %s", _FRONTEND_DIR)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)

