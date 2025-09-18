from fastapi import APIRouter, Query
from .models.candle import CandleResponse
from binance import Client
import os
import time

router = APIRouter()

BINANCE_API_KEY = os.getenv("BINANCE_API_KEY")
BINANCE_API_SECRET = os.getenv("BINANCE_API_SECRET")
client = Client(BINANCE_API_KEY, BINANCE_API_SECRET)

@router.get("/candles", response_model=list[CandleResponse])
def get_candles(symbol: str = Query("BTCUSDT"), interval: str = Query("1m"), limit: int = Query(100)):
    data = client.get_klines(symbol=symbol, interval=interval, limit=limit)
    candles = []
    for c in data:
        candles.append(CandleResponse(
            t=int(c[0] // 1000),
            symbol=symbol,
            o=float(c[1]),
            h=float(c[2]),
            l=float(c[3]),
            c=float(c[4]),
            v=float(c[5]),
        ))
    return candles
