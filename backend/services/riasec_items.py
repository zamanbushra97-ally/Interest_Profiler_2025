# services/riasec_items.py
"""
Loader/validator for the RIASEC items file.

Expected input file (CSV or XLSX) with headers exactly like your sample:
  QID, Question, Key

This module converts that into the normalized schema riasec.py already uses:
  id, text, scale
"""

from __future__ import annotations
from typing import Set
import pandas as pd

RIASEC_CODES: Set[str] = {"R", "I", "A", "S", "E", "C"}

def load_riasec_items(path: str) -> pd.DataFrame:
    """
    Read CSV/XLSX, sanitize, and return a DataFrame with columns:
      id (str), text (str), scale (str in {"R","I","A","S","E","C"})
    """
    # 1) Read
    if path.lower().endswith(".xlsx"):
        df = pd.read_excel(path)
    else:
        df = pd.read_csv(path)

    # 2) Normalize/rename incoming headers
    #    Works for exactly: QID, Question, Key   (your file)
    df = df.rename(
        columns={
            "QID": "id",
            "Question": "text",
            "Key": "scale",
        }
    )

    # 3) Basic presence validation 
    required = {"id", "text", "scale"}
    if not required.issubset(df.columns):
        raise ValueError(
            f"{path} must contain columns {sorted(required)}; found {sorted(df.columns)}"
        )

    # 4) Clean up values
    df["id"] = df["id"].astype(str).str.strip()
    df["text"] = df["text"].astype(str).str.strip()
    df["scale"] = df["scale"].astype(str).str.strip().str.upper()

    # 5) Validate scales
    bad = sorted(set(df["scale"].unique()) - RIASEC_CODES)
    if bad:
        raise ValueError(
            f"Unknown RIASEC codes found {bad}. Valid codes are {sorted(RIASEC_CODES)}."
        )

    # 6) (Optional) Ensure sorted by numeric id if QID is numeric-like
    #     This keeps a stable order before your per-session shuffle.
    try:
        df["_idnum"] = df["id"].astype(int)
        df = df.sort_values("_idnum").drop(columns=["_idnum"])
    except Exception:
        pass

    # 7) Final shape & types
    return df[["id", "text", "scale"]].reset_index(drop=True)
