# services/adaptive_engine.py
"""
Adaptive Question Engine with RL bandit + stability-based stopping.
"""

import uuid
from typing import Dict, Any, List, Set

import numpy as np

from .mbti_questions import get_question_for_axis, MBTI_AXES, QUESTION_TRAITS
from .mbti_inference import (
    build_features_from_responses,
    mc_dropout_predict,
    entropy_from_probs,
)

# Config
TARGET_PER_AXIS = 9              # 9 questions per axis
TOTAL_QUESTIONS = TARGET_PER_AXIS * 4  # 36 questions total

# In-memory session store
SESSIONS: Dict[str, Dict[str, Any]] = {}

# RL bandit values
BANDIT_VALUES = np.zeros(4, dtype=np.float32)
BANDIT_COUNTS = np.zeros(4, dtype=np.int32)


def bandit_choose_axis(epsilon: float = 0.1, available_axes: List[int] = None) -> int:
    if available_axes is None:
        available_axes = [0, 1, 2, 3]
        
    if not available_axes:
        return -1 # Should not happen if logic is correct

    # Filter bandit values to only available axes
    filtered_values = [BANDIT_VALUES[i] if i in available_axes else -9999.0 for i in range(4)]

    if np.random.rand() < epsilon:
        return np.random.choice(available_axes)
    
    # Argmax on filtered values
    best_idx = int(np.argmax(filtered_values))
    if best_idx not in available_axes:
        # Fallback if something is wrong, just pick random available
        return np.random.choice(available_axes)
        
    return best_idx


def bandit_update(axis_idx: int, reward: float) -> None:
    BANDIT_COUNTS[axis_idx] += 1
    n = BANDIT_COUNTS[axis_idx]
    BANDIT_VALUES[axis_idx] += (reward - BANDIT_VALUES[axis_idx]) / n


def compute_reward(last_entropy: float, new_entropy: float, axis_idx: int) -> float:
    if last_entropy is None:
        return 0.0
    # Simple reward: reduction in entropy
    base = max(0.0, last_entropy - new_entropy)
    return float(base)


def start_session(user_id: str) -> Dict[str, Any]:
    session_id = f"{user_id}-{uuid.uuid4().hex[:6]}"

    SESSIONS[session_id] = {
        "user_id": user_id,
        "responses": [],      # list of {qid, answer}
        "asked_qids": set(),  # type: Set[str]
        "count": 0,
        "axis_counts": [0, 0, 0, 0], # Track count per axis [IE, SN, TF, JP]
        "last_entropy": None,
        "last_axis_idx": None,
        "entropy_history": [],
        "mbti_history": [],
    }

    # first question: random axis
    axis_idx = np.random.randint(0, 4)
    row = get_question_for_axis(axis_idx, asked_ids=set())
    if row is None:
        raise RuntimeError("No questions available in Questions.xlsx")

    qid = str(row["id"])

    s = SESSIONS[session_id]
    s["asked_qids"].add(qid)
    s["count"] = 1
    s["axis_counts"][axis_idx] += 1
    s["last_axis_idx"] = axis_idx

    return {
        "sessionID": session_id,
        "questionID": qid,
        "questionDesc": str(row["text"]),
        "option_1": "Yes",
        "option_2": "No",
        "currentIndex": 1,
        "maxQuestions": TOTAL_QUESTIONS,
    }


def capture_response(session_id: str, question_id: str, answer: str) -> None:
    if session_id not in SESSIONS:
        raise KeyError("Session not found")

    s = SESSIONS[session_id]
    ans_norm = str(answer).strip().lower()

    s["responses"].append({"qid": question_id, "answer": ans_norm})
    s["asked_qids"].add(question_id)

    # recompute features → BNN → entropy + mbti
    features = build_features_from_responses(s["responses"])
    mean_probs, _std, mbti_type = mc_dropout_predict(features, n_samples=40)
    new_entropy = entropy_from_probs(mean_probs)

    s["entropy_history"].append(new_entropy)
    s["mbti_history"].append(mbti_type)

    last_entropy = s["last_entropy"]
    axis_idx = s["last_axis_idx"]

    if axis_idx is not None:
        reward = compute_reward(last_entropy, new_entropy, axis_idx)
        bandit_update(axis_idx, reward)

    s["last_entropy"] = new_entropy


def get_next_question(session_id: str) -> Dict[str, Any]:
    if session_id not in SESSIONS:
        raise KeyError("Session not found")

    s = SESSIONS[session_id]

    # Check if we reached the total limit
    if s["count"] >= TOTAL_QUESTIONS:
        return {
            "sentinel": 1,
            "message": "Assessment complete.",
            "result_ready": True,
        }

    # Identify available axes (those with count < TARGET_PER_AXIS)
    available_axes = [i for i, count in enumerate(s["axis_counts"]) if count < TARGET_PER_AXIS]
    
    if not available_axes:
        # Should be covered by TOTAL_QUESTIONS check, but safe fallback
        return {
            "sentinel": 1,
            "message": "Assessment complete (all axes filled).",
            "result_ready": True,
        }

    # Choose axis from available ones
    # We can still use bandit to pick the "most informative" among the remaining ones
    if not s["responses"]:
        axis_idx = np.random.choice(available_axes)
    else:
        axis_idx = bandit_choose_axis(epsilon=0.1, available_axes=available_axes)

    row = get_question_for_axis(axis_idx, asked_ids=s["asked_qids"])
    
    # Fallback if chosen axis has no questions left (unlikely with 9 target, but possible if data is missing)
    if row is None:
        # Try other available axes
        found = False
        for fallback_axis in available_axes:
            if fallback_axis == axis_idx: continue
            row = get_question_for_axis(fallback_axis, asked_ids=s["asked_qids"])
            if row is not None:
                axis_idx = fallback_axis
                found = True
                break
        
        if not found:
             return {
                "sentinel": 1,
                "message": "No more questions available.",
                "result_ready": True,
            }

    qid = str(row["id"])
    s["asked_qids"].add(qid)
    s["count"] += 1
    s["axis_counts"][axis_idx] += 1
    s["last_axis_idx"] = axis_idx

    return {
        "sessionID": session_id,
        "questionID": qid,
        "questionDesc": str(row["text"]),
        "option_1": "Yes",
        "option_2": "No",
        "currentIndex": s["count"],
        "maxQuestions": TOTAL_QUESTIONS,
    }


def get_session_responses(session_id: str) -> List[Dict[str, Any]]:
    if session_id not in SESSIONS:
        raise KeyError("Session not found")
    return SESSIONS[session_id]["responses"]


def end_session(session_id: str) -> None:
    if session_id in SESSIONS:
        del SESSIONS[session_id]
