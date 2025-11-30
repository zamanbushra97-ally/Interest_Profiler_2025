# models/bnn.py
"""
Standalone Bayesian MBTI Model with MC Dropout (NumPy Version).
- Defines BayesianMBTIMLP (4 -> 32 -> 32 -> 4 with ReLU + Dropout + Sigmoid)
- Exposes MBTIModel wrapper loading weights from artifacts/bnn_weights.json
"""

import os
import json
import numpy as np

def relu(x):
    return np.maximum(0, x)

def sigmoid(x):
    return 1 / (1 + np.exp(-x))

def dropout(x, p=0.25, training=False):
    if not training:
        return x
    # Inverted dropout: scale by 1/(1-p)
    mask = (np.random.rand(*x.shape) > p).astype(np.float32)
    return (x * mask) / (1 - p)

class BayesianMBTIMLP:
    """
    Simple MLP with dropout for MC Dropout Bayesian approximation.
    Input:  4 features (axis scores I/E, S/N, T/F, J/P)
    Output: 4 probabilities (for I, S, T, J)
    """
    def __init__(self, weights_dict):
        self.w1 = np.array(weights_dict["l1_weight"]).T  # (4, 32)
        self.b1 = np.array(weights_dict["l1_bias"])
        self.w2 = np.array(weights_dict["l2_weight"]).T  # (32, 32)
        self.b2 = np.array(weights_dict["l2_bias"])
        self.w3 = np.array(weights_dict["l3_weight"]).T  # (32, 4)
        self.b3 = np.array(weights_dict["l3_bias"])

    def forward(self, x, training=False):
        # x shape: (batch, 4)
        
        # Layer 1
        x = np.dot(x, self.w1) + self.b1
        x = relu(x)
        x = dropout(x, p=0.25, training=training)
        
        # Layer 2
        x = np.dot(x, self.w2) + self.b2
        x = relu(x)
        x = dropout(x, p=0.25, training=training)
        
        # Layer 3
        x = np.dot(x, self.w3) + self.b3
        x = sigmoid(x)
        
        return x


def mbti_from_probs(p: np.ndarray) -> str:
    """Convert 4D probs [p_I, p_S, p_T, p_J] to MBTI string."""
    return "".join([
        "I" if p[0] >= 0.5 else "E",
        "S" if p[1] >= 0.5 else "N",
        "T" if p[2] >= 0.5 else "F",
        "J" if p[3] >= 0.5 else "P",
    ])


class MBTIModel:
    """
    Wrapper around BayesianMBTIMLP with MC Dropout inference.
    - Loads weights from artifacts/bnn_weights.json
    """

    def __init__(self, model_path: str = None):
        # allow env override
        path = model_path or os.getenv("IP_BNN_WEIGHTS", "artifacts/bnn_weights.json")
        if not os.path.exists(path):
            # Fallback to looking in current directory if artifacts/ is not found relative to cwd
            if os.path.exists(os.path.join("backend", path)):
                path = os.path.join("backend", path)
            elif not os.path.exists(path):
                 raise RuntimeError(f"BNN weights not found at: {path}")

        with open(path, "r") as f:
            weights = json.load(f)
            
        self.model = BayesianMBTIMLP(weights)
        self.meta = {}

    def predict(self, features: np.ndarray, n_samples: int = 50):
        """
        features: np.array shape (4,) with [IE, SN, TF, JP] ∈ [0,1]
        returns:
            mbti_type: str
            mean_probs: np.array shape (4,)
            std_probs:  np.array shape (4,)
        """
        # ensure shape and clip to [0,1]
        f = np.asarray(features, dtype=np.float32).reshape(-1)
        if f.shape[0] != 4:
            raise ValueError(f"Expected 4 features [IE,SN,TF,JP], got shape {f.shape}")
        f = np.clip(f, 0.0, 1.0)
        
        # Batch dimension
        x = f.reshape(1, 4)

        preds = []
        # MC Dropout: run forward pass multiple times with training=True (to enable dropout)
        for _ in range(max(1, int(n_samples))):
            out = self.model.forward(x, training=True)
            preds.append(out)

        preds = np.array(preds).squeeze(axis=1)  # [n_samples, 4]
        mean_probs = preds.mean(axis=0)
        std_probs = preds.std(axis=0)
        mbti = mbti_from_probs(mean_probs)

        return mbti, mean_probs, std_probs


# Optional: simple singleton getter to avoid re-loading on each import
_model_singleton = None
def get_model(model_path: str = None) -> MBTIModel:
    global _model_singleton
    if _model_singleton is None:
        _model_singleton = MBTIModel(model_path=model_path)
    return _model_singleton
