import json
import torch
import numpy as np
from models.bnn import MBTIModel

def extract_weights():
    print("Loading model...")
    # Initialize model (loads from artifacts/bayes_trait_estimator.pt by default)
    model_wrapper = MBTIModel()
    net = model_wrapper.model.net
    
    # Extract weights and biases
    # Structure:
    # 0: Linear(4, 32)
    # 1: ReLU
    # 2: Dropout
    # 3: Linear(32, 32)
    # 4: ReLU
    # 5: Dropout
    # 6: Linear(32, 4)
    # 7: Sigmoid
    
    weights = {
        "l1_weight": net[0].weight.detach().numpy().tolist(),
        "l1_bias": net[0].bias.detach().numpy().tolist(),
        "l2_weight": net[3].weight.detach().numpy().tolist(),
        "l2_bias": net[3].bias.detach().numpy().tolist(),
        "l3_weight": net[6].weight.detach().numpy().tolist(),
        "l3_bias": net[6].bias.detach().numpy().tolist(),
    }
    
    output_path = "artifacts/bnn_weights.json"
    with open(output_path, "w") as f:
        json.dump(weights, f)
        
    print(f"Weights saved to {output_path}")

if __name__ == "__main__":
    extract_weights()
