from services.adaptive_engine import SESSIONS

import logging
logging.basicConfig(level=logging.DEBUG)
from typing import Dict, List

from pydantic import BaseModel

# existing imports above…

from services.recommender import (
    CareerClusterRecommender,
    ClusterRecommendation,
)

# app.py
from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware

from typing import Dict, List
from pydantic import BaseModel

# ---- MBTI services ----
from services.adaptive_engine import (
    start_session as mbti_start_session,
    capture_response as mbti_capture,
    get_next_question as mbti_next_question,
    get_session_responses as mbti_get_responses,
    end_session as mbti_end_session,
)
from services.mbti_inference import compute_final_result as mbti_compute

# ---- RIASEC services ----
from services.riasec import (
    start_session as riasec_start_session,
    capture_answer as riasec_capture,
    compute_result as riasec_compute,
    end_session as riasec_end_session,
)

# ---- Career Cluster Recommender ----
from services.recommender import (
    CareerClusterRecommender,
    ClusterRecommendation,
)


app = FastAPI(title="IP_MBTI_HOLLAND API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)

# --- Create global recommender instance ---

cluster_recommender = CareerClusterRecommender(alpha=0.3, beta=0.7)

# ============================================================
# Health
# ============================================================
@app.get("/health")
def health():
    return {"ok": True, "message": "API up"}


# ============================================================
# MBTI
# ============================================================
@app.post("/api/v1/mbti/sessionStart/{user_id}")
def mbti_session_start(user_id: str):
    try:
        payload = mbti_start_session(user_id)        # creates session
        session_id = payload["sessionID"]            # pull it out
        print("Session created:", session_id)
        print("Sessions after create:", list(SESSIONS.keys()))
        return payload
    except Exception as e:
        raise HTTPException(500, str(e))


@app.post("/api/v1/mbti/captureRes/{session_id}")
def mbti_capture_res(session_id: str, payload: dict = Body(...)):
    print("Capture called with session_id:", session_id)
    print("Sessions in memory:", list(SESSIONS.keys()))
    print("Requested session_id:", session_id)
    try:
        qid = str(payload.get("questionID"))
        ans = str(payload.get("answer", "no"))
        print("About to capture:", session_id, qid, ans)
        mbti_capture(session_id, qid, ans)          # record answer
        print("Capture succeeded, now getting next question")
        return mbti_next_question(session_id)
    except KeyError as ke:
        print("KeyError inside capture:", ke)
        raise HTTPException(404, f"Session not found – {ke}")
    except Exception as e:
        print("Other error:", e)
        raise HTTPException(500, str(e))


@app.post("/api/v1/mbti/getQues/{session_id}")
def mbti_get_ques(session_id: str):
    try:
        return mbti_next_question(session_id)
    except KeyError:
        raise HTTPException(404, "Session not found")
    except Exception as e:
        raise HTTPException(500, str(e))


@app.post("/api/v1/mbti/result/{session_id}")
def mbti_result(session_id: str):
    try:
        resps = mbti_get_responses(session_id)
        return mbti_compute(resps)
    except KeyError:
        raise HTTPException(404, "Session not found")
    except Exception as e:
        raise HTTPException(500, str(e))


@app.post("/api/v1/mbti/endSession/{session_id}")
def mbti_end(session_id: str):
    mbti_end_session(session_id)
    return {"success": True}


# ============================================================
# RIASEC
# ============================================================
@app.post("/api/v1/riasec/sessionStart/{user_id}")
def riasec_session_start(user_id: str):
    try:
        return riasec_start_session(user_id)
    except Exception as e:
        raise HTTPException(500, str(e))


@app.post("/api/v1/riasec/captureRes/{session_id}")
def riasec_capture_endpoint(session_id: str, payload: dict = Body(...)):
    try:
        # payload example: {"questionID": "24", "value": 5}
        qid = str(payload["questionID"])
        val = int(payload["value"])
        print("capture_endpoint unpacked:", qid, val)
        return riasec_capture(session_id, qid, val)
    except KeyError as ke:
        error_msg = str(ke)
        if "Session not found" in error_msg:
            raise HTTPException(404, f"Session expired or not found. Please restart the quiz. Session ID: {session_id[:20]}...")
        raise HTTPException(404, f"Missing key – {ke}")
    except Exception as e:
        import traceback
        error_detail = str(e)
        print(f"RIASEC capture error: {error_detail}")
        print(traceback.format_exc())
        raise HTTPException(500, f"RIASEC capture failed: {error_detail}")


@app.post("/api/v1/riasec/result/{session_id}")
def riasec_result(session_id: str):
    try:
        return riasec_compute(session_id)
    except KeyError:
        raise HTTPException(404, "Session not found")
    except Exception as e:
        raise HTTPException(500, str(e))


@app.post("/api/v1/riasec/endSession/{session_id}")
def riasec_end(session_id: str):
    return riasec_end_session(session_id)


# ============================================================
# Career Cluster Recommendation
# ============================================================

# --- Pydantic models for request/response ---

class ClusterRequest(BaseModel):
    mbti: str                      # e.g. "ENFJ"
    riasec_raw: Dict[str, float]   # e.g. {"R": 8, "I": 14, "A": 24, "S": 20, "E": 12, "C": 6}


class ClusterResponseItem(BaseModel):
    cluster: str
    probability: float
    explanation: str
    icon: str = "🎯"
    short_description: str = ""
    why_it_fits: str = ""
    natural_skills: List[str] = []
    growth_skills: List[str] = []
    spark_interest: str = ""





# ============ CAREER CLUSTER RECOMMENDER ============

@app.post(
    "/api/v1/cluster/recommend",
    response_model=List[ClusterResponseItem],
)
def cluster_recommend(payload: ClusterRequest):
    """
    Combine MBTI type + raw RIASEC scores and return
    top-3 career clusters with probabilities.
    """
    try:
        recs = cluster_recommender.recommend(
            mbti_type=payload.mbti,
            riasec_raw=payload.riasec_raw,
            top_k=3,
        )
        return [
            ClusterResponseItem(
                cluster=r.cluster,
                probability=r.probability,
                explanation=r.explanation,
                icon=r.icon,
                short_description=r.short_description,
                why_it_fits=r.why_it_fits,
                natural_skills=r.natural_skills,
                growth_skills=r.growth_skills,
                spark_interest=r.spark_interest,
            )
            for r in recs
        ]
    except Exception as e:
        raise HTTPException(500, str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)

