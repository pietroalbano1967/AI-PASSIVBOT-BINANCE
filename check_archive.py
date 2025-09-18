import os
import numpy as np

BASE_DIR = "historical_data/converted"

def scan_dir(path, prefix=""):
    for root, _, files in os.walk(path):
        rel = os.path.relpath(root, BASE_DIR)
        npy_files = [f for f in files if f.endswith(".npy")]
        if npy_files:
            print(f"{prefix}{rel}: {len(npy_files)} file")
            for f in npy_files[:5]:
                file_path = os.path.join(root, f)
                try:
                    arr = np.load(file_path, allow_pickle=False, mmap_mode="r")
                    print(f"   {f}: {arr.shape[0]} rows")
                except Exception as e:
                    print(f"   {f}: errore {e}")

def main():
    if not os.path.exists(BASE_DIR):
        print("⚠️ Nessuna cartella converted trovata")
        return
    scan_dir(BASE_DIR)

if __name__ == "__main__":
    main()
