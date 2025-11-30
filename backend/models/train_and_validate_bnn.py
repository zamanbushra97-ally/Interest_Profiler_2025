# backend/models/train_and_validate_bnn.py
"""
Train + validate + test the BayesianMBTIMLP on an external CSV.

Accepted CSV schemas (pick one):
A) Ratios (recommended)
   IE,SN,TF,JP,MBTI

B) Counts (auto-converted to ratios)
   I_count,E_count,S_count,N_count,T_count,F_count,J_count,P_count,MBTI

Outputs:
- Saves best weights (with metadata) → backend/artifacts/bayes_trait_estimator.pt
- Prints validation and test accuracy (exact 4-letter and per-axis)

Usage (from backend/):
  python -m models.train_and_validate_bnn --data-csv data/bnn_training.csv
"""

import os
import argparse
import random
from typing import Tuple

import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from torch.optim import Adam
from torch.utils.data import Dataset, DataLoader
from sklearn.model_selection import train_test_split

# Your model definition lives in bnn.py
from .bnn import BayesianMBTIMLP

SEED = 1337
random.seed(SEED)
np.random.seed(SEED)
torch.manual_seed(SEED)

LEFTS = ["I", "S", "T", "J"]  # outputs correspond to left letters


# ----------------------------
# Data utils
# ----------------------------
def mbti_to_targets(mbti: str) -> np.ndarray:
    m = str(mbti).strip().upper()
    if len(m) != 4:
        raise ValueError(f"Bad MBTI label: {mbti}")
    return np.array([
        1.0 if m[0] == "I" else 0.0,
        1.0 if m[1] == "S" else 0.0,
        1.0 if m[2] == "T" else 0.0,
        1.0 if m[3] == "J" else 0.0,
    ], dtype=np.float32)


def counts_to_ratios(df: pd.DataFrame) -> pd.DataFrame:
    need = {
        "I_count","E_count","S_count","N_count",
        "T_count","F_count","J_count","P_count"
    }
    if not need.issubset(df.columns):
        return df  # not counts schema; nothing to do

    def ratio(pos_col, neg_col):
        s = df[pos_col].astype(float) + df[neg_col].astype(float)
        r = df[pos_col].astype(float) / s.replace(0, np.nan)
        return r.fillna(0.5)  # neutral if no votes

    out = df.copy()
    out["IE"] = ratio("I_count","E_count")
    out["SN"] = ratio("S_count","N_count")
    out["TF"] = ratio("T_count","F_count")
    out["JP"] = ratio("J_count","P_count")
    return out


def load_and_clean(data_csv: str) -> pd.DataFrame:
    df = pd.read_csv(data_csv)
    df = counts_to_ratios(df)

    required = {"IE","SN","TF","JP","MBTI"}
    missing = required - set(df.columns)
    if missing:
        raise ValueError(f"CSV missing required columns: {missing}")

    # clamp numeric to [0,1]
    for col in ["IE","SN","TF","JP"]:
        df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0.5).clip(0.0, 1.0)

    # keep only proper 4-letter labels
    df = df[df["MBTI"].astype(str).str.len() == 4].reset_index(drop=True)

    if len(df) < 50:
        raise ValueError(f"Not enough rows to train (got {len(df)}). Need >= 50.")

    return df


def stratified_split(
    df: pd.DataFrame, val_frac=0.15, test_frac=0.15, seed=SEED
) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    # train / (val+test)
    train_df, temp_df = train_test_split(
        df, test_size=val_frac + test_frac, stratify=df["MBTI"], random_state=seed
    )
    # split val/test from temp
    rel_val = val_frac / (val_frac + test_frac) if (val_frac + test_frac) > 0 else 0.5
    val_df, test_df = train_test_split(
        temp_df, test_size=(1 - rel_val), stratify=temp_df["MBTI"], random_state=seed
    )
    return train_df.reset_index(drop=True), val_df.reset_index(drop=True), test_df.reset_index(drop=True)


class AxisDataset(Dataset):
    def __init__(self, df: pd.DataFrame):
        self.X = df[["IE","SN","TF","JP"]].astype(np.float32).values
        self.Y = np.vstack([mbti_to_targets(m) for m in df["MBTI"].values]).astype(np.float32)
    def __len__(self): return len(self.X)
    def __getitem__(self, i):
        return torch.tensor(self.X[i]), torch.tensor(self.Y[i])


# ----------------------------
# Metrics
# ----------------------------
def exact_mbti_acc(yhat: torch.Tensor, ytrue: torch.Tensor) -> float:
    pred = (yhat.detach().cpu().numpy() >= 0.5).astype(np.float32)
    true = ytrue.detach().cpu().numpy()
    return float((pred == true).all(axis=1).mean())

def per_axis_acc(yhat: torch.Tensor, ytrue: torch.Tensor) -> np.ndarray:
    pred = (yhat.detach().cpu().numpy() >= 0.5).astype(np.float32)
    true = ytrue.detach().cpu().numpy()
    return (pred == true).mean(axis=0)


# ----------------------------
# Train / Eval loops
# ----------------------------
def evaluate(model: nn.Module, loader: DataLoader, criterion: nn.Module):
    model.eval()
    tot_loss = 0.0
    tot_exact = 0.0
    tot_axis = np.zeros(4, dtype=np.float64)

    with torch.no_grad():
        for xb, yb in loader:
            out = model(xb)
            loss = criterion(out, yb)
            n = xb.size(0)
            tot_loss  += loss.item() * n
            tot_exact += exact_mbti_acc(out, yb) * n
            tot_axis  += per_axis_acc(out, yb) * n

    N = len(loader.dataset)
    return (
        tot_loss / N,
        tot_exact / N,
        (tot_axis / N),
    )


def train(args):
    os.makedirs(os.path.dirname(args.artifact), exist_ok=True)

    # 1) Data
    df = load_and_clean(args.data_csv)
    train_df, val_df, test_df = stratified_split(df, args.val_frac, args.test_frac, SEED)
    print(f"[split] train={len(train_df)}  val={len(val_df)}  test={len(test_df)}")

    train_ds = AxisDataset(train_df)
    val_ds   = AxisDataset(val_df)
    test_ds  = AxisDataset(test_df)

    train_loader = DataLoader(train_ds, batch_size=args.batch_size, shuffle=True)
    val_loader   = DataLoader(val_ds,   batch_size=max(128, args.batch_size))
    test_loader  = DataLoader(test_ds,  batch_size=max(128, args.batch_size))

    # 2) Model
    model = BayesianMBTIMLP(in_dim=4, hidden=args.hidden)
    criterion = nn.BCELoss()  # sigmoid is in the model
    optim = Adam(model.parameters(), lr=args.lr, weight_decay=args.weight_decay)

    best_val = float("inf")
    patience = args.patience

    # 3) Epochs
    for epoch in range(1, args.epochs + 1):
        model.train()
        run_loss = 0.0

        for xb, yb in train_loader:
            optim.zero_grad()
            out = model(xb)
            loss = criterion(out, yb)
            loss.backward()
            optim.step()
            run_loss += loss.item() * xb.size(0)

        tr_loss = run_loss / len(train_loader.dataset)
        vl_loss, vl_exact, vl_axis = evaluate(model, val_loader, criterion)

        print(
            f"Epoch {epoch:02d} | "
            f"train_loss={tr_loss:.4f}  "
            f"val_loss={vl_loss:.4f}  "
            f"val_exact_acc={vl_exact*100:5.2f}%  "
            f"val_axis_acc(I,S,T,J)={[round(a*100,2) for a in vl_axis]}%"
        )

        # Save best
        if vl_loss < best_val - 1e-6:
            best_val = vl_loss
            patience = args.patience
            torch.save({
                "state_dict": model.state_dict(),
                "meta": {
                    "version": args.version,
                    "val_loss": float(vl_loss),
                    "train_rows": int(len(train_ds)),
                    "val_rows": int(len(val_ds)),
                }
            }, args.artifact)
            print(f"  ↳ Saved best weights → {args.artifact}")
        else:
            patience -= 1
            if patience <= 0:
                print("  ↳ Early stopping.")
                break

    # 4) Test with best weights
    blob = torch.load(args.artifact, map_location="cpu")
    state_dict = blob["state_dict"] if isinstance(blob, dict) and "state_dict" in blob else blob

    best = BayesianMBTIMLP(in_dim=4, hidden=args.hidden)
    best.load_state_dict(state_dict)
    best.eval()

    te_loss, te_exact, te_axis = evaluate(best, test_loader, criterion)

    print("\n==================== TEST METRICS ====================")
    print(f"test_loss                : {te_loss:.4f}")
    print(f"test_exact_4letter_acc   : {te_exact*100:5.2f}%")
    print(f"test_axis_acc (I,S,T,J)  : {[round(a*100,2) for a in te_axis]}%")
    print("======================================================")
    print(f"Best weights saved at    : {args.artifact}")
    return 0


def main():
    parser = argparse.ArgumentParser("Train & validate BNN from an external CSV")
    parser.add_argument("--data-csv", required=True, help="Path to CSV with IE,SN,TF,JP,MBTI or counts+MBTI.")
    parser.add_argument("--artifact", default=os.path.join(os.path.dirname(__file__), "..", "artifacts", "bayes_trait_estimator.pt"))
    parser.add_argument("--version", default="1.0.0")
    parser.add_argument("--epochs", type=int, default=30)
    parser.add_argument("--batch-size", type=int, default=128)
    parser.add_argument("--hidden", type=int, default=32)
    parser.add_argument("--lr", type=float, default=1e-3)
    parser.add_argument("--weight-decay", type=float, default=1e-5)
    parser.add_argument("--val-frac", type=float, default=0.15)
    parser.add_argument("--test-frac", type=float, default=0.15)
    parser.add_argument("--patience", type=int, default=6)
    args = parser.parse_args()
    raise SystemExit(train(args))


if __name__ == "__main__":
    main()

