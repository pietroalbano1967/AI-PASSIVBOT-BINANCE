import os
import subprocess

# Dataset da scaricare (Kaggle URL -> cartella di destinazione)
DATASETS = {
    "imranbukhari/comprehensive-ethusd-1h-data": "historical_data/raw_csv/ETH",
    "imranbukhari/comprehensive-bnbusd-1h-data": "historical_data/raw_csv/BNB",
    "imranbukhari/comprehensive-solusd-1h-data": "historical_data/raw_csv/SOL",
}

def download_dataset(dataset, path):
    os.makedirs(path, exist_ok=True)
    print(f"📥 Scarico {dataset} in {path} ...")
    try:
        subprocess.run(
            ["kaggle", "datasets", "download", "-d", dataset, "-p", path, "--unzip"],
            check=True
        )
        print(f"✅ {dataset} scaricato e scompattato in {path}")
    except subprocess.CalledProcessError as e:
        print(f"❌ Errore con {dataset}: {e}")

def main():
    for dataset, path in DATASETS.items():
        download_dataset(dataset, path)

if __name__ == "__main__":
    main()
