import pandas as pd
import numpy as np
import os, glob
import xgboost as xgb
import joblib
import pandas_ta as ta
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report

# ========================
# ⚙️ Config
# ========================
base_path = "C:/Users/Utente/Desktop/passivbot-master/historical_data/ohlcvs_binanceusdm"
symbols = {
    "BTCUSDT": os.path.join(base_path, "BTC"),
    "ETHUSDT": os.path.join(base_path, "ETH"),
    "BNBUSDT": os.path.join(base_path, "BNB")
}

# 🔑 Features senza bb_b (che risultava sempre NaN)
features = ["ma5","ma20","rsi","macd","stochrsi","atr","obv","roc"]

# ========================
# 📥 Caricamento dati locali (.npy)
# ========================
def load_local_data(folder: str):
    files = sorted(glob.glob(os.path.join(folder, "*.npy")))
    if not files:
        raise FileNotFoundError(f"⚠️ Nessun file .npy trovato in {folder}")

    all_data = []
    for f in files:
        arr = np.load(f)
        all_data.append(arr)

    data = np.concatenate(all_data, axis=0)

    # supponiamo formato [timestamp, open, high, low, close, volume]
    df = pd.DataFrame(data, columns=["timestamp","open","high","low","close","volume"])
    df["timestamp"] = pd.to_datetime(df["timestamp"], unit="ms", errors="coerce")
    df = df.dropna(subset=["timestamp"])
    df.set_index("timestamp", inplace=True)

    for col in ["open","high","low","close","volume"]:
        df[col] = pd.to_numeric(df[col])

    print(f"📂 Caricati {len(df)} record da {folder}")
    return df

# ========================
# 📊 Feature Engineering
# ========================
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

    # 🔎 Debug: quanti NaN per ogni feature
    print("🔎 NaN per feature:")
    print(df[features].isna().sum())

    return df

# ========================
# 🎯 Target multi-class
# ========================
def add_labels(df: pd.DataFrame, horizon: int = 5) -> pd.DataFrame:
    df["close_future"] = df["close"].shift(-horizon)
    df["future_return"] = (df["close_future"] - df["close"]) / df["close"]

    conditions = [
        (df["future_return"] < -0.007),
        (df["future_return"] < -0.003),
        (df["future_return"].between(-0.003, 0.003)),
        (df["future_return"] > 0.003),
        (df["future_return"] > 0.007)
    ]
    choices = [0, 1, 2, 3, 4]
    df["signal"] = np.select(conditions, choices, default=2)

    # drop solo se mancano close o signal
    df = df.dropna(subset=["close", "signal"])

    # riempi eventuali NaN nelle features con ffill o 0
    for f in features:
        if f in df.columns:
            df[f] = df[f].ffill().fillna(0)

    return df

# ========================
# 🧠 Training
# ========================
all_models = {}

for sym, folder in symbols.items():
    if not os.path.exists(folder):
        print(f"⚠️ Nessuna cartella trovata per {sym}, salto.")
        continue

    try:
        df = load_local_data(folder)
    except FileNotFoundError:
        print(f"⚠️ Nessun file .npy per {sym}, salto.")
        continue

    df = add_features(df)
    df = add_labels(df)

    X = df[features]
    y = df["signal"]

    print(f"📊 {sym} → campioni disponibili dopo features+labels: {len(X)}")

    if len(X) < 1000:
        print(f"⚠️ Troppi pochi dati per {sym}, salto training.")
        continue

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, shuffle=False
    )

    model = xgb.XGBClassifier(
        n_estimators=400,
        max_depth=8,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=42,
        objective="multi:softprob",
        num_class=5
    )
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    print(f"\n📈 Report per {sym}")
    print(classification_report(y_test, y_pred))

    all_models[sym] = model

# ========================
# 💾 Salva modelli
# ========================
joblib.dump(all_models, "model_pro.pkl")
print("✅ Modelli salvati in model_pro.pkl")
