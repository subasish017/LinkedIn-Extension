from fastapi import APIRouter, HTTPException, UploadFile, File
from backend.services.cv_parser import extract_text_from_cv

router = APIRouter()

MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB
ALLOWED_EXTENSIONS = (".pdf", ".docx")


@router.post("/api/upload-cv")
async def upload_cv(file: UploadFile = File(...)):
    filename = file.filename or ""
    if not filename.lower().endswith(ALLOWED_EXTENSIONS):
        raise HTTPException(status_code=400, detail="Only PDF and DOCX files are supported.")

    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 5 MB.")

    try:
        cv_text = extract_text_from_cv(file_bytes, filename)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Could not parse file: {e}")

    if not cv_text.strip():
        raise HTTPException(status_code=422, detail="No text could be extracted from the file.")

    return {"cv_text": cv_text}
