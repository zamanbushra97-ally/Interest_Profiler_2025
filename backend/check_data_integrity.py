import pandas as pd
import os

MBTI_PATH = "backend/data/Questions.xlsx"
RIASEC_PATH = "backend/data/riasec_items.csv"

def check_mbti():
    print("\n--- Checking MBTI Questions ---")
    if not os.path.exists(MBTI_PATH):
        print(f"FAIL: File not found: {MBTI_PATH}")
        return

    try:
        df = pd.read_excel(MBTI_PATH)
        print(f"Loaded {len(df)} rows from {MBTI_PATH}")
        
        # Normalize columns
        df.columns = [c.strip() for c in df.columns]
        
        # Check for duplicates
        col_q = "Question"
        if "Questions" in df.columns:
            col_q = "Questions"
        elif "Question" not in df.columns:
            print(f"WARNING: Neither 'Question' nor 'Questions' column found. Available: {df.columns.tolist()}")
            
        if col_q in df.columns:
            dups = df[df.duplicated(col_q, keep=False)]
            if not dups.empty:
                print(f"FAIL: Found {len(dups)} duplicate questions:")
                print(dups[col_q].tolist())
            else:
                print(f"SUCCESS: No duplicate questions found in '{col_q}'.")

        # Check balance
        # We need to infer axis. Logic from mbti_questions.py
        axes = [("I", "E"), ("S", "N"), ("T", "F"), ("J", "P")]
        
        def get_axis(row):
            y = str(row.get("Yes", "")).strip().upper()
            n = str(row.get("No", "")).strip().upper()
            for idx, (a, b) in enumerate(axes):
                if y in (a, b) and n in (a, b):
                    return axes[idx]
            return None

        df["axis"] = df.apply(get_axis, axis=1)
        
        # Check for unmapped rows
        unmapped = df[df["axis"].isnull()]
        if not unmapped.empty:
            print(f"WARNING: {len(unmapped)} rows could not be mapped to an axis.")
            # print(unmapped)
        
        counts = df["axis"].value_counts()
        print("\nCounts per axis:")
        print(counts)
        
        # Check if counts are equal
        if len(counts.unique()) == 1:
            print(f"SUCCESS: All axes have equal number of questions ({counts.iloc[0]}).")
        else:
            print("FAIL: Axes have unequal number of questions.")

    except Exception as e:
        print(f"ERROR checking MBTI: {e}")

def check_riasec():
    print("\n--- Checking RIASEC Questions ---")
    if not os.path.exists(RIASEC_PATH):
        print(f"FAIL: File not found: {RIASEC_PATH}")
        return

    try:
        if RIASEC_PATH.endswith(".xlsx"):
            df = pd.read_excel(RIASEC_PATH)
        else:
            df = pd.read_csv(RIASEC_PATH)
            
        print(f"Loaded {len(df)} rows from {RIASEC_PATH}")
        
        # Normalize columns
        df.columns = [c.strip() for c in df.columns]
        
        # Rename if needed (based on riasec_items.py)
        rename_map = {"QID": "id", "Question": "text", "Key": "scale"}
        df = df.rename(columns={k: v for k, v in rename_map.items() if k in df.columns})
        
        # Check for duplicates
        if "text" in df.columns:
            dups = df[df.duplicated("text", keep=False)]
            if not dups.empty:
                print(f"FAIL: Found {len(dups)} duplicate questions:")
                print(dups["text"].tolist())
            else:
                print("SUCCESS: No duplicate questions found.")
        
        # Check balance
        if "scale" in df.columns:
            df["scale"] = df["scale"].astype(str).str.strip().str.upper()
            counts = df["scale"].value_counts()
            print("\nCounts per scale:")
            print(counts)
            
            if len(counts.unique()) == 1:
                print(f"SUCCESS: All scales have equal number of questions ({counts.iloc[0]}).")
            else:
                print("FAIL: Scales have unequal number of questions.")
        else:
            print("FAIL: 'scale' (or 'Key') column not found.")

    except Exception as e:
        print(f"ERROR checking RIASEC: {e}")

if __name__ == "__main__":
    check_mbti()
    check_riasec()
