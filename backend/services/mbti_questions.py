# services/mbti_questions.py
"""
Load MBTI questions from data/Questions.xlsx and provide helpers.

Expected columns in Questions.xlsx (case-insensitive):
- "S.No."      (or "id")
- "Question"   (or "question", "questions", "question?")
- "Yes"        (trait printed on the Yes button; e.g., I/S/T/J)
- "No"         (trait printed on the No button;  e.g., E/N/F/P)

We infer axis by checking which pair (I,E), (S,N), (T,F), (J,P) the Yes/No belong to.
"""

from __future__ import annotations
import os
import random
import pandas as pd
from typing import Dict, List, Tuple, Optional

MBTI_AXES: List[Tuple[str, str]] = [("I", "E"), ("S", "N"), ("T", "F"), ("J", "P")]
QUESTIONS_XLSX = os.getenv("MBTI_QUESTIONS_FILE", "data/Questions.xlsx")

# Will be filled at import
QUESTIONS: List[dict] = []
# qid -> (yes_trait, no_trait, axis_idx)
QUESTION_TRAITS: Dict[str, Tuple[str, str, int]] = {}

# -------- internals --------

def _norm(s) -> str:
    return str(s).strip()

def _axis_index(yes: str, no: str) -> Optional[int]:
    y = _norm(yes).upper()
    n = _norm(no).upper()
    for idx, (a, b) in enumerate(MBTI_AXES):
        if y in (a, b) and n in (a, b):
            return idx
    return None

def _guess_col(df: pd.DataFrame, *candidates: str) -> str:
    """find a column name (case-insensitive) among candidates."""
    cols = {c.lower(): c for c in df.columns}
    for cand in candidates:
        lc = cand.lower()
        if lc in cols:
            return cols[lc]
    # fall back to first candidate (will raise later if missing)
    return candidates[0]

# -------- public API --------

def load_questions(path: str = QUESTIONS_XLSX) -> List[dict]:
    if not os.path.exists(path):
        raise FileNotFoundError(f"MBTI questions file not found: {path}")

    df = pd.read_excel(path)

    col_id  = _guess_col(df, "S.No.", "id", "sno", "s_no", "s no")
    col_q   = _guess_col(df, "Question", "Questions", "Question?", "question")
    col_yes = _guess_col(df, "Yes", "yes")
    col_no  = _guess_col(df, "No", "no")

    items: List[dict] = []
    traits_map: Dict[str, Tuple[str, str, int]] = {}

    for _, row in df.iterrows():
        qid = _norm(row[col_id])
        text = _norm(row[col_q])
        yes_trait = _norm(row[col_yes]).upper()
        no_trait  = _norm(row[col_no]).upper()

        idx = _axis_index(yes_trait, no_trait)
        if idx is None:
            # skip malformed row
            continue

        item = {
            "id": qid,
            "text": text,
            "yes_trait": yes_trait,
            "no_trait": no_trait,
            "axis_idx": idx,
            "axis_pair": MBTI_AXES[idx],
        }
        items.append(item)
        traits_map[qid] = (yes_trait, no_trait, idx)

    if not items:
        raise ValueError(f"No valid MBTI items found in {path}")

    return items, traits_map

def get_question_for_axis(axis_idx: int, asked_ids: Optional[set] = None) -> Optional[dict]:
    """
    Pick a random (unused) question for given axis index.
    Returns an item dict or None if all consumed.
    """
    pool = [q for q in QUESTIONS if q["axis_idx"] == axis_idx]
    if asked_ids:
        pool = [q for q in pool if q["id"] not in asked_ids]
    if not pool:
        return None
    return random.choice(pool)

# eager-load on import
try:
    QUESTIONS, QUESTION_TRAITS = load_questions(QUESTIONS_XLSX)
except Exception as e:
    # Keep module importable; surface a clearer error later if used.
    QUESTIONS, QUESTION_TRAITS = [], {}
