from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import pathlib
from .routes_predict import router as predict_router
from .ws_candles import router as saved_candles_router
from .routes_status import router as status_router
from .ws_tickers import register_ws_tickers
from .ws_candles import register_ws_candles
from .ws_signals import register_ws_signals
from .routes_predict import router as predict_router
from .routes_tickers import router as tickers_router
from .routes_candles import router as candles_router



app = FastAPI(title="Passivbot AI API")


app.include_router(tickers_router)
app.include_router(candles_router)
app.include_router(saved_candles_router)

# 🔓 Abilita CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200", "http://127.0.0.1:4200"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = pathlib.Path(__file__).resolve().parent.parent

# 📥 monta router REST
app.include_router(status_router)
app.include_router(predict_router)
# 📥 registra websocket
register_ws_tickers(app)
register_ws_candles(app)
register_ws_signals(app)
