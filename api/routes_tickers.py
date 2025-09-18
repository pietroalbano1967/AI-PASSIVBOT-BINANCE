from fastapi import APIRouter, Query
from .models.ticker import TickerResponse
from binance import Client
import os

router = APIRouter()

# usa API key Binance se le hai, altrimenti funziona anche senza
BINANCE_API_KEY = os.getenv("BINANCE_API_KEY")
BINANCE_API_SECRET = os.getenv("BINANCE_API_SECRET")
client = Client(BINANCE_API_KEY, BINANCE_API_SECRET)

@router.get("/tickers", response_model=TickerResponse)
def get_ticker(symbol: str = Query("BTCUSDT")):
    data = client.get_ticker(symbol=symbol)
    return TickerResponse(
        symbol=data["symbol"],
        price=float(data["lastPrice"]),
        volume=float(data["volume"]),
        high=float(data["highPrice"]),
        low=float(data["lowPrice"]),
    )
