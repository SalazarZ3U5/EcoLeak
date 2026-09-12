"""
Authentication service — Firebase Admin SDK + Supabase JWT verification.

Provides a FastAPI dependency that extracts and verifies Bearer tokens from
the Authorization header. Supports both Firebase ID tokens and Supabase
access tokens with automatic provider detection.

Architecture:
  - Firebase Admin SDK verifies tokens using Google's public key infrastructure.
  - Supabase tokens are verified via the Supabase Auth API.
  - If neither provider is configured, auth is silently disabled (graceful degradation).
  - The LLM is NEVER involved in authentication decisions.
"""

from __future__ import annotations

import json
import logging
import os
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from fastapi import Header, HTTPException

load_dotenv()

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Module-level state
# ---------------------------------------------------------------------------

_firebase_app = None
_firebase_initialized = False
_firebase_init_attempted = False


# ---------------------------------------------------------------------------
# Firebase Admin SDK initialization
# ---------------------------------------------------------------------------

def _init_firebase():
    """
    Lazy-initialize Firebase Admin SDK.
    
    Supports two modes:
      1. Service account JSON file (FIREBASE_ADMIN_KEY_PATH env var)
      2. Project ID only (FIREBASE_PROJECT_ID or from fb.json) — uses
         Google's public key endpoint for token verification.
    """
    global _firebase_app, _firebase_initialized, _firebase_init_attempted

    if _firebase_init_attempted:
        return _firebase_initialized

    _firebase_init_attempted = True

    try:
        import firebase_admin
        from firebase_admin import credentials

        # Mode 1: Service account key file
        key_path = os.getenv("FIREBASE_ADMIN_KEY_PATH", "").strip()
        if key_path and Path(key_path).exists():
            cred = credentials.Certificate(key_path)
            _firebase_app = firebase_admin.initialize_app(cred)
            _firebase_initialized = True
            logger.info("Firebase Admin initialized with service account: %s", key_path)
            return True

        # Mode 2: Project ID only (uses Google public keys for verification)
        project_id = os.getenv("FIREBASE_PROJECT_ID", "").strip()
        if not project_id:
            # Try to read from the frontend .env VITE_FIREBASE_PROJECT_ID
            project_id = os.getenv("VITE_FIREBASE_PROJECT_ID", "").strip()

        if project_id:
            # Initialize with just the project ID — Firebase Admin SDK will
            # use Google's public key endpoint to verify tokens
            options = {"projectId": project_id}
            _firebase_app = firebase_admin.initialize_app(options=options)
            _firebase_initialized = True
            logger.info("Firebase Admin initialized with project ID: %s", project_id)
            return True

        logger.info("Firebase Admin not configured — no service account or project ID found")
        return False

    except Exception as e:
        logger.warning("Firebase Admin initialization failed: %s", e)
        return False


def verify_firebase_token(token: str) -> Optional[dict]:
    """
    Verify a Firebase ID token and return decoded claims.

    Returns:
        {"uid": str, "email": str, "name": str, "provider": "firebase"} or None
    """
    if not _init_firebase():
        return None

    try:
        from firebase_admin import auth

        decoded = auth.verify_id_token(token)
        return {
            "uid": decoded.get("uid", decoded.get("user_id", "")),
            "email": decoded.get("email", ""),
            "name": decoded.get("name", decoded.get("email", "").split("@")[0]),
            "provider": "firebase",
            "picture": decoded.get("picture", ""),
            "firebase_claims": decoded,
        }
    except Exception as e:
        logger.debug("Firebase token verification failed: %s", e)
        return None


# ---------------------------------------------------------------------------
# Supabase token verification
# ---------------------------------------------------------------------------

def verify_supabase_token(token: str) -> Optional[dict]:
    """
    Verify a Supabase access token via the Supabase Auth API.

    Returns:
        {"uid": str, "email": str, "name": str, "provider": "supabase"} or None
    """
    supabase_url = os.getenv("SUPABASE_URL", "").strip()
    supabase_key = os.getenv("SUPABASE_KEY", "").strip()

    if not supabase_url or not supabase_key:
        return None

    try:
        from supabase import create_client

        client = create_client(supabase_url, supabase_key)
        user_response = client.auth.get_user(token)

        if user_response and user_response.user:
            user = user_response.user
            metadata = user.user_metadata or {}
            return {
                "uid": user.id,
                "email": user.email or "",
                "name": metadata.get("full_name", metadata.get("name", user.email or "").split("@")[0]),
                "provider": "supabase",
                "picture": metadata.get("avatar_url", ""),
            }
    except Exception as e:
        logger.debug("Supabase token verification failed: %s", e)

    return None


# ---------------------------------------------------------------------------
# Unified token verification
# ---------------------------------------------------------------------------

def verify_token(token: str) -> dict:
    """
    Verify a Bearer token against all configured auth providers.

    Resolution order:
      1. Firebase Admin SDK
      2. Supabase Auth API

    Returns decoded user claims or raises HTTPException(401).
    """
    if not token or token == "undefined" or token == "null":
        raise HTTPException(
            status_code=401,
            detail="Missing or invalid authentication token.",
        )

    # Try Firebase first
    result = verify_firebase_token(token)
    if result:
        return result

    # Try Supabase
    result = verify_supabase_token(token)
    if result:
        return result

    raise HTTPException(
        status_code=401,
        detail="Invalid or expired authentication token.",
    )


# ---------------------------------------------------------------------------
# FastAPI Dependencies
# ---------------------------------------------------------------------------

async def get_current_user(
    authorization: str = Header(..., alias="Authorization"),
) -> dict:
    """
    Strict auth dependency — returns authenticated user claims or 401.

    Usage:
        @router.get("/protected")
        async def protected_route(user: dict = Depends(get_current_user)):
            ...
    """
    if not authorization:
        raise HTTPException(
            status_code=401,
            detail="Authorization header missing. Bearer token required.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Authorization header must use Bearer scheme.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = authorization[7:]  # Strip "Bearer " prefix
    return verify_token(token)


async def get_current_user_optional(
    authorization: Optional[str] = Header(None, alias="Authorization"),
) -> Optional[dict]:
    """
    Soft auth dependency — returns user claims if valid token present, None otherwise.
    Does NOT block unauthenticated requests. Use for optional features
    like auto-saving audit history.

    Usage:
        @router.post("/api/analyze")
        async def analyze(request: AnalyzeRequest, user: Optional[dict] = Depends(get_current_user_optional)):
            ...
    """
    if not authorization or not authorization.startswith("Bearer "):
        return None

    token = authorization[7:]
    if not token or token in ("undefined", "null", ""):
        return None

    try:
        return verify_token(token)
    except HTTPException:
        # Silently ignore invalid tokens for optional auth
        return None


# ---------------------------------------------------------------------------
# Utility
# ---------------------------------------------------------------------------

def is_firebase_configured() -> bool:
    """Check if Firebase Admin SDK can be initialized."""
    key_path = os.getenv("FIREBASE_ADMIN_KEY_PATH", "").strip()
    if key_path and Path(key_path).exists():
        return True
    project_id = os.getenv("FIREBASE_PROJECT_ID", "").strip() or os.getenv("VITE_FIREBASE_PROJECT_ID", "").strip()
    return bool(project_id)


def is_supabase_configured() -> bool:
    """Check if Supabase backend credentials are available."""
    return bool(
        os.getenv("SUPABASE_URL", "").strip()
        and os.getenv("SUPABASE_KEY", "").strip()
    )


def get_auth_status() -> dict:
    """Return current auth provider configuration status."""
    return {
        "firebase_admin_configured": is_firebase_configured(),
        "supabase_backend_configured": is_supabase_configured(),
        "any_auth_configured": is_firebase_configured() or is_supabase_configured(),
    }
