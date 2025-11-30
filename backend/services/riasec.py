# backend/services/riasec.py
from __future__ import annotations
import uuid, os, csv, datetime
from typing import Dict, Any, List, Tuple
import pandas as pd
import numpy as np

from .riasec_items import load_riasec_items

QUESTIONS_PATH = "data/riasec_items.csv"

SCALES = ["R", "I", "A", "S", "E", "C"]
TIE_ORDER = ["R", "I", "A", "S", "E", "C"]
LIKERT_MIN, LIKERT_MAX = 1, 5
SHUFFLE_SEED = None


def _load_questions(path: str) -> pd.DataFrame:
    # you already have a loader; this keeps your flexibility
    try:
        return load_riasec_items(path)
    except Exception:
        # fallback to generic loader if needed
        df = (
            pd.read_excel(path)
            if path.lower().endswith(".xlsx")
            else pd.read_csv(path)
        )
        df.columns = [c.strip().lower() for c in df.columns]

        if {"qid", "question", "key"}.issubset(df.columns):
            df = df.rename(
                columns={"qid": "id", "question": "text", "key": "scale"}
            )

        needed = {"id", "text", "scale"}
        if not needed.issubset(df.columns):
            raise ValueError(f"{path} must have columns {needed}")

        df["id"] = df["id"].astype(str)
        df["text"] = df["text"].astype(str)
        df["scale"] = df["scale"].astype(str).str.strip().str.upper()

        bad = set(df["scale"].unique()) - set(SCALES)
        if bad:
            raise ValueError(
                f"Unknown scales in {path}: {bad} (must be one of {SCALES})"
            )
        return df


QDF = _load_questions(QUESTIONS_PATH)
QID_TO_SCALE: Dict[str, str] = {
    str(r["id"]): str(r["scale"]) for _, r in QDF.iterrows()
}

SESSIONS: Dict[str, Dict[str, Any]] = {}


def _ensure_session(session_id: str) -> Dict[str, Any]:
    if session_id not in SESSIONS:
        raise KeyError("Session not found")
    return SESSIONS[session_id]


def start_session(user_id: str) -> Dict[str, Any]:
    session_id = f"riasec-{user_id}-{uuid.uuid4().hex[:6]}"
    order = (
        QDF.sample(frac=1.0, random_state=SHUFFLE_SEED).reset_index(drop=True)
        if SHUFFLE_SEED is not None
        else QDF.sample(frac=1.0).reset_index(drop=True)
    )

    SESSIONS[session_id] = {
        "user_id": str(user_id),
        "answers": {},  # qid -> int
        "idx": 0,
        "order": order,
    }
    return _next_question_payload(session_id)


def _next_question_payload(session_id: str) -> Dict[str, Any]:
    s = _ensure_session(session_id)
    i = s["idx"]
    total = int(len(s["order"]))
    if i >= total:
        return {"sentinel": 1, "result_ready": True, "message": "RIASEC complete."}

    row = s["order"].iloc[i]
    choices = [
        {"value": v, "label": str(v)} for v in range(LIKERT_MIN, LIKERT_MAX + 1)
    ]

    return {
        "sessionID": session_id,
        "questionID": str(row["id"]),
        "questionText": str(row["text"]),
        "index": i + 1,
        "total": total,
        "likert_min": LIKERT_MIN,
        "likert_max": LIKERT_MAX,
        "choices": choices,
    }


def capture_answer(session_id: str, question_id: str, value: int) -> Dict[str, Any]:
    try:
        s = _ensure_session(session_id)
    except KeyError:
        raise KeyError(f"Session not found: {session_id}. The session may have expired. Please restart the quiz.")
    
    qid = str(question_id)

    try:
        v = int(value)
    except Exception:
        v = LIKERT_MIN
    v = max(LIKERT_MIN, min(LIKERT_MAX, v))

    if qid in QID_TO_SCALE:
        s["answers"][qid] = v
    # else: silently ignore invalid qids if any

    s["idx"] += 1
    print("capture_answer received:", qid, value, "scale=", QID_TO_SCALE.get(qid))
    
    try:
        return _next_question_payload(session_id)
    except Exception as e:
        print(f"Error in _next_question_payload: {e}")
        raise


# ---------- Scoring ----------


def _score_answers(answers: Dict[str, int]) -> Tuple[Dict[str, float], Dict[str, float], Dict[str, float]]:
    """
    Returns:
      sums         : raw totals per scale
      percents_100 : 0..100 per scale (nice for charts)
      norm_0_32    : 0..32 normalized means (classic RIASEC scaling)
    """
    sums = {k: 0.0 for k in SCALES}
    counts = {k: 0 for k in SCALES}

    for qid, val in answers.items():
        sc = QID_TO_SCALE.get(str(qid))
        if sc in SCALES:
            sums[sc] += float(val)
            counts[sc] += 1

    if sum(counts.values()) == 0:
        rng = float(LIKERT_MAX - LIKERT_MIN) or 1.0
        mid = (LIKERT_MIN + LIKERT_MAX) / 2.0
        percents_100 = {
            k: round(100.0 * (mid - LIKERT_MIN) / rng, 2) for k in SCALES
        }
        norm_0_32 = {
            k: round(32.0 * (mid - LIKERT_MIN) / rng, 2) for k in SCALES
        }
        return {k: 0.0 for k in SCALES}, percents_100, norm_0_32

    means = {}
    for k in SCALES:
        means[k] = (
            sums[k] / counts[k]
            if counts[k] > 0
            else (LIKERT_MIN + LIKERT_MAX) / 2.0
        )

    rng = float(LIKERT_MAX - LIKERT_MIN) or 1.0
    norm_0_32 = {k: round(32.0 * (means[k] - LIKERT_MIN) / rng, 2) for k in SCALES}
    percents_100 = {
        k: round(100.0 * (means[k] - LIKERT_MIN) / rng, 2) for k in SCALES
    }
    return sums, percents_100, norm_0_32


def _top3_code(sums: Dict[str, float]) -> str:
    items = list(sums.items())
    items.sort(key=lambda kv: (-kv[1], TIE_ORDER.index(kv[0])))
    return "".join([items[0][0], items[1][0], items[2][0]])


def _confidence_from_scores(percents_100: Dict[str, float]) -> float:
    """
    Calculate confidence based on how clear the interest pattern is.
    Uses a combination of:
    1. Spread/variance in scores (higher variance = clearer pattern)
    2. Difference between top and bottom scores
    3. Maximum score relative to others
    
    Returns a value between 0-100 where:
    - Higher = clearer, more distinct interest pattern
    - Lower = more balanced, unclear preferences
    """
    vals = np.array([percents_100[k] for k in SCALES], dtype=np.float32)
    
    # Check if all values are equal (fallback case)
    if np.allclose(vals, vals[0]):
        return 0.0
    
    # Calculate variance (spread of scores)
    variance = float(np.var(vals))
    # Normalize variance: max variance when scores range from 0-100 = 2500 (when one is 100, others are 0)
    max_variance = 2500.0
    variance_contribution = min(100.0, (variance / max_variance) * 100.0)
    
    # Calculate range (difference between max and min)
    score_range = float(np.max(vals) - np.min(vals))
    # Normalize range: max range is 100 (when one is 100, one is 0)
    range_contribution = score_range  # Already 0-100 scale
    
    # Calculate dominance (how much the top score exceeds the mean)
    top_score = float(np.max(vals))
    mean_score = float(np.mean(vals))
    dominance = max(0.0, (top_score - mean_score) / mean_score * 100.0) if mean_score > 0 else 0.0
    dominance_contribution = min(100.0, dominance)
    
    # Combine metrics (weighted average)
    # Variance shows spread, range shows separation, dominance shows top preference strength
    confidence = (
        0.4 * variance_contribution +
        0.3 * range_contribution +
        0.3 * dominance_contribution
    )
    
    # Ensure confidence is between 0-100
    confidence = max(0.0, min(100.0, confidence))
    
    return round(confidence, 2)


def compute_result(session_id: str) -> Dict[str, Any]:
    s = _ensure_session(session_id)
    sums, perc, norm = _score_answers(s["answers"])
    code = _top3_code(sums)
    confidence = _confidence_from_scores(perc)

    # Import reliability module for comprehensive confidence calculation
    try:
        from .riasec_reliability import (
            compute_comprehensive_confidence,
            deduce_holland_code_with_confidence,
            _load_historical_scores
        )
        
        # Compute comprehensive confidence metrics (STEPS 3-10)
        historical_data = _load_historical_scores()
        trait_metrics = compute_comprehensive_confidence(
            trait_scores=perc,
            raw_sums=sums,
            historical_data=historical_data
        )
        
        # Deduce Holland code with confidence analysis (STEP 9)
        holland_analysis = deduce_holland_code_with_confidence(trait_metrics)
        
        # Calculate overall confidence from trait metrics
        # Use average of trait confidence scores weighted by score magnitude
        overall_confidences = [trait_metrics[scale]['trait_confidence'] for scale in SCALES]
        avg_trait_confidence = np.mean(overall_confidences) * 100.0
        
        # Combine with pattern clarity confidence
        pattern_confidence = confidence
        combined_confidence = (avg_trait_confidence * 0.6 + pattern_confidence * 0.4)
        
        # Store detailed item-level responses for future Cronbach's α calculation
        _log_detailed_responses(session_id, s["user_id"], s["answers"], sums, perc)
        
    except Exception as e:
        print(f"Warning: Could not compute comprehensive confidence metrics: {e}")
        trait_metrics = None
        holland_analysis = None
        combined_confidence = confidence

    os.makedirs("logs", exist_ok=True)
    with open("logs/riasec_results.csv", "a", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(
            [
                session_id,
                s["user_id"],
                code,
                combined_confidence,
                *(sums[k] for k in SCALES),
                *(perc[k] for k in SCALES),
                *(norm[k] for k in SCALES),
                datetime.datetime.utcnow().isoformat(),
            ]
        )

    result = {
        "riasec_code": code,
        "confidence_pct": round(combined_confidence, 2),
        "axis_percents": perc,   # for radar chart
        "raw_scores": sums,      # raw R,I,A,S,E,C sums for recommender
        "answered": len(s["answers"]),
        "total": int(len(s["order"])),
    }
    
    # Add comprehensive metrics if available
    if trait_metrics is not None:
        result["trait_metrics"] = {
            scale: {
                "alpha": trait_metrics[scale]["alpha"],
                "sem": trait_metrics[scale]["sem"],
                "ci_95_lower": trait_metrics[scale]["ci_95_lower"],
                "ci_95_upper": trait_metrics[scale]["ci_95_upper"],
                "percentile": trait_metrics[scale]["percentile"],
                "trait_confidence": trait_metrics[scale]["trait_confidence"] * 100
            }
            for scale in SCALES
        }
        
        result["holland_analysis"] = {
            "code": holland_analysis["holland_code"],
            "top_3": holland_analysis["top_3_traits"],
            "overall_confidence": holland_analysis["overall_confidence"],
            "ci_overlaps": holland_analysis["ci_overlaps"]
        }

    return result


def _log_detailed_responses(
    session_id: str,
    user_id: str,
    answers: Dict[str, int],
    sums: Dict[str, float],
    percents: Dict[str, float]
) -> None:
    """Log item-level responses for future Cronbach's α calculation."""
    os.makedirs("logs", exist_ok=True)
    log_file = "logs/riasec_detailed_responses.csv"
    
    # Check if file exists to determine if we need headers
    file_exists = os.path.exists(log_file)
    
    # Prepare row data
    row_data = {
        "session_id": session_id,
        "user_id": user_id,
        "timestamp": datetime.datetime.utcnow().isoformat(),
    }
    
    # Add item-level responses
    for qid in QID_TO_SCALE.keys():
        row_data[f"q_{qid}"] = answers.get(qid, None)
    
    # Add trait scores for reference
    for scale in SCALES:
        row_data[f"{scale}_sum"] = sums.get(scale, 0.0)
        row_data[f"{scale}_perc"] = percents.get(scale, 0.0)
    
    # Write to CSV
    try:
        with open(log_file, "a", newline="", encoding="utf-8") as f:
            # Get all possible columns
            all_columns = ["session_id", "user_id", "timestamp"]
            all_columns.extend([f"q_{qid}" for qid in QID_TO_SCALE.keys()])
            all_columns.extend([f"{scale}_sum" for scale in SCALES])
            all_columns.extend([f"{scale}_perc" for scale in SCALES])
            
            writer = csv.DictWriter(f, fieldnames=all_columns)
            
            if not file_exists:
                writer.writeheader()
            
            writer.writerow(row_data)
    except Exception as e:
        print(f"Warning: Could not log detailed responses: {e}")


def end_session(session_id: str) -> Dict[str, Any]:
    if session_id in SESSIONS:
        del SESSIONS[session_id]
    return {"success": True}
