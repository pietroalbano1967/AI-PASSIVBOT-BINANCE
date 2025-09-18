import ccxt
import pandas as pd
import os
from datetime import datetime, timedelta

# Parametri
EXCHANGE = "binance"
SYMBOL = "SOL/USDT"
TIMEFRAME = "1h"
SINCE = "2021-01-01 00:00:00"  # data di partenza
LIMIT = 1000  # max per richiesta

# Cartella di output
OUTPUT_DIR = "historical_data/raw_csv/SOL"
os.makedirs(OUTPUT_DIR, exist_ok=True)

def fetch_ohlcv():
    exchange = getattr(ccxt, EXCHANGE)({"enableRateLimit": True})
    since_ts = exchange.parse8601(SINCE.replace(" ", "T"))
    all_data = []

    while True:
        ohlcv = exchange.fetch_ohlcv(SYMBOL, TIMEFRAME, since_ts, LIMIT)
        if not ohlcv:
            break
        all_data += ohlcv
        print(f"📥 Scaricate {len(ohlcv)} candele, totale: {len(all_data)}")

        # Avanza di un passo
        since_ts = ohlcv[-1][0] + 1
        if datetime.fromtimestamp(since_ts/1000) > datetime.utcnow():
            break

    # Converto in DataFrame
    df = pd.DataFrame(all_data, columns=["timestamp","open","high","low","close","volume"])
    df["datetime"] = pd.to_datetime(df["timestamp"], unit="ms")

    # Salvo CSV
    out_file = os.path.join(OUTPUT_DIR, f"SOLUSDT_{TIMEFRAME}.csv")
    df.to_csv(out_file, index=False)
    print(f"✅ Salvato {out_file} ({len(df)} righe)")

if __name__ == "__main__":
    fetch_ohlcv()
