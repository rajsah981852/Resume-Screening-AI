"""
main.py — ResumeAi FastAPI Application
"""
from fastapi import FastAPI, UploadFile, File, Form, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import os

from database import db
from auth import (
    hash_password, verify_password, create_token,
    get_current_user, require_admin, UserInDB
)
from parser import extract_text
from model import analyze_resume
from admin import router as admin_router

app = FastAPI(title="ResumeAi API", version="1.0.0")

# ── CORS ───────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # In production: restrict to your domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Include admin router ───────────────────────────────────
app.include_router(admin_router)


# ── Pydantic models ────────────────────────────────────────

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


# ── Health ─────────────────────────────────────────────────

@app.get("/")
def root():
    return {"status": "ok", "service": "ResumeAi API"}


# ── Auth routes ────────────────────────────────────────────

@app.post("/register")
def register(req: RegisterRequest):
    req.email = req.email.lower().strip()

    if not req.name or not req.email or not req.password:
        raise HTTPException(status_code=400, detail="All fields are required.")

    if len(req.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters.")

    if db.users.find_one({"email": req.email}):
        raise HTTPException(status_code=409, detail="An account with this email already exists.")

    # Check if this is the first user — make them admin
    role = "admin" if db.users.count_documents({}) == 0 else "user"

    user_doc = {
        "name": req.name.strip(),
        "email": req.email,
        "password": hash_password(req.password),
        "role": role,
    }
    db.users.insert_one(user_doc)

    return {"message": "Account created successfully.", "role": role}


@app.post("/login")
def login(req: LoginRequest):
    req.email = req.email.lower().strip()
    user = db.users.find_one({"email": req.email})

    if not user or not verify_password(req.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    token = create_token({
        "sub": str(user["_id"]),
        "email": user["email"],
        "role": user["role"],
        "name": user.get("name", ""),
    })

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "_id": str(user["_id"]),
            "name": user.get("name", ""),
            "email": user["email"],
            "role": user["role"],
        }
    }


# ── Resume Analysis ────────────────────────────────────────

@app.post("/analyze")
async def analyze(
    file: UploadFile = File(...),
    job_description: str = Form(...),
    current_user: UserInDB = Depends(get_current_user),
):
    # Validate file type
    allowed_types = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ]
    allowed_exts = [".pdf", ".docx"]
    ext = os.path.splitext(file.filename)[1].lower()

    if file.content_type not in allowed_types and ext not in allowed_exts:
        raise HTTPException(status_code=400, detail="Only PDF and DOCX files are supported.")

    if not job_description.strip():
        raise HTTPException(status_code=400, detail="Job description cannot be empty.")

    # Read file bytes
    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:  # 10MB limit
        raise HTTPException(status_code=413, detail="File size exceeds 10MB limit.")

    # Extract text from resume
    try:
        resume_text = extract_text(contents, file.filename)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Could not read file: {str(e)}")

    if not resume_text.strip():
        raise HTTPException(status_code=422, detail="Could not extract text from the uploaded file. Please ensure it is not scanned/image-based.")

    # Run AI analysis
    try:
        result = analyze_resume(resume_text, job_description)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

    # Save to DB
    from datetime import datetime, timezone
    record = {
        "user_id": str(current_user.id),
        "file_name": file.filename,
        "score": result["score"],
        "skills_found": result["skills_found"],
        "missing_skills": result["missing_skills"],
        "suggestions": result["suggestions"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    db.resumes.insert_one(record)

    return {
        "file_name": file.filename,
        "score": result["score"],
        "skills_found": result["skills_found"],
        "missing_skills": result["missing_skills"],
        "suggestions": result["suggestions"],
    }


# ── History ────────────────────────────────────────────────

@app.get("/history")
def get_history(current_user: UserInDB = Depends(get_current_user)):
    records = list(
        db.resumes.find({"user_id": str(current_user.id)})
        .sort("created_at", -1)
        .limit(50)
    )
    for r in records:
        r["_id"] = str(r["_id"])
    return records


# ── Entry point ────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
