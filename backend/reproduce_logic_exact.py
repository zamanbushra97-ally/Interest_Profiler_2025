import sys
import pandas as pd
from services.recommender import CareerClusterRecommender

def test_enfj_example_exact_match():
    print("Initializing Recommender...")
    recommender = CareerClusterRecommender(alpha=0.3, beta=0.7)
    
    # User's example data
    mbti_type = "ENFJ"
    riasec_raw = {"R": 8, "I": 14, "A": 24, "S": 20, "E": 12, "C": 6}
    
    # 1. MOCK PRIORS (User example)
    mock_priors = {c: 0.0 for c in recommender.mbti_prior_df.columns}
    target_clusters = [
        "Science, Technology, Engineering, and Mathematics (STEM)",
        "Information Technology",
        "Finance",
        "Arts, Audio/Video Technology, and Communications",
        "Education and training"
    ]
    
    # Map short names to full names for setting values
    # User: STEM 0.10, IT 0.05, Finance 0.05, Arts 0.30, Education 0.50
    mock_priors["Science, Technology, Engineering, and Mathematics (STEM)"] = 0.10
    mock_priors["Information Technology"] = 0.05
    mock_priors["Finance"] = 0.05
    mock_priors["Arts, Audio/Video Technology, and Communications"] = 0.30
    mock_priors["Education and training"] = 0.50
    
    recommender.mbti_prior_df.loc["ENFJ"] = pd.Series(mock_priors)
    
    # 2. MOCK RIASEC MATRIX (Restrict to only the 5 clusters)
    # We filter the dataframe to only include these 5 rows
    recommender.riasec_matrix_df = recommender.riasec_matrix_df.loc[target_clusters]
    
    # Also need to update mbti_prior_df to only have these columns?
    # The code does: for cluster in p_mbti.keys(): ...
    # p_mbti comes from mbti_row.to_dict().
    # If we don't filter mbti_prior_df columns, p_mbti will have 16 entries.
    # p_riasec will have 5 entries.
    # p_final loop iterates over p_mbti.keys() (16).
    # p_riasec.get(cluster, 0.0) will be 0 for the missing 11.
    # But we want to normalize over ONLY these 5.
    
    # So we must filter the mbti_prior_df columns too.
    recommender.mbti_prior_df = recommender.mbti_prior_df[target_clusters]
    
    print(f"\nTesting with MBTI: {mbti_type}")
    print(f"Restricted to {len(recommender.riasec_matrix_df)} clusters")
    
    # Run recommendation
    recs = recommender.recommend(mbti_type, riasec_raw, top_k=5)
    
    print("\nTop Recommendations (Calculated with 5-cluster restriction):")
    for i, rec in enumerate(recs, 1):
        print(f"{i}. {rec.cluster}: {rec.probability:.4f}")

    print("\nUser Expected:")
    print("Education: ~0.3305")
    print("Arts: ~0.2627")
    print("STEM: ~0.1540")
    print("Finance: ~0.1317")
    print("IT: ~0.1211")

if __name__ == "__main__":
    sys.path.append("d:/edskNEXT/IP_MBTI_HOLLAND/backend")
    test_enfj_example_exact_match()
