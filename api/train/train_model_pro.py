import pandas as pd
import pandas_ta as ta
from binance.client import Client
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
import xgboost as xgb
import joblib
import numpy as np

# ========================
# 🔑 Binance API Keys (vuoti → solo dati pubblici)
# ========================
API_KEY = ""
API_SECRET = ""
client = Client(API_KEY, API_SECRET)

# ========================
# ⚙️ Config
# ========================
symbols = ["BTCUSDT", "ETHUSDT"]   # puoi aggiungere altri
interval = Client.KLINE_INTERVAL_1MINUTE

# Scarico 2024 in blocchi mensili
months = [
    ("1 Jan, 2024", "1 Feb, 2024"),
    ("1 Feb, 2024", "1 Mar, 2024"),
    ("1 Mar, 2024", "1 Apr, 2024"),
    ("1 Apr, 2024", "1 May, 2024"),
    ("1 May, 2024", "1 Jun, 2024"),
    ("1 Jun, 2024", "1 Jul, 2024"),
    ("1 Jul, 2024", "1 Aug, 2024"),
    ("1 Aug, 2024", "1 Sep, 2024"),
    ("1 Sep, 2024", "1 Oct, 2024"),
    ("1 Oct, 2024", "1 Nov, 2024"),
    ("1 Nov, 2024", "1 Dec, 2024"),
    ("1 Dec, 2024", "1 Jan, 2025"),
]

# ========================
# 📥 Download a blocchi + pulizia duplicati
# ========================
def download_data(symbol: str):
    all_klines = []
    for start, end in months:
        print(f"⬇️ Scarico {symbol} da {start} a {end}")
        klines = client.get_historical_klines(symbol, interval, start, end)
        all_klines.extend(klines)

    print(f"✅ Totale candele scaricate {symbol}: {len(all_klines)}")

    df = pd.DataFrame(all_klines, columns=[
        "timestamp","open","high","low","close","volume",
        "close_time","qav","num_trades","taker_base","taker_quote","ignore"
    ])
    df["timestamp"] = pd.to_datetime(df["timestamp"], unit="ms")
    df.set_index("timestamp", inplace=True)

    # 🔹 fix duplicati e ordinamento
    df = df[~df.index.duplicated(keep="first")]
    df = df.sort_index()

    for col in ["open","high","low","close","volume"]:
        df[col] = pd.to_numeric(df[col])

    return df

# ========================
# 📊 Feature Engineering robusta
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

    bb = ta.bbands(df["close"], length=20, std=2)
    if bb is not None and not bb.empty and "BBL_20_2.0" in bb.columns and "BBU_20_2.0" in bb.columns:
        df["bb_b"] = (df["close"] - bb["BBL_20_2.0"]) / (bb["BBU_20_2.0"] - bb["BBL_20_2.0"])
    else:
        df["bb_b"] = np.nan

    df["obv"] = ta.obv(df["close"], df["volume"])
    df["roc"] = ta.roc(df["close"], length=10)

    return df

# ========================
# 🎯 Target: 5 classi
# ========================
def add_labels(df: pd.DataFrame, horizon: int = 5) -> pd.DataFrame:
    df["close_future"] = df["close"].shift(-horizon)
    df["future_return"] = (df["close_future"] - df["close"]) / df["close"]

    conditions = [
        (df["future_return"] < -0.007),   # Strong SELL
        (df["future_return"] < -0.003),   # Weak SELL
        (df["future_return"].between(-0.003, 0.003)),  # HOLD
        (df["future_return"] > 0.003),    # Weak BUY
        (df["future_return"] > 0.007)     # Strong BUY
    ]
    choices = [0, 1, 2, 3, 4]
    df["signal"] = np.select(conditions, choices, default=2)

    return df.dropna()

# ========================
# 🧠 Training
# ========================
all_models = {}
features = ["ma5","ma20","rsi","macd","stochrsi","atr","bb_b","obv","roc"]

for sym in symbols:
    df = download_data(sym)
    df = add_features(df)
    df = add_labels(df)

    X = df[features].dropna()
    y = df.loc[X.index, "signal"]

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
