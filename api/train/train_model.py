import pandas as pd
import pandas_ta as ta
from binance.client import Client
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
import joblib

# ========================
# 🔑 Binance API Keys (puoi lasciarli vuoti per dati pubblici)
# ========================
API_KEY = ""
API_SECRET = ""

client = Client(API_KEY, API_SECRET)

# ========================
# 📥 Scarica dati storici a pezzi
# ========================
symbol = "BTCUSDT"
interval = Client.KLINE_INTERVAL_1MINUTE

# scarichiamo mese per mese da gennaio 2024
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

all_klines = []
for start, end in months:
    print(f"⬇️ Scarico {symbol} da {start} a {end} ...")
    klines = client.get_historical_klines(symbol, interval, start, end)
    all_klines.extend(klines)

print(f"✅ Totale candele scaricate: {len(all_klines)}")

# ========================
# 📄 Trasformazione in DataFrame
# ========================
df = pd.DataFrame(all_klines, columns=[
    "timestamp", "open", "high", "low", "close", "volume",
    "close_time", "qav", "num_trades", "taker_base", "taker_quote", "ignore"
])

df["timestamp"] = pd.to_datetime(df["timestamp"], unit="ms")
df.set_index("timestamp", inplace=True)

# trasformiamo i campi in numerici
for col in ["open", "high", "low", "close", "volume"]:
    df[col] = pd.to_numeric(df[col])

# ========================
# 📊 Calcolo indicatori tecnici
# ========================
df["ma5"] = df["close"].rolling(5).mean()
df["ma20"] = df["close"].rolling(20).mean()
df["rsi"] = ta.rsi(df["close"], length=14)

# target: BUY (1) se ma5 > ma20, SELL (0) altrimenti
df["signal"] = (df["ma5"] > df["ma20"]).astype(int)

# puliamo i NaN
df = df.dropna()

# ========================
# 🎯 Addestramento modello
# ========================
X = df[["ma5", "ma20", "rsi"]]
y = df["signal"]

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

model = RandomForestClassifier(n_estimators=100, random_state=42)
model.fit(X_train, y_train)

# valutazione
y_pred = model.predict(X_test)
print(classification_report(y_test, y_pred))

# ========================
# 💾 Salva modello
# ========================
joblib.dump(model, "model_rf.pkl")
print("✅ Modello salvato in model_rf.pkl")
