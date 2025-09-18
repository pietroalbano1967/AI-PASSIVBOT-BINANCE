import os
import joblib
import pandas as pd
from ta.momentum import RSIIndicator
from ta.trend import EMAIndicator, MACD

# Percorso assoluto al file del modello dentro "api/"
BASE_DIR = os.path.dirname(__file__)
MODEL_PATH = os.path.join(BASE_DIR, "model_pro_balanced.pkl")

# Caricamento del modello

models = {
    "BTCUSDT": joblib.load(MODEL_PATH)   # ✅ chiave uguale a quella usata nel frontend
}

# Colonne delle feature usate dal modello
FEATURE_COLUMNS = ["close", "rsi", "ema20", "ema50", "macd", "macd_signal", "macd_diff"]

def compute_features(df: pd.DataFrame) -> pd.DataFrame:
    # RSI
    rsi = RSIIndicator(close=df["close"], window=14)
    df["rsi"] = rsi.rsi()

    # EMA 20 e 50
    ema20 = EMAIndicator(close=df["close"], window=20)
    df["ema20"] = ema20.ema_indicator()
    ema50 = EMAIndicator(close=df["close"], window=50)
    df["ema50"] = ema50.ema_indicator()

    # MACD
    macd = MACD(close=df["close"], window_slow=26, window_fast=12, window_sign=9)
    df["macd"] = macd.macd()
    df["macd_signal"] = macd.macd_signal()
    df["macd_diff"] = macd.macd_diff()

    # ✅ aggiungi MA5 e MA20
    df["ma5"] = df["close"].rolling(window=5).mean()
    df["ma20"] = df["close"].rolling(window=20).mean()

    return df
