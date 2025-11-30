import pandas as pd
import os

OUTPUT_FILE = "d:/edskNEXT/IP_MBTI_HOLLAND/backend/data/Questions.xlsx"

# Selected questions based on analysis of the dump
# Adjusted to 9 per axis (Total 36) to prevent ties.
# Strategy: 5 pointing one way, 4 pointing the other (approx balanced).

selected_questions = [
    # --- I vs E --- (9 questions)
    # Introversion (Yes -> I) - 5 questions
    (1, "Do you prefer spending time alone rather than attending social gatherings?", "I", "E"),
    (3, "Do you enjoy working independently more than collaborating in a team?", "I", "E"),
    (6, "Do you prefer deep one-on-one conversations to group discussions?", "I", "E"),
    (8, "Do you feel more productive when working in a quiet, solitary environment?", "I", "E"),
    (9, "Do you often reflect on your thoughts and feelings rather than sharing them immediately?", "I", "E"),
    
    # Extroversion (Yes -> E) - 4 questions
    (11, "Do you enjoy attending parties and social gatherings with many people?", "E", "I"),
    (13, "Do you feel energized and recharged after spending time with others?", "E", "I"),
    (15, "Do you find it easy to strike up conversations with strangers?", "E", "I"),
    (20, "Do you thrive in environments where you are surrounded by people?", "E", "I"),

    # --- S vs N --- (9 questions)
    # Sensing (Yes -> S) - 5 questions
    (21, "Do you prefer to focus on facts and details rather than ideas and concepts?", "S", "N"),
    (23, "Do you prefer concrete information over abstract theories?", "S", "N"),
    (24, "Do you enjoy tasks that involve hands-on work and tangible results?", "S", "N"),
    (28, "Do you prefer step-by-step instructions over broad guidelines?", "S", "N"),
    (29, "Do you enjoy working with your hands and creating physical objects?", "S", "N"),

    # Intuition (Yes -> N) - 4 questions
    (31, "Do you often think about the possibilities of what could be rather than what is?", "N", "S"),
    (32, "Do you enjoy brainstorming and coming up with new ideas?", "N", "S"),
    (33, "Do you prefer to focus on the big picture rather than getting lost in details?", "N", "S"),
    (36, "Do you enjoy exploring abstract concepts and theories?", "N", "S"),

    # --- T vs F --- (9 questions)
    # Thinking (Yes -> T) - 5 questions
    (41, "Do you prioritize logic and objectivity over emotions when making decisions?", "T", "F"),
    (42, "Do you find it easier to make decisions based on facts rather than feelings?", "T", "F"),
    (44, "Do you enjoy analyzing problems and finding logical solutions?", "T", "F"),
    (47, "Do you prefer to stick to the facts in discussions rather than appealing to emotions?", "T", "F"),
    (49, "Do you value efficiency and effectiveness over harmony in a group?", "T", "F"),

    # Feeling (Yes -> F) - 4 questions
    (51, "Do you consider how your decisions will affect others' feelings?", "F", "T"),
    (52, "Do you prefer to maintain harmony in relationships rather than winning an argument?", "F", "T"),
    (54, "Do you prioritize others' needs and emotions when making decisions?", "F", "T"),
    (58, "Do you value kindness and compassion over strict fairness?", "F", "T"),

    # --- J vs P --- (9 questions)
    # Judging (Yes -> J) - 5 questions
    (61, "Do you prefer to plan things in advance rather than being spontaneous?", "J", "P"),
    (62, "Do you feel more comfortable when you have a clear schedule and plan?", "J", "P"),
    (63, "Do you like to finish tasks before starting new ones?", "J", "P"),
    (65, "Do you prefer having a structured routine rather than going with the flow?", "J", "P"),
    (69, "Do you often set goals and work systematically to achieve them?", "J", "P"),

    # Perceiving (Yes -> P) - 4 questions
    (71, "Do you enjoy being spontaneous and flexible rather than sticking to a plan?", "P", "J"),
    (73, "Do you enjoy exploring new opportunities rather than sticking to a set path?", "P", "J"),
    (74, "Do you feel comfortable adapting to changes and new situations as they arise?", "P", "J"),
    (80, "Do you find it easy to adapt your plans when new information becomes available?", "P", "J"),
]

def create_new_excel():
    print(f"Creating new Questions.xlsx with {len(selected_questions)} questions...")
    
    # Create DataFrame
    data = []
    for i, (old_id, text, yes, no) in enumerate(selected_questions, 1):
        data.append({
            "S.No.": i,
            "Questions": text,
            "Yes": yes,
            "No": no
        })
    
    df = pd.DataFrame(data)
    
    # Save to Excel
    df.to_excel(OUTPUT_FILE, index=False)
    print(f"Successfully saved to {OUTPUT_FILE}")

if __name__ == "__main__":
    create_new_excel()
