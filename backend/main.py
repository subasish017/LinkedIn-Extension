from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.routers import analyze, match, upload_cv

app = FastAPI(title="LinkedIn Profile Analyzer")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analyze.router)
app.include_router(match.router)
app.include_router(upload_cv.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
