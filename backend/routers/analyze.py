from fastapi import APIRouter, HTTPException
from backend.models.schemas import ProfileData, AnalysisResponse
from backend.services.openai_service import analyze_profile

router = APIRouter()


@router.post("/api/analyze", response_model=AnalysisResponse)
async def analyze(profile: ProfileData):
    try:
        return await analyze_profile(profile)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
