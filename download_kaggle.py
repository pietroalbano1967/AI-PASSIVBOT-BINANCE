import os
import kaggle

# 🔑 Configurazione API Kaggle (la tua chiave personale)
KAGGLE_USERNAME = "piealba1"
KAGGLE_KEY = "6434ce2da12560999c26ee0bf0be7f98"

# 📌 Scriviamo il file kaggle.json nella cartella .kaggle del progetto
kaggle_dir = os.path.join(os.getcwd(), ".kaggle")
os.makedirs(kaggle_dir, exist_ok=True)

kaggle_json_path = os.path.join(kaggle_dir, "kaggle.json")
with open(kaggle_json_path, "w") as f:
    f.write(f'{{"username":"{KAGGLE_USERNAME}","key":"{KAGGLE_KEY}"}}')

# Diciamo alla libreria Kaggle dove trovare la config
os.environ["KAGGLE_CONFIG_DIR"] = kaggle_dir

# 📂 Cartella di destinazione dei dati
save_dir = os.path.join("historical_data")
os.makedirs(save_dir, exist_ok=True)

# 📊 Dataset Kaggle (puoi cambiarlo con BTC, BNB, SOL ecc.)
dataset = "imranbukhari/comprehensive-btcusd-1h-data"

print(f"📥 Scarico dataset {dataset} in {save_dir} ...")
kaggle.api.dataset_download_files(dataset, path=save_dir, unzip=True)
print("✅ Download completato.")
