from fastapi import APIRouter, HTTPException
from backend.models.schemas import MatchRequest, MatchResponse
from backend.services.openai_service import match_profile

router = APIRouter()


@router.post("/api/match", response_model=MatchResponse)
async def match(request: MatchRequest):
    try:
        return await match_profile(request.profile, request.job_description, request.cv_text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
