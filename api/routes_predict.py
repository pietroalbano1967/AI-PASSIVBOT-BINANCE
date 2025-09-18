from fastapi import APIRouter, Query
import pandas as pd
import numpy as np
import time
from .ai_utils import models, compute_features, FEATURE_COLUMNS

router = APIRouter()

@router.get("/predict")
def predict(
    symbol: str = Query("BTCUSDT"),
    open: float = Query(None),   # ora non è più obbligatorio
    high: float = Query(...),
    low: float = Query(...),
    close: float = Query(...),
    volume: float = Query(...)
):
    # se non arriva open dal frontend → lo settiamo uguale al close
    if open is None:
        open = close

    df = pd.DataFrame([{
        "open": open,
        "high": high,
        "low": low,
        "close": close,
        "volume": volume
    }])

    df = compute_features(df)
    if df.empty:
        return {"error": "Not enough data to compute features"}

    X = df[FEATURE_COLUMNS].iloc[[-1]]

    model = models.get(symbol.upper())
    if model is None:
        return {"error": f"No model available for {symbol}"}

    proba = model.predict_proba(X)[0]
    pred = int(np.argmax(proba))

    labels = ["Strong SELL", "Weak SELL", "HOLD", "Weak BUY", "Strong BUY"]
    signal = labels[pred]

    return {
        "symbol": symbol.upper(),
        "signal": signal,
        "confidence": round(float(proba[pred]), 3),
        "probs": {labels[i]: round(float(p), 3) for i, p in enumerate(proba)},
        "t": int(time.time()),
        "close": close
    }

