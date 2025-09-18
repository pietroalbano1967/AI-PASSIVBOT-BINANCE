import os
import requests

# Cartella di destinazione nel tuo progetto
SAVE_DIR = "passivbot-master/historical_data"
os.makedirs(SAVE_DIR, exist_ok=True)

# Lista file Binance da scaricare (aggiungi altri mesi se vuoi)
files = [
    "BTCUSDT-1h-2024-06.zip",
    "BTCUSDT-1h-2024-05.zip"
]

BASE_URL = "https://data.binance.vision/data/futures/um/monthly/klines/BTCUSDT/1h/"

for f in files:
    url = BASE_URL + f
    save_path = os.path.join(SAVE_DIR, f)
    print(f"📥 Scarico {url} ...")

    r = requests.get(url, stream=True)
    if r.status_code == 200:
        with open(save_path, "wb") as file:
            for chunk in r.iter_content(chunk_size=8192):
                if chunk:
                    file.write(chunk)
        print(f"✅ Salvato in {save_path}")
    else:
        print(f"❌ Errore {r.status_code} per {url}")
