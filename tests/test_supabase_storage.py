"""
Integration test suite for Supabase storage across all entities:
facilities, assessments, assessment_activities, circular_recommendations,
chat_sessions, and chat_messages.
"""

import pytest
import asyncio
from backend.services import supabase_service


@pytest.mark.anyio
async def test_supabase_configured():
    assert supabase_service.is_configured() is True


@pytest.mark.anyio
async def test_supabase_live_storage_connectivity():
    """
    Run end-to-end test writing and verifying sample records in:
    facilities, assessments, assessment_activities, circular_recommendations,
    chat_sessions, and chat_messages.
    """
    result = await supabase_service.test_storage_connectivity()
    assert result["status"] in ["success", "partial_success"]
    assert result["supabase_configured"] is True
    
    tables = result["tables_tested"]
    assert "facilities" in tables
    assert "assessments" in tables
    assert "assessment_activities" in tables
    assert "circular_recommendations" in tables
    assert "chat_sessions" in tables
    assert "chat_messages" in tables
    
    assert tables["facilities"]["status"] == "stored_and_verified"
    assert tables["assessments"]["status"] == "stored_and_verified"
    assert tables["chat_messages"]["status"] == "stored_and_verified"
