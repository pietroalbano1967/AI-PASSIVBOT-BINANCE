import pandas as pd
import numpy as np
from ta.momentum import RSIIndicator
from ta.trend import EMAIndicator, MACD
from sklearn.ensemble import RandomForestClassifier
import joblib
import os

# ============================
# 1. CREA UN DATASET FITTIZIO
# ============================
np.random.seed(42)
n = 1000
prices = np.cumsum(np.random.randn(n)) + 20000
volumes = np.random.randint(100, 1000, n)

df = pd.DataFrame({
    "open": prices + np.random.randn(n),
    "high": prices + np.random.rand(n) * 10,
    "low": prices - np.random.rand(n) * 10,
    "close": prices,
    "volume": volumes
})

# ============================
# 2. CALCOLA LE FEATURE
# ============================
df["rsi"] = RSIIndicator(close=df["close"], window=14).rsi()
df["ema20"] = EMAIndicator(close=df["close"], window=20).ema_indicator()
df["ema50"] = EMAIndicator(close=df["close"], window=50).ema_indicator()
macd = MACD(close=df["close"], window_slow=26, window_fast=12, window_sign=9)
df["macd"] = macd.macd()
df["macd_signal"] = macd.macd_signal()
df["macd_diff"] = macd.macd_diff()

df["target"] = np.where(df["close"].diff() > 0, 1, 0)
df = df.dropna()

FEATURE_COLUMNS = ["close", "rsi", "ema20", "ema50", "macd", "macd_signal", "macd_diff"]

X = df[FEATURE_COLUMNS]
y = df["target"]

# ============================
# 3. ADDDESTRA IL MODELLO
# ============================
clf = RandomForestClassifier(n_estimators=100, random_state=42)
clf.fit(X, y)

# ============================
# 4. SALVA SOLO IL MODELLO
# ============================
BASE_DIR = os.path.dirname(os.path.dirname(__file__))  # risale a api/
MODEL_PATH = os.path.join(BASE_DIR, "model_pro_balanced.pkl")

joblib.dump(clf, MODEL_PATH)

print(f"✅ Modello addestrato e salvato come '{MODEL_PATH}'")
