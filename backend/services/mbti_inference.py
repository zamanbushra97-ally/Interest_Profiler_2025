# services/inference.py
"""
Inference utilities for the Interest Profiler:
- build_features_from_responses(responses) -> np.ndarray[IE,SN,TF,JP]
- entropy_from_probs(probs) -> float
- mc_dropout_predict(features, n_samples=50) -> (mean_probs, std_probs, mbti)
- compute_final_result(responses) -> dict payload for frontend
"""

from __future__ import annotations

import os
import csv
import datetime
from pathlib import Path
from typing import List, Dict, Any

import numpy as np
import pandas as pd

from models.bnn import MBTIModel, mbti_from_probs
from .mbti_questions import QUESTION_TRAITS

# -----------------------------
# CONFIG
# -----------------------------
DATA_DIR = Path("data")
CAREER_FILE = DATA_DIR / "career_clusters.csv"   # columns: Career_Cluster, About, MBTI_Personality
LOG_DIR = Path("logs")
LOG_DIR.mkdir(parents=True, exist_ok=True)
SESSION_LOG = LOG_DIR / "session_results.csv"

# -----------------------------
# LOAD CAREER DATA (robust)
# -----------------------------
if CAREER_FILE.exists():
    career_df = pd.read_csv(CAREER_FILE)
    # Normalize expected columns
    expected_cols = {"Career_Cluster", "About", "MBTI_Personality"}
    missing = expected_cols - set(career_df.columns)
    if missing:
        raise ValueError(f"{CAREER_FILE} missing columns: {missing}")
else:
    # Fallback to empty DataFrame if not present; recommendations will be empty
    career_df = pd.DataFrame(columns=["Career_Cluster", "About", "MBTI_Personality"])

# -----------------------------
# GLOBAL BNN MODEL INSTANCE
# -----------------------------
# MBTIModel internally loads artifacts/bayes_trait_estimator.pt
bnn_model = MBTIModel()


# -----------------------------
# FEATURE BUILDING
# -----------------------------
def build_features_from_responses(responses: List[Dict[str, Any]]) -> np.ndarray:
    """
    Convert list of {qid, answer} into 4D feature vector [IE, SN, TF, JP]
    by counting trait outcomes per axis and taking ratio of the positive side.

    If an axis has no answers yet, we default that ratio to 0.5 (uninformed).
    """
    # Count raw trait tallies
    counts = {t: 0 for t in ["I", "E", "S", "N", "T", "F", "J", "P"]}

    for r in responses:
        qid = str(r.get("qid"))
        ans = str(r.get("answer", "")).strip().lower()
        if qid not in QUESTION_TRAITS:
            # Unknown question id; ignore safely
            continue

        yes_trait, no_trait, _axis_idx = QUESTION_TRAITS[qid]
        trait = yes_trait if ans in ("yes", "y", "true", "1") else no_trait
        counts[trait] += 1

    def axis_ratio(pos: str, neg: str) -> float:
        total = counts[pos] + counts[neg]
        if total == 0:
            return 0.5
        
        # Tie-breaking logic:
        # If counts are exactly equal, favor the 'pos' side slightly (0.51)
        # to ensure a deterministic outcome rather than a 0.5 toss-up.
        # We consistently favor: I over E, S over N, T over F, J over P
        # (Arbitrary choice, but deterministic)
        
        if counts[pos] == counts[neg]:
            # Tie!
            # We want to avoid 0.5. Let's return 0.51 (favoring pos)
            # This means:
            # I vs E -> Favor I (ratio > 0.5)
            # S vs N -> Favor S (ratio > 0.5)
            # T vs F -> Favor T (ratio > 0.5)
            # J vs P -> Favor J (ratio > 0.5)
            return 0.51
            
        return counts[pos] / total

    IE = axis_ratio("I", "E")
    SN = axis_ratio("S", "N")
    TF = axis_ratio("T", "F")
    JP = axis_ratio("J", "P")

    return np.array([IE, SN, TF, JP], dtype=np.float32)


# -----------------------------
# UNCERTAINTY / ENTROPY
# -----------------------------
def entropy_from_probs(probs: np.ndarray) -> float:
    """
    Mean binary entropy across the four axes.
    probs is shape (4,), each entry is p(positive trait) in [0,1].
    Lower entropy => more confident model.
    Returns normalized entropy in [0, 1] where 0 = maximum certainty, 1 = maximum uncertainty.
    """
    eps = 1e-8
    MAX_BINARY_ENTROPY = np.log(2.0)  # Maximum entropy for binary distribution (when p=0.5)
    
    p = np.clip(probs, eps, 1.0 - eps)
    ent = -(p * np.log(p) + (1.0 - p) * np.log(1.0 - p))  # per-axis entropy in [0, log(2)]
    mean_entropy = ent.mean()
    
    # Normalize by maximum possible entropy to get value in [0, 1]
    normalized_entropy = mean_entropy / MAX_BINARY_ENTROPY
    return float(np.clip(normalized_entropy, 0.0, 1.0))


# -----------------------------
# BNN INFERENCE
# -----------------------------
def mc_dropout_predict(features: np.ndarray, n_samples: int = 50):
    """
    Forward-pass with MC Dropout for uncertainty:
    returns (mean_probs, std_probs, mbti_str)
    - mean_probs: shape (4,)
    - std_probs : shape (4,)
    """
    mbti, mean_probs, std_probs = bnn_model.predict(features, n_samples=n_samples)
    return mean_probs, std_probs, mbti


# -----------------------------
# CAREER RECOMMENDATIONS
# -----------------------------
def _get_top_careers_for_mbti(mbti_type: str, top_n: int = 3):
    """
    Simple filter: take rows whose MBTI_Personality contains mbti_type.
    Returns a list of {CareerCluster, About, Score} with no duplicates.
    """
    if career_df.empty or not mbti_type:
        return []

    scores = []
    seen_clusters = set()  # Track seen clusters to prevent duplicates
    
    for _, row in career_df.iterrows():
        types = [t.strip().upper() for t in str(row["MBTI_Personality"]).split(",")]
        if mbti_type in types:
            cluster_name = str(row["Career_Cluster"]).strip()
            cluster_normalized = cluster_name.upper()  # Case-insensitive deduplication
            
            # Skip if we've already seen this cluster
            if cluster_normalized in seen_clusters:
                continue
            
            # Add to seen set and append to results
            seen_clusters.add(cluster_normalized)
            scores.append({
                "CareerCluster": cluster_name,
                "About": row["About"],
                "Score": 1.0,  # placeholder for future weighting
            })
            
            # Stop once we have enough unique clusters
            if len(scores) >= top_n:
                break

    return scores


# -----------------------------
# MAIN RESULT PIPELINE
# -----------------------------
def compute_final_result(responses: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Build features → BNN + MC Dropout → MBTI + uncertainty → career recs → confidence.
    Also appends a lightweight log row for analytics.
    """
    # 1) Build 4D features from the current session responses
    features = build_features_from_responses(responses)

    # 2) Bayesian model with MC Dropout
    mean_probs, std_probs, mbti_type = mc_dropout_predict(features, n_samples=80)

    # 3) Confidence calculation based on answer consistency and model certainty
    # The confidence reflects how clear and consistent your answers were
    # Note: Career cluster recommendations are now handled by the CareerClusterRecommender
    # which uses both MBTI and RIASEC data. See /api/v1/cluster/recommend endpoint.
    
    # Primary signal: Answer consistency from raw features
    # Features represent how strongly you lean toward each trait (0-1 scale)
    # Distance from 0.5 indicates how clear your preference is
    # Features closer to 0 or 1 = clearer answers = higher confidence
    feature_distances = np.abs(features - 0.5)  # Distance from neutral (0.5) for each axis
    mean_distance = float(feature_distances.mean())  # Average distance across all 4 axes
    
    # Calculate base confidence from answer consistency
    # Linear mapping: distance of 0.2 (moderate clarity) -> 60% confidence
    #                 distance of 0.3 (good clarity) -> 75% confidence  
    #                 distance of 0.4 (strong clarity) -> 85% confidence
    #                 distance of 0.5 (very strong) -> 95% confidence
    # Use a more generous scaling that rewards sincere answers
    if mean_distance >= 0.45:
        base_confidence = 0.95
    elif mean_distance >= 0.35:
        # Interpolate 0.90 - 0.95
        base_confidence = 0.90 + (mean_distance - 0.35) / 0.10 * 0.05
    elif mean_distance >= 0.25:
        # Interpolate 0.80 - 0.90
        base_confidence = 0.80 + (mean_distance - 0.25) / 0.10 * 0.10
    elif mean_distance >= 0.15:
        # Interpolate 0.65 - 0.80
        base_confidence = 0.65 + (mean_distance - 0.15) / 0.10 * 0.15
    elif mean_distance >= 0.05:
        # Interpolate 0.45 - 0.65
        base_confidence = 0.45 + (mean_distance - 0.05) / 0.10 * 0.20
    else:
        # Interpolate 0.00 - 0.45
        base_confidence = mean_distance / 0.05 * 0.45
    
    # Adjust for model uncertainty (std_dev) - reduce confidence if model is uncertain
    mean_std = float(std_probs.mean())
    # If std is very high (>0.12), reduce confidence by up to 10%
    # If std is moderate (0.06-0.12), reduce by 5%
    # If std is low (<0.06), minimal penalty
    std_penalty = 0.0
    if mean_std > 0.12:
        std_penalty = min(0.10, (mean_std - 0.12) / 0.08 * 0.10)  # Max 10% penalty
    elif mean_std > 0.06:
        std_penalty = 0.05  # 5% penalty for moderate uncertainty
    
    confidence = round((base_confidence - std_penalty) * 100.0, 2)
    
    # Ensure confidence is in valid range [0, 100]
    confidence = max(0.0, min(100.0, confidence))
    
    # Also calculate entropy for logging (normalized)
    entropy = entropy_from_probs(mean_probs)

    # 5) Append a minimal session log row (for future analytics / retraining)
    try:
        first_time = not SESSION_LOG.exists()
        with open(SESSION_LOG, "a", newline="", encoding="utf-8") as f:
            w = csv.writer(f)
            if first_time:
                w.writerow(["IE", "SN", "TF", "JP", "PredictedMBTI", "Entropy", "TimestampUTC"])
            w.writerow([
                *[float(x) for x in features],
                mbti_type,
                float(entropy),
                datetime.datetime.utcnow().isoformat()
            ])
    except Exception as e:
        # Non-fatal; keep serving result
        print(f"[warn] failed to write session log: {e}")

    # 4) Final payload for the frontend
    return {
        "mbti": mbti_type,
        "features": features.tolist(),
        "mean_probs": [float(x) for x in mean_probs],
        "std_probs": [float(x) for x in std_probs],
        "entropy": float(entropy),
        "confidence": float(confidence),
    }
