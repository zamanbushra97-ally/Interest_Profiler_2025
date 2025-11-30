import numpy as np

def calculate_confidence(features):
    feature_distances = np.abs(features - 0.5)
    mean_distance = float(feature_distances.mean())
    
    print(f"Features: {features}")
    print(f"Distances: {feature_distances}")
    print(f"Mean Distance: {mean_distance}")

    # New proposed logic for 9 questions
    if mean_distance >= 0.45:
        base_confidence = 0.95
    elif mean_distance >= 0.35:
        # Interpolate 0.90 - 0.95
        base_confidence = 0.90 + (mean_distance - 0.35) / 0.10 * 0.05
    elif mean_distance >= 0.25:
        # Interpolate 0.80 - 0.90
        base_confidence = 0.80 + (mean_distance - 0.25) / 0.10 * 0.10
    elif mean_distance >= 0.15:
        # Interpolate 0.65 - 0.80
        base_confidence = 0.65 + (mean_distance - 0.15) / 0.10 * 0.15
    elif mean_distance >= 0.05:
        # Interpolate 0.45 - 0.65
        base_confidence = 0.45 + (mean_distance - 0.05) / 0.10 * 0.20
    else:
        # Interpolate 0.00 - 0.45
        base_confidence = mean_distance / 0.05 * 0.45
        
    print(f"Base Confidence: {base_confidence * 100:.2f}%")
    return base_confidence

# 9 questions per axis
# Splits:
# 5-4: 5/9 = 0.555... -> Dist 0.055...
# 6-3: 6/9 = 0.666... -> Dist 0.166...
# 7-2: 7/9 = 0.777... -> Dist 0.277...
# 8-1: 8/9 = 0.888... -> Dist 0.388...
# 9-0: 9/9 = 1.0      -> Dist 0.5

print("--- Scenario 1: 5-4 split (Weakest) ---")
features_5_4 = np.array([5/9, 5/9, 5/9, 5/9])
calculate_confidence(features_5_4)

print("\n--- Scenario 2: 6-3 split (Moderate) ---")
features_6_3 = np.array([6/9, 6/9, 6/9, 6/9])
calculate_confidence(features_6_3)

print("\n--- Scenario 3: 7-2 split (Strong) ---")
features_7_2 = np.array([7/9, 7/9, 7/9, 7/9])
calculate_confidence(features_7_2)

print("\n--- Scenario 4: 8-1 split (Very Strong) ---")
features_8_1 = np.array([8/9, 8/9, 8/9, 8/9])
calculate_confidence(features_8_1)

print("\n--- Scenario 5: Mixed (Average) ---")
# Two 5-4, Two 6-3
features_mixed = np.array([5/9, 5/9, 6/9, 6/9])
calculate_confidence(features_mixed)
