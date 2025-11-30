import sys
import pandas as pd
from services.recommender import CareerClusterRecommender

def test_enfj_example():
    print("Initializing Recommender...")
    recommender = CareerClusterRecommender(alpha=0.3, beta=0.7)
    
    # User's example data
    mbti_type = "ENFJ"
    riasec_raw = {"R": 8, "I": 14, "A": 24, "S": 20, "E": 12, "C": 6}
    
    # MOCK the priors to match user's example for exact verification
    # User example: STEM 0.10, IT 0.05, Finance 0.05, Arts 0.30, Education 0.50
    # We'll set these specific ones and leave others as they are (or 0)
    # The user's example didn't specify others, so the final probability normalization might differ 
    # if we don't know the full set. 
    # However, let's just see if the raw combined scores match before final normalization?
    # actually, the code normalizes p_mbti. 
    # User's example priors sum: 0.1+0.05+0.05+0.3+0.5 = 1.0. 
    # So we can assume other clusters are 0.0 for this test.
    
    mock_priors = {c: 0.0 for c in recommender.mbti_prior_df.columns}
    mock_priors["Science, Technology, Engineering, and Mathematics (STEM)"] = 0.10
    mock_priors["Information Technology"] = 0.05
    mock_priors["Finance"] = 0.05
    mock_priors["Arts, Audio/Video Technology, and Communications"] = 0.30
    mock_priors["Education and training"] = 0.50
    
    # Update the dataframe row for ENFJ
    recommender.mbti_prior_df.loc["ENFJ"] = pd.Series(mock_priors)
    
    print(f"\nTesting with MBTI: {mbti_type}")
    print(f"Raw RIASEC: {riasec_raw}")
    
    # Run recommendation
    recs = recommender.recommend(mbti_type, riasec_raw, top_k=5)
    
    print("\nTop Recommendations (Calculated):")
    for i, rec in enumerate(recs, 1):
        print(f"{i}. {rec.cluster}: {rec.probability:.4f}")

    print("\nUser Expected:")
    print("Education: ~0.33")
    print("Arts: ~0.26")
    print("STEM: ~0.15")
    print("Finance: ~0.13")
    print("IT: ~0.12")

if __name__ == "__main__":
    sys.path.append("d:/edskNEXT/IP_MBTI_HOLLAND/backend")
    test_enfj_example()
