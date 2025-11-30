import pandas as pd
import os

QUESTIONS_XLSX = "d:/edskNEXT/IP_MBTI_HOLLAND/backend/data/Questions.xlsx"

def analyze_questions():
    if not os.path.exists(QUESTIONS_XLSX):
        print("File not found.")
        return

    df = pd.read_excel(QUESTIONS_XLSX)
    print(f"Total rows: {len(df)}")
    print("Columns:", df.columns.tolist())
    
    # Normalize column names
    df.columns = [c.strip().lower() for c in df.columns]
    
    # Find relevant columns
    col_q = next((c for c in df.columns if "question" in c), None)
    col_yes = next((c for c in df.columns if "yes" in c), None)
    col_no = next((c for c in df.columns if "no" in c), None)
    
    if not (col_q and col_yes and col_no):
        print("Could not identify columns.")
        return

    with open("questions_dump.txt", "w", encoding="utf-8") as f:
        f.write(f"{'ID':<5} {'Axis':<5} {'Question':<60} {'Yes':<5} {'No':<5}\n")
        f.write("-" * 90 + "\n")
        
        questions = []
        
        for idx, row in df.iterrows():
            q_text = str(row[col_q]).strip()
            yes = str(row[col_yes]).strip().upper()
            no = str(row[col_no]).strip().upper()
            
            # Determine axis
            axis = "?"
            if yes in "IE" and no in "IE": axis = "I/E"
            elif yes in "SN" and no in "SN": axis = "S/N"
            elif yes in "TF" and no in "TF": axis = "T/F"
            elif yes in "JP" and no in "JP": axis = "J/P"
            
            f.write(f"{idx+1:<5} {axis:<5} {q_text[:58]:<60} {yes:<5} {no:<5}\n")
            questions.append({"id": idx+1, "text": q_text, "axis": axis, "yes": yes, "no": no})

if __name__ == "__main__":
    analyze_questions()
