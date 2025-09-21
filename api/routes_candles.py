from fastapi import APIRouter, Query
from binance import Client
import os

router = APIRouter()

BINANCE_API_KEY = os.getenv("BINANCE_API_KEY", "")
BINANCE_API_SECRET = os.getenv("BINANCE_API_SECRET", "")
client = Client(BINANCE_API_KEY, BINANCE_API_SECRET)

@router.get("/candles")
def get_candles(
    symbol: str = Query("BTCUSDT"),
    interval: str = Query("1m"),
    limit: int = Query(100)
):
    try:
        data = client.get_klines(symbol=symbol, interval=interval, limit=limit)
        candles = []
        for c in data:
            candles.append({
                "t": c[0],  # timestamp in ms
                "o": float(c[1]),
                "h": float(c[2]),
                "l": float(c[3]),
                "c": float(c[4]),
                "v": float(c[5]),
            })
        return candles
    except Exception as e:
        print(f"❌ Errore fetching candles: {e}")
        return []