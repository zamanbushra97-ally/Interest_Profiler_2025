import sys
import pandas as pd
from services.recommender import CareerClusterRecommender

def test_deduplication_and_tiebreaking():
    print("Initializing Recommender...")
    recommender = CareerClusterRecommender(alpha=0.3, beta=0.7)
    
    # Mock data to force potential duplicates and ties
    # We will inject a duplicate cluster with slightly different punctuation into the matrix
    # to see if the aggressive deduplication catches it.
    
    # 1. Inject duplicate into riasec_matrix_df
    # Existing: "Information Technology"
    # Duplicate: "Information-Technology" (should be caught by alnum check)
    
    # Boost the score of Information Technology to ensure it appears in top results
    # We'll set the RIASEC row to all 1.0s and MBTI prior to 1.0
    boosted_row = pd.Series({c: 1.0 for c in recommender.riasec_codes})
    recommender.riasec_matrix_df.loc["Information Technology"] = boosted_row
    recommender.mbti_prior_df["Information Technology"] = 1.0
    
    original_it = recommender.riasec_matrix_df.loc["Information Technology"]
    recommender.riasec_matrix_df.loc["Information-Technology"] = original_it
    
    # Also need to add it to mbti_prior_df columns so it gets picked up
    recommender.mbti_prior_df["Information-Technology"] = recommender.mbti_prior_df["Information Technology"]
    
    # 2. Force a tie in probability
    # We'll set "Finance" to have identical scores to "Information Technology"
    recommender.riasec_matrix_df.loc["Finance"] = original_it
    recommender.mbti_prior_df["Finance"] = recommender.mbti_prior_df["Information Technology"]
    
    # User data
    mbti_type = "ENFJ"
    riasec_raw = {"R": 8, "I": 14, "A": 24, "S": 20, "E": 12, "C": 6}
    
    print(f"\nTesting with MBTI: {mbti_type}")
    print("Injected 'Information-Technology' as duplicate of 'Information Technology'")
    print("Forced 'Finance' to be identical to 'Information Technology'")
    
    # Run recommendation
    recs = recommender.recommend(mbti_type, riasec_raw, top_k=10)
    
    print("\nRecommendations:")
    seen_names = set()
    for i, rec in enumerate(recs, 1):
        print(f"{i}. {rec.cluster}: {rec.probability:.6f}")
        if rec.cluster in seen_names:
            print(f"FAIL: Duplicate cluster found: {rec.cluster}")
        seen_names.add(rec.cluster)
        
    # Check for deduplication
    clusters = [r.cluster for r in recs]
    if "Information-Technology" in clusters and "Information Technology" in clusters:
        print("\nFAIL: Deduplication failed. Both 'Information-Technology' and 'Information Technology' are present.")
    elif "Information Technology" in clusters and "Information-Technology" not in clusters:
        print("\nSUCCESS: Deduplication worked. Only one version of IT is present.")
    else:
        print(f"\nWARNING: Unexpected deduplication result. Clusters: {clusters}")

    # Check for tie breaking stability
    # Finance and Information Technology have identical scores.
    # They should be sorted by name (Finance < Information Technology).
    # So Finance should come before Information Technology.
    
    print("\nRecommendations found:")
    for i, rec in enumerate(recs, 1):
        print(f"{i}. {rec.cluster}: {rec.probability:.6f}")
        
    try:
        idx_fin = clusters.index("Finance")
        idx_it = clusters.index("Information Technology")
        
        if idx_fin < idx_it:
            print("SUCCESS: Tie-breaking worked. 'Finance' comes before 'Information Technology' (alphabetical tie-break).")
        else:
            print("FAIL: Tie-breaking failed. 'Information Technology' came before 'Finance'.")
    except ValueError:
        print("Could not find both clusters to check tie-breaking. Clusters found:", clusters)

if __name__ == "__main__":
    sys.path.append("d:/edskNEXT/IP_MBTI_HOLLAND/backend")
    # Redirect stdout to file
    with open("verify_output.txt", "w") as f:
        sys.stdout = f
        test_deduplication_and_tiebreaking()
