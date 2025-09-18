import pandas as pd
import numpy as np
import os, glob
import joblib
from collections import Counter

# ========================
# ⚙️ Config
# ========================
base_path = "C:/Users/Utente/Desktop/passivbot-master/historical_data/ohlcvs_binanceusdm/BTC"
model_plain = "model_pro.pkl"
model_bal = "model_pro_balanced.pkl"

features = ["ma5","ma20","rsi","macd","stochrsi","atr","obv","roc"]

# ========================
# 📥 Carica dati recenti
# ========================
def load_recent_npy(folder: str, days: int = 3):
    files = sorted(glob.glob(os.path.join(folder, "*.npy")))
    if not files:
        raise FileNotFoundError("⚠️ Nessun file .npy trovato")

    # ultimi N file
    files = files[-days:]
    all_data = [np.load(f) for f in files]
    data = np.concatenate(all_data, axis=0)

    df = pd.DataFrame(data, columns=["timestamp","open","high","low","close","volume"])
    df["timestamp"] = pd.to_datetime(df["timestamp"], unit="ms", errors="coerce")
    df = df.dropna(subset=["timestamp"])
    df.set_index("timestamp", inplace=True)

    for col in ["open","high","low","close","volume"]:
        df[col] = pd.to_numeric(df[col])

    return df

# ========================
# 📊 Feature Engineering (leggera)
# ========================
import pandas_ta as ta
def add_features(df: pd.DataFrame) -> pd.DataFrame:
    df["ma5"] = df["close"].rolling(5).mean()
    df["ma20"] = df["close"].rolling(20).mean()
    df["rsi"] = ta.rsi(df["close"], length=14)

    macd = ta.macd(df["close"])
    if macd is not None and not macd.empty:
        df["macd"] = macd.iloc[:, 0]

    stoch = ta.stochrsi(df["close"])
    if stoch is not None and not stoch.empty:
        df["stochrsi"] = stoch.iloc[:, 0]

    df["atr"] = ta.atr(df["high"], df["low"], df["close"], length=14)
    df["obv"] = ta.obv(df["close"], df["volume"])
    df["roc"] = ta.roc(df["close"], length=10)

    for f in features:
        if f in df.columns:
            df[f] = df[f].ffill().fillna(0)

    return df.dropna(subset=features)

# ========================
# 🔎 Confronto modelli
# ========================
def compare_models():
    df = load_recent_npy(base_path, days=3)
    df = add_features(df)
    X = df[features]

    # carica modelli
    plain_models = joblib.load(model_plain)
    bal_models = joblib.load(model_bal)

    btc_plain = plain_models.get("BTCUSDT")
    btc_bal = bal_models.get("BTCUSDT")

    # predizioni ultime 20 candele
    sample = X.tail(20)
    preds_plain = btc_plain.predict(sample)
    preds_bal = btc_bal.predict(sample)

    labels = ["Strong SELL", "Weak SELL", "HOLD", "Weak BUY", "Strong BUY"]

    print("\n📊 Confronto ultimi 20 segnali BTCUSDT:")
    for i, idx in enumerate(sample.index):
        print(f"{idx} | Plain={labels[preds_plain[i]]} | Balanced={labels[preds_bal[i]]}")

if __name__ == "__main__":
    compare_models()
