import os
import numpy as np

def check_data(exchange, symbol="BTC"):
    folder = f"historical_data/ohlcvs_{exchange}/{symbol}"
    if not os.path.exists(folder):
        print(f"❌ Nessun dato trovato per {exchange}")
        return
    
    files = [f for f in os.listdir(folder) if f.endswith(".npy")]
    if not files:
        print(f"❌ Nessun file .npy trovato in {folder}")
        return

    files.sort()
    first_file = np.load(os.path.join(folder, files[0]))
    last_file = np.load(os.path.join(folder, files[-1]))

    first_ts = int(first_file[0][0] / 1000)  # timestamp in secondi
    last_ts = int(last_file[-1][0] / 1000)

    from datetime import datetime
    start_date = datetime.utcfromtimestamp(first_ts).strftime("%Y-%m-%d %H:%M")
    end_date = datetime.utcfromtimestamp(last_ts).strftime("%Y-%m-%d %H:%M")

    print(f"✅ {exchange.upper()} ({symbol}) -> {start_date} → {end_date}")
    print(f"   Totale file: {len(files)}")

# Controlla Binance e Bybit
check_data("binanceusdm", "BTC")
check_data("bybit", "BTC")
