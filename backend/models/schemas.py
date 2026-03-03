from pydantic import BaseModel


class ProfileData(BaseModel):
    name: str = ""
    headline: str = ""
    location: str = ""
    about: str = ""
    experience: str = ""
    education: str = ""
    skills: str = ""
    certifications: str = ""
    recommendations: str = ""
    url: str = ""


class MatchRequest(BaseModel):
    profile: ProfileData
    job_description: str
    cv_text: str = ""


class AnalysisResponse(BaseModel):
    score: int
    summary: str
    strengths: list[str]
    suggestions: list[str]
    skills_found: list[str]


class MatchResponse(BaseModel):
    match_percentage: int
    summary: str
    matching_skills: list[str]
    missing_skills: list[str]
    suggestions: list[str]
