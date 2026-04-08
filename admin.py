"""
admin.py — Admin-only API routes
"""
from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId

from database import db
from auth import UserInDB, require_admin

router = APIRouter(prefix="/admin", tags=["admin"])


def serialize_user(u: dict) -> dict:
    return {
        "_id": str(u["_id"]),
        "name": u.get("name", ""),
        "email": u.get("email", ""),
        "role": u.get("role", "user"),
    }


def serialize_resume(r: dict) -> dict:
    # Optionally enrich with user email
    user_email = ""
    try:
        uid = r.get("user_id")
        if uid:
            user = db.users.find_one({"_id": ObjectId(uid)})
            if user:
                user_email = user.get("email", "")
    except Exception:
        pass

    return {
        "_id": str(r["_id"]),
        "user_id": r.get("user_id", ""),
        "user_email": user_email,
        "file_name": r.get("file_name", ""),
        "score": r.get("score", 0),
        "skills_found": r.get("skills_found", []),
        "missing_skills": r.get("missing_skills", []),
        "suggestions": r.get("suggestions", []),
        "created_at": r.get("created_at", ""),
    }


# ── GET /admin/users ───────────────────────────────────────

@router.get("/users")
def get_all_users(admin: UserInDB = Depends(require_admin)):
    users = list(db.users.find({}).sort("_id", -1))
    return [serialize_user(u) for u in users]


# ── GET /admin/resumes ─────────────────────────────────────

@router.get("/resumes")
def get_all_resumes(admin: UserInDB = Depends(require_admin)):
    resumes = list(db.resumes.find({}).sort("created_at", -1).limit(200))
    return [serialize_resume(r) for r in resumes]


# ── DELETE /admin/user/{id} ────────────────────────────────

@router.delete("/user/{user_id}")
def delete_user(user_id: str, admin: UserInDB = Depends(require_admin)):
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="You cannot delete your own account.")

    try:
        oid = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user ID.")

    user = db.users.find_one({"_id": oid})
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    if user.get("role") == "admin":
        raise HTTPException(status_code=403, detail="Cannot delete an admin account.")

    # Delete user and their resumes
    db.resumes.delete_many({"user_id": user_id})
    db.users.delete_one({"_id": oid})

    return {"message": f"User '{user.get('email')}' and their resume records deleted."}


# ── DELETE /admin/resume/{id} ──────────────────────────────

@router.delete("/resume/{resume_id}")
def delete_resume(resume_id: str, admin: UserInDB = Depends(require_admin)):
    try:
        oid = ObjectId(resume_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid resume ID.")

    resume = db.resumes.find_one({"_id": oid})
    if not resume:
        raise HTTPException(status_code=404, detail="Resume record not found.")

    db.resumes.delete_one({"_id": oid})

    return {"message": f"Resume record '{resume.get('file_name')}' deleted."}


# ── GET /admin/stats ───────────────────────────────────────

@router.get("/stats")
def get_stats(admin: UserInDB = Depends(require_admin)):
    total_users = db.users.count_documents({})
    total_resumes = db.resumes.count_documents({})

    # Average score
    pipeline = [{"$group": {"_id": None, "avg": {"$avg": "$score"}}}]
    agg = list(db.resumes.aggregate(pipeline))
    avg_score = round(agg[0]["avg"], 1) if agg else 0.0

    # Recent resumes (last 10)
    recent = list(db.resumes.find({}).sort("created_at", -1).limit(10))
    recent_data = [
        {
            "_id": str(r["_id"]),
            "file_name": r.get("file_name", ""),
            "score": r.get("score", 0),
            "created_at": r.get("created_at", ""),
        }
        for r in recent
    ]

    return {
        "total_users": total_users,
        "total_resumes": total_resumes,
        "average_score": avg_score,
        "recent_resumes": recent_data,
    }
