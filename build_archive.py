import os
import pandas as pd
import numpy as np
import json
from datetime import datetime

RAW_DIR = "historical_data/raw_csv"
CONVERTED_DIR = "historical_data/converted"
META_DIR = "historical_data/meta"
LOG_FILE = os.path.join(META_DIR, "conversion_logs.txt")
META_FILE = os.path.join(META_DIR, "dataset_sources.json")

# Mappatura delle colonne possibili
COLUMN_MAP = {
    "timestamp": ["timestamp", "date", "time", "Open time"],
    "open": ["open", "Open"],
    "high": ["high", "High"],
    "low": ["low", "Low"],
    "close": ["close", "Close"],
    "volume": ["volume", "Volume", "Volume USD", "Base asset volume"],
}

def find_column(df, names):
    for n in names:
        if n in df.columns:
            return n
    raise KeyError(f"Nessuna colonna trovata tra {names}")

def convert_csv_to_npy(csv_path, npy_path):
    df = pd.read_csv(csv_path, encoding="utf-8")

    ts_col = find_column(df, COLUMN_MAP["timestamp"])
    o_col = find_column(df, COLUMN_MAP["open"])
    h_col = find_column(df, COLUMN_MAP["high"])
    l_col = find_column(df, COLUMN_MAP["low"])
    c_col = find_column(df, COLUMN_MAP["close"])
    v_col = find_column(df, COLUMN_MAP["volume"])

    if df[ts_col].dtype == object:
        df[ts_col] = pd.to_datetime(df[ts_col], errors="coerce")
        df[ts_col] = df[ts_col].astype("int64") // 10**9

    arr = df[[ts_col, o_col, h_col, l_col, c_col, v_col]].to_numpy(dtype=np.float64)

    os.makedirs(os.path.dirname(npy_path), exist_ok=True)
    np.save(npy_path, arr)

    return arr.shape[0]

def update_meta(meta_file, coin, source):
    if os.path.exists(meta_file):
        with open(meta_file, "r") as f:
            meta = json.load(f)
    else:
        meta = {}

    if coin not in meta:
        meta[coin] = {}

    meta[coin][os.pat]()
