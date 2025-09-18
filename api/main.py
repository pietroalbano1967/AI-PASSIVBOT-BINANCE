from fastapi import FastAPI
from .ws_candles import router as candles_router
from .ws_tickers import register_ws_tickers
from .ws_signals import router as signals_router
from .routes_orders import router as orders_router
from .routes_tickers import router as tickers_router
from .routes_predict import router as predict_router
from .routes_status import router as status_router
from .routes_candles import router as candles_rest_router

app = FastAPI()

# WebSocket router
app.include_router(candles_router)
app.include_router(signals_router)

# REST router
app.include_router(orders_router)
app.include_router(tickers_router)
app.include_router(predict_router)
app.include_router(status_router)
app.include_router(candles_rest_router)

# Funzioni che non usano router
register_ws_tickers(app)
