import sys
import numpy as np
from services.mbti_inference import build_features_from_responses

def test_tie_breaking():
    print("Testing Tie-Breaking Logic...")
    
    # Create a scenario with exactly equal Yes/No answers for I/E axis
    # 2 answers: 1 Yes (I), 1 No (E) -> 1 I, 1 E
    # This should result in a tie (1 vs 1).
    # Our logic should return 0.51 for I/E ratio.
    
    # We need to mock QUESTION_TRAITS because build_features_from_responses uses it
    # to look up traits for QIDs.
    from services.mbti_questions import QUESTION_TRAITS
    
    # Mock traits for QID "1" and "2"
    # QID 1: Yes=I, No=E
    # QID 2: Yes=I, No=E
    QUESTION_TRAITS["1"] = ("I", "E", 0)
    QUESTION_TRAITS["2"] = ("I", "E", 0)
    
    responses = [
        {"qid": "1", "answer": "yes"}, # Adds 1 to I
        {"qid": "2", "answer": "no"},  # Adds 1 to E (since No=E)
    ]
    
    # Total: I=1, E=1. Ratio I/(I+E) = 0.5.
    # With tie-breaker, should be 0.51.
    
    features = build_features_from_responses(responses)
    ie_ratio = features[0]
    
    print(f"I/E Ratio: {ie_ratio}")
    
    if abs(ie_ratio - 0.51) < 1e-6:
        print("SUCCESS: Tie-breaker applied correctly (0.51).")
    elif abs(ie_ratio - 0.5) < 1e-6:
        print("FAIL: Ratio is 0.5. Tie-breaker NOT applied.")
    else:
        print(f"FAIL: Unexpected ratio {ie_ratio}")

if __name__ == "__main__":
    sys.path.append("d:/edskNEXT/IP_MBTI_HOLLAND/backend")
    test_tie_breaking()
