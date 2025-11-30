import pandas as pd
from pathlib import Path

DATA_DIR = Path("d:/edskNEXT/IP_MBTI_HOLLAND/backend/data")
MBTI_CLUSTER_PRIOR_CSV = DATA_DIR / "mbti_cluster_prior.csv"
RIASEC_CLUSTER_MATRIX_CSV = DATA_DIR / "riasec_cluster_matrix.csv"

def verify():
    print("Loading files...")
    mbti_df = pd.read_csv(MBTI_CLUSTER_PRIOR_CSV)
    mbti_df.set_index("MBTI", inplace=True)
    
    riasec_df = pd.read_csv(RIASEC_CLUSTER_MATRIX_CSV)
    riasec_df.set_index("Cluster", inplace=True)
    
    mbti_clusters = set(mbti_df.columns)
    riasec_clusters = set(riasec_df.index)
    
    print(f"MBTI clusters count: {len(mbti_clusters)}")
    print(f"RIASEC clusters count: {len(riasec_clusters)}")
    
    diff = mbti_clusters.symmetric_difference(riasec_clusters)
    
    if diff:
        print("FAIL: Mismatch found!")
        print("Differences:", diff)
        exit(1)
    else:
        print("SUCCESS: All cluster names match exactly.")
        exit(0)

if __name__ == "__main__":
    verify()
