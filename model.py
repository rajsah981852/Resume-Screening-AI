"""
model.py — AI resume analysis using sentence-transformers + cosine similarity
"""
import json
import os
import re
from typing import List, Dict, Any

import numpy as np

# ── Load skills database ────────────────────────────────────

_skills_path = os.path.join(os.path.dirname(__file__), "skills.json")
with open(_skills_path, "r") as f:
    ALL_SKILLS: List[str] = json.load(f)

# Pre-build lowercase set + mapping for fast matching
_skills_lower = {s.lower(): s for s in ALL_SKILLS}

# ── Lazy-load sentence transformer ─────────────────────────

_model = None

def get_model():
    global _model
    if _model is None:
        try:
            from sentence_transformers import SentenceTransformer
            print("⏳ Loading sentence-transformers model (first run may take a moment)...")
            _model = SentenceTransformer("all-MiniLM-L6-v2")
            print("✅ Model loaded.")
        except ImportError:
            raise ImportError(
                "sentence-transformers not installed. Run: pip install sentence-transformers"
            )
    return _model


# ── Cosine similarity ───────────────────────────────────────

def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    a = a.flatten()
    b = b.flatten()
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(np.dot(a, b) / (norm_a * norm_b))


# ── Skill extraction ────────────────────────────────────────

def extract_skills(text: str) -> List[str]:
    """
    Find which skills from the skills database appear in the text.
    Uses word-boundary matching for accuracy.
    """
    text_lower = text.lower()
    found = []
    for skill_lower, skill_original in _skills_lower.items():
        # Escape special regex chars (e.g. "C++", "node.js")
        pattern = re.escape(skill_lower)
        if re.search(r'\b' + pattern + r'\b', text_lower):
            found.append(skill_original)
    return list(set(found))


# ── Suggestion generation ────────────────────────────────────

def generate_suggestions(
    score: float,
    skills_found: List[str],
    missing_skills: List[str],
    resume_text: str,
    job_description: str,
) -> List[str]:
    suggestions = []

    if score < 40:
        suggestions.append(
            "Your resume has a low match with this job. Consider tailoring it specifically for this role."
        )
    elif score < 60:
        suggestions.append(
            "Your resume partially matches this role. Highlighting relevant experience more prominently could improve your score."
        )
    elif score < 80:
        suggestions.append(
            "Good match! Focus on quantifying your achievements and adding more job-relevant keywords."
        )
    else:
        suggestions.append(
            "Excellent match! Ensure your resume is well-formatted and your key achievements are visible at the top."
        )

    if missing_skills:
        top_missing = missing_skills[:5]
        suggestions.append(
            f"Consider adding or gaining experience with: {', '.join(top_missing)}. These skills appear in the job description but not in your resume."
        )

    if len(skills_found) < 5:
        suggestions.append(
            "Your resume mentions few matching skills. Try adding a dedicated 'Skills' or 'Technical Skills' section."
        )

    # Check resume length heuristic
    word_count = len(resume_text.split())
    if word_count < 200:
        suggestions.append(
            "Your resume appears short. Consider expanding with more details about your experience, projects, and accomplishments."
        )
    elif word_count > 1200:
        suggestions.append(
            "Your resume is quite long. Consider condensing to 1-2 pages, focusing on the most relevant experience for this role."
        )

    # Generic improvement tip
    suggestions.append(
        "Use action verbs (e.g., 'Developed', 'Led', 'Implemented') and quantify achievements (e.g., 'Reduced load time by 40%') to stand out."
    )

    return suggestions[:5]  # Return max 5 suggestions


# ── Main analysis function ──────────────────────────────────

def analyze_resume(resume_text: str, job_description: str) -> Dict[str, Any]:
    """
    Analyze a resume against a job description.
    Returns score, found skills, missing skills, and suggestions.
    """
    model = get_model()

    # 1. Compute semantic similarity score
    try:
        resume_emb = model.encode([resume_text])
        jd_emb = model.encode([job_description])
        semantic_score = cosine_similarity(resume_emb[0], jd_emb[0])
    except Exception as e:
        raise RuntimeError(f"Embedding failed: {str(e)}")

    # 2. Extract skills from both documents
    resume_skills = extract_skills(resume_text)
    jd_skills = extract_skills(job_description)

    # 3. Skills found = skills in resume that are also in JD
    skills_found = [s for s in resume_skills if s in jd_skills]

    # 4. Missing skills = skills in JD but not in resume
    missing_skills = [s for s in jd_skills if s not in resume_skills]

    # 5. Compute skill overlap score
    if jd_skills:
        skill_overlap = len(skills_found) / len(jd_skills)
    else:
        skill_overlap = 0.5  # No specific skills mentioned in JD

    # 6. Blend semantic + skill scores (60% semantic, 40% skill overlap)
    raw_score = (0.60 * semantic_score + 0.40 * skill_overlap) * 100

    # Clamp to [0, 100]
    final_score = max(0.0, min(100.0, raw_score))

    # 7. Generate suggestions
    suggestions = generate_suggestions(
        score=final_score,
        skills_found=skills_found,
        missing_skills=missing_skills,
        resume_text=resume_text,
        job_description=job_description,
    )

    return {
        "score": round(final_score, 2),
        "skills_found": sorted(skills_found),
        "missing_skills": sorted(missing_skills),
        "suggestions": suggestions,
    }
