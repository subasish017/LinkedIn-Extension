import json
from openai import OpenAI
from backend.config import OPENAI_API_KEY, OPENAI_MODEL
from backend.models.schemas import ProfileData, AnalysisResponse, MatchResponse

client = OpenAI(api_key=OPENAI_API_KEY)

ANALYSIS_PROMPT = """You are a LinkedIn profile analyst. Analyze the following profile and return a JSON object with these exact keys:

- "score": integer 0-100 rating overall profile strength. Scoring criteria:
    - Headline clarity and keywords (0-15)
    - About section depth and storytelling (0-20)
    - Experience detail and impact metrics (0-25)
    - Skills relevance and quantity (0-15)
    - Education and certifications (0-10)
    - Recommendations presence (0-10)
    - Completeness of all sections (0-5)
- "summary": 2-3 sentence overall assessment
- "strengths": array of 3-5 specific strengths found in the profile
- "suggestions": array of 3-5 actionable improvement suggestions
- "skills_found": array of key skills identified from the entire profile

Profile data:
Name: {name}
Headline: {headline}
Location: {location}
About: {about}
Experience: {experience}
Education: {education}
Skills: {skills}
Certifications: {certifications}
Recommendations: {recommendations}

Return ONLY valid JSON, no markdown or extra text."""

MATCH_PROMPT = """You are a job-match analyst. Compare the candidate's LinkedIn profile (and CV/resume if provided) against the job description and return a JSON object with these exact keys:

- "match_percentage": integer 0-100 indicating how well the candidate matches the job
- "summary": 2-3 sentence match assessment
- "matching_skills": array of skills from the profile/CV that match the job requirements
- "missing_skills": array of skills required by the job but missing from the profile/CV
- "suggestions": array of 3-5 actionable suggestions to improve the match

Profile data:
Name: {name}
Headline: {headline}
About: {about}
Experience: {experience}
Education: {education}
Skills: {skills}
Certifications: {certifications}
{cv_section}
Job Description:
{job_description}

Return ONLY valid JSON, no markdown or extra text."""


async def analyze_profile(profile: ProfileData) -> AnalysisResponse:
    prompt = ANALYSIS_PROMPT.format(
        name=profile.name,
        headline=profile.headline,
        location=profile.location,
        about=profile.about,
        experience=profile.experience,
        education=profile.education,
        skills=profile.skills,
        certifications=profile.certifications,
        recommendations=profile.recommendations,
    )

    response = client.chat.completions.create(
        model=OPENAI_MODEL,
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"},
        temperature=0.3,
    )

    data = json.loads(response.choices[0].message.content)
    return AnalysisResponse(**data)


async def match_profile(profile: ProfileData, job_description: str, cv_text: str = "") -> MatchResponse:
    cv_section = ""
    if cv_text.strip():
        cv_section = f"CV/Resume Content:\n{cv_text}\n"

    prompt = MATCH_PROMPT.format(
        name=profile.name,
        headline=profile.headline,
        about=profile.about,
        experience=profile.experience,
        education=profile.education,
        skills=profile.skills,
        certifications=profile.certifications,
        cv_section=cv_section,
        job_description=job_description,
    )

    response = client.chat.completions.create(
        model=OPENAI_MODEL,
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"},
        temperature=0.3,
    )

    data = json.loads(response.choices[0].message.content)
    return MatchResponse(**data)
