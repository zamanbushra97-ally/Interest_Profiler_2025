"""
RIASEC Reliability and Confidence Calculation Module
Implements scientific confidence calculation based on Cronbach's α, SEM, and CI.
"""

from __future__ import annotations
import os
import csv
from typing import Dict, List, Tuple, Optional
import pandas as pd
import numpy as np

# Reference to the main module's constants
from .riasec import SCALES, LIKERT_MIN, LIKERT_MAX, QDF, QID_TO_SCALE

# Paths
RESULTS_LOG = "logs/riasec_results.csv"
DETAILED_LOG = "logs/riasec_detailed_responses.csv"  # We'll create this for item-level data


def _load_historical_scores() -> pd.DataFrame:
    """Load all historical RIASEC scores from the results log."""
    if not os.path.exists(RESULTS_LOG):
        return pd.DataFrame()
    
    try:
        df = pd.read_csv(RESULTS_LOG)
        # Expected columns: session_id, user_id, code, confidence_pct, R_sum, I_sum, A_sum, S_sum, E_sum, C_sum, R_perc, I_perc, A_perc, S_perc, E_perc, C_perc, ...
        if len(df) == 0:
            return pd.DataFrame()
        return df
    except Exception as e:
        print(f"Warning: Could not load historical scores: {e}")
        return pd.DataFrame()


def _load_detailed_responses() -> Optional[pd.DataFrame]:
    """Load item-level responses for Cronbach's α calculation."""
    if not os.path.exists(DETAILED_LOG):
        return None
    
    try:
        df = pd.read_csv(DETAILED_LOG)
        return df
    except Exception:
        return None


def calculate_cronbach_alpha(item_responses: np.ndarray) -> float:
    """
    Calculate Cronbach's α for a scale.
    
    Args:
        item_responses: 2D array where rows are participants, columns are items
                       Shape: (n_participants, n_items)
    
    Returns:
        Cronbach's α coefficient (0-1)
    """
    if item_responses.shape[0] < 2 or item_responses.shape[1] < 2:
        return 0.0
    
    n_items = item_responses.shape[1]
    n_participants = item_responses.shape[0]
    
    # Calculate item variances
    item_variances = np.var(item_responses, axis=0, ddof=1)
    sum_item_variances = np.sum(item_variances)
    
    # Calculate total score variance
    total_scores = np.sum(item_responses, axis=1)
    total_variance = np.var(total_scores, ddof=1)
    
    if total_variance == 0:
        return 0.0
    
    # Cronbach's α formula
    alpha = (n_items / (n_items - 1)) * (1 - sum_item_variances / total_variance)
    
    return max(0.0, min(1.0, alpha))  # Clamp between 0 and 1


def compute_reliability_from_historical_data() -> Dict[str, float]:
    """
    STEP 3: Compute Cronbach's α for each trait scale from historical data.
    
    Returns:
        Dictionary mapping scale -> Cronbach's α
    """
    detailed_df = _load_detailed_responses()
    
    if detailed_df is None or len(detailed_df) == 0:
        # Fallback: use default values based on typical RIASEC reliability
        # Typical values from literature: R=0.80, I=0.82, A=0.79, S=0.81, E=0.80, C=0.78
        return {
            'R': 0.80,
            'I': 0.82,
            'A': 0.79,
            'S': 0.81,
            'E': 0.80,
            'C': 0.78
        }
    
    alphas = {}
    
    for scale in SCALES:
        # Get all items for this scale
        scale_items = QDF[QDF['scale'] == scale]['id'].tolist()
        
        if len(scale_items) == 0:
            alphas[scale] = 0.75  # Default fallback
            continue
        
        # Extract item responses for this scale
        item_cols = [f"q_{qid}" for qid in scale_items if f"q_{qid}" in detailed_df.columns]
        
        if len(item_cols) < 2:
            alphas[scale] = 0.75
            continue
        
        # Get responses as numpy array
        item_data = detailed_df[item_cols].values
        
        # Remove rows with any NaN
        item_data = item_data[~np.isnan(item_data).any(axis=1)]
        
        if item_data.shape[0] < 2:
            alphas[scale] = 0.75
            continue
        
        # Calculate Cronbach's α
        alpha = calculate_cronbach_alpha(item_data)
        alphas[scale] = alpha if alpha > 0 else 0.75  # Minimum fallback
    
    return alphas


def compute_standard_deviations() -> Dict[str, float]:
    """
    STEP 4: Compute Standard Deviation (SD) for each trait across all participants.
    
    Returns:
        Dictionary mapping scale -> SD
    """
    df = _load_historical_scores()
    
    if len(df) == 0:
        # Fallback: use typical SD values from RIASEC literature
        # Typical SD for 1-5 Likert scales with 10 items: ~6-8
        return {scale: 7.0 for scale in SCALES}
    
    sds = {}
    
    for scale in SCALES:
        # Try to find the raw sum column (before normalization)
        sum_col = f"{scale}_sum" if f"{scale}_sum" in df.columns else None
        perc_col = f"{scale}_perc" if f"{scale}_perc" in df.columns else None
        
        if sum_col and sum_col in df.columns:
            values = df[sum_col].dropna().values
        elif perc_col and perc_col in df.columns:
            # Use percentages, but we need to estimate raw scores
            # Assuming mean percentage corresponds to middle of scale
            values = df[perc_col].dropna().values
        else:
            sds[scale] = 7.0
            continue
        
        if len(values) < 2:
            sds[scale] = 7.0
            continue
        
        sds[scale] = float(np.std(values, ddof=1))  # Sample standard deviation
    
    return sds


def compute_sem(sd: float, alpha: float) -> float:
    """
    STEP 5: Compute Standard Error of Measurement (SEM).
    
    SEM = SD × √(1 - α)
    
    Args:
        sd: Standard deviation
        alpha: Cronbach's α
    
    Returns:
        Standard Error of Measurement
    """
    if sd <= 0 or alpha < 0 or alpha > 1:
        return 0.0
    
    sem = sd * np.sqrt(1 - alpha)
    return float(sem)


def compute_confidence_interval(score: float, sem: float, z_score: float = 1.96) -> Tuple[float, float]:
    """
    STEP 6: Compute 95% confidence interval for a trait score.
    
    CI_95% = Score ± (z × SEM)
    
    Args:
        score: Trait score
        sem: Standard Error of Measurement
        z_score: Z-score for desired confidence level (1.96 for 95%)
    
    Returns:
        Tuple of (lower_bound, upper_bound)
    """
    margin = z_score * sem
    lower = score - margin
    upper = score + margin
    return (float(lower), float(upper))


def compute_percentile_rank(score: float, all_scores: np.ndarray) -> float:
    """
    STEP 7: Compute percentile rank for a score.
    
    Args:
        score: Individual trait score
        all_scores: Array of all scores for this trait
    
    Returns:
        Percentile rank (0-100)
    """
    if len(all_scores) == 0:
        return 50.0  # Default to median if no data
    
    # Calculate percentile rank manually
    # Percentile rank = (number of values below score + 0.5 * number of values equal to score) / total * 100
    below = np.sum(all_scores < score)
    equal = np.sum(all_scores == score)
    percentile = (below + 0.5 * equal) / len(all_scores) * 100.0
    return float(percentile)


def compute_trait_confidence_score(sem: float, score_range: float) -> float:
    """
    STEP 10: Compute a simple Trait Confidence Score.
    
    Confidence = 1 - (SEM / Score Range)
    
    Args:
        sem: Standard Error of Measurement
        score_range: Maximum possible range of scores (e.g., 40 for 10-50)
    
    Returns:
        Confidence score (0-1, can be converted to percentage)
    """
    if score_range <= 0:
        return 0.0
    
    confidence = 1.0 - (sem / score_range)
    return max(0.0, min(1.0, confidence))


def check_ci_overlap(ci1: Tuple[float, float], ci2: Tuple[float, float]) -> bool:
    """
    Check if two confidence intervals overlap.
    
    Args:
        ci1: First CI as (lower, upper)
        ci2: Second CI as (lower, upper)
    
    Returns:
        True if intervals overlap, False otherwise
    """
    lower1, upper1 = ci1
    lower2, upper2 = ci2
    
    # Check for overlap
    return not (upper1 < lower2 or upper2 < lower1)


def compute_comprehensive_confidence(
    trait_scores: Dict[str, float],
    raw_sums: Dict[str, float],
    historical_data: Optional[pd.DataFrame] = None
) -> Dict[str, Any]:
    """
    Compute comprehensive confidence metrics for all RIASEC traits.
    
    This function implements STEPS 3-10 of the confidence calculation process.
    
    Args:
        trait_scores: Dictionary mapping scale -> score (normalized 0-100 or raw)
        raw_sums: Dictionary mapping scale -> raw sum scores
        historical_data: Optional DataFrame of historical data
    
    Returns:
        Dictionary containing all confidence metrics for each trait
    """
    # STEP 3: Get reliability coefficients (Cronbach's α)
    alphas = compute_reliability_from_historical_data()
    
    # STEP 4: Get standard deviations
    sds = compute_standard_deviations()
    
    # Load historical data if not provided
    if historical_data is None:
        historical_data = _load_historical_scores()
    
    # Calculate metrics for each trait
    trait_metrics = {}
    
    for scale in SCALES:
        score = trait_scores.get(scale, 0.0)
        raw_sum = raw_sums.get(scale, 0.0)
        alpha = alphas.get(scale, 0.75)
        sd = sds.get(scale, 7.0)
        
        # STEP 5: Calculate SEM
        sem = compute_sem(sd, alpha)
        
        # STEP 6: Calculate 95% CI
        ci_lower, ci_upper = compute_confidence_interval(score, sem)
        
        # STEP 7: Calculate percentile rank
        percentile = 50.0  # Default
        if historical_data is not None and len(historical_data) > 0:
            perc_col = f"{scale}_perc"
            if perc_col in historical_data.columns:
                all_scores = historical_data[perc_col].dropna().values
                if len(all_scores) > 0:
                    percentile = compute_percentile_rank(score, all_scores)
        
        # STEP 10: Calculate trait confidence score
        # Estimate score range: if we have ~10 items on 1-5 scale, range is ~40 (10-50)
        # For percentage scale (0-100), range is 100
        score_range = 100.0  # Using percentage scale
        trait_conf = compute_trait_confidence_score(sem, score_range)
        
        trait_metrics[scale] = {
            'score': score,
            'raw_sum': raw_sum,
            'alpha': alpha,
            'sd': sd,
            'sem': sem,
            'ci_95_lower': ci_lower,
            'ci_95_upper': ci_upper,
            'percentile': percentile,
            'trait_confidence': trait_conf
        }
    
    return trait_metrics


def deduce_holland_code_with_confidence(
    trait_metrics: Dict[str, Any]
) -> Dict[str, Any]:
    """
    STEP 9: Deduce Holland Code with confidence checking.
    
    Checks for CI overlaps to determine confidence in the ranking.
    
    Args:
        trait_metrics: Dictionary from compute_comprehensive_confidence
    
    Returns:
        Dictionary with Holland code, top 3 traits, and confidence analysis
    """
    # Sort traits by score
    sorted_traits = sorted(
        trait_metrics.items(),
        key=lambda x: x[1]['score'],
        reverse=True
    )
    
    top_3 = sorted_traits[:3]
    top_3_codes = [trait[0] for trait in top_3]
    holland_code = ''.join(top_3_codes)
    
    # Check CI overlaps
    ci_overlaps = {}
    for i, (trait1, metrics1) in enumerate(top_3):
        for j, (trait2, metrics2) in enumerate(top_3):
            if i >= j:
                continue
            
            ci1 = (metrics1['ci_95_lower'], metrics1['ci_95_upper'])
            ci2 = (metrics2['ci_95_lower'], metrics2['ci_95_upper'])
            overlaps = check_ci_overlap(ci1, ci2)
            ci_overlaps[f"{trait1}_vs_{trait2}"] = overlaps
    
    # Calculate overall confidence based on overlaps
    num_overlaps = sum(ci_overlaps.values())
    # If no overlaps, high confidence; if all overlap, low confidence
    if num_overlaps == 0:
        overall_confidence = "High"
    elif num_overlaps == len(ci_overlaps):
        overall_confidence = "Low"
    else:
        overall_confidence = "Medium"
    
    return {
        'holland_code': holland_code,
        'top_3_traits': top_3_codes,
        'top_3_scores': [trait_metrics[t]['score'] for t in top_3_codes],
        'ci_overlaps': ci_overlaps,
        'overall_confidence': overall_confidence,
        'detailed_metrics': {t: trait_metrics[t] for t in top_3_codes}
    }

