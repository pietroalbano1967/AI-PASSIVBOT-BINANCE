from fastapi import APIRouter, WebSocket, Query
from starlette.websockets import WebSocketDisconnect
from binance import AsyncClient, BinanceSocketManager
import numpy as np, time, pandas as pd
from .ai_utils import compute_features, models, FEATURE_COLUMNS
import json, pathlib

router = APIRouter()

orders = []  # storico ordini simulati
order_id = 0
ORDERS_FILE = pathlib.Path("orders.json")
CANDLES_FILE = pathlib.Path("candles.json")
last_save_time = 0  # ⏱ controllo frequenza salvataggio


# ------------------ Utils ------------------

def compute_macd(prices, fast=12, slow=26, signal=9):
    """Calcolo MACD con Pandas (senza TA-Lib)"""
    df = pd.DataFrame(prices, columns=["close"])
    df["ema_fast"] = df["close"].ewm(span=fast, adjust=False).mean()
    df["ema_slow"] = df["close"].ewm(span=slow, adjust=False).mean()
    df["macd"] = df["ema_fast"] - df["ema_slow"]
    df["signal"] = df["macd"].ewm(span=signal, adjust=False).mean()
    df["hist"] = df["macd"] - df["signal"]
    return (
        float(df["macd"].iloc[-1]),
        float(df["signal"].iloc[-1]),
        float(df["hist"].iloc[-1]),
    )


# ------------------ Persistenza ------------------

def save_orders():
    try:
        with open(ORDERS_FILE, "w") as f:
            json.dump(orders[-500:], f)  # salva max 500 ordini
    except Exception as e:
        print(f"❌ Errore salvataggio ordini: {e}")


def load_orders():
    global orders
    if ORDERS_FILE.exists():
        try:
            with open(ORDERS_FILE) as f:
                orders = json.load(f)
            print(f"📂 Ordini caricati: {len(orders)}")
        except Exception as e:
            print(f"❌ Errore caricamento ordini: {e}")


def save_candles(symbol: str, candles: list):
    global last_save_time
    now = int(time.time())
    if now - last_save_time < 60:  # salva massimo una volta al minuto
        return
    try:
        with open(CANDLES_FILE, "w") as f:
            json.dump({symbol: candles[-300:]}, f)  # tieni solo ultime 300
        last_save_time = now
    except Exception as e:
        print(f"❌ Errore salvataggio candele: {e}")


def load_candles(symbol: str):
    if CANDLES_FILE.exists():
        try:
            with open(CANDLES_FILE) as f:
                data = json.load(f)
            return data.get(symbol, [])
        except Exception as e:
            print(f"❌ Errore caricamento candele: {e}")
    return []


# ------------------ WebSocket segnali AI ------------------

@router.websocket("/ws/signals")
async def ws_signals(websocket: WebSocket, symbol: str = Query("BTCUSDT")):
    global order_id

    await websocket.accept()
    client = await AsyncClient.create()
    bsm = BinanceSocketManager(client)
    ts = bsm.kline_socket(symbol.lower(), interval="1m")

    closes, highs, lows, volumes = [], [], [], []

    try:
        async with ts as stream:
            while True:
                msg = await stream.recv()
                k = msg["k"]

                closes.append(float(k["c"]))
                highs.append(float(k["h"]))
                lows.append(float(k["l"]))
                volumes.append(float(k["v"]))
                closes, highs, lows, volumes = closes[-300:], highs[-300:], lows[-300:], volumes[-300:]

                if len(closes) < 20:
                    continue

                df = pd.DataFrame({
                    "open": closes,
                    "close": closes,
                    "high": highs,
                    "low": lows,
                    "volume": volumes
                })

                # ✅ prepara solo ultime 300 candele lato server
                candles_data = [
                    {"t": int(time.time()), "o": float(o), "h": float(h),
                     "l": float(l), "c": float(c), "v": float(v)}
                    for o, h, l, c, v in zip(
                        closes[-300:], highs[-300:], lows[-300:], closes[-300:], volumes[-300:]
                    )
                ]
                save_candles(symbol.upper(), candles_data)

                df = compute_features(df)
                if df.empty:
                    continue

                for col in FEATURE_COLUMNS:
                    if col not in df.columns:
                        df[col] = 0

                X = df[FEATURE_COLUMNS].iloc[[-1]].fillna(0)

                model = models.get(symbol.upper())
                if not model:
                    continue

                try:
                    proba = model.predict_proba(X)[0]
                    pred = int(np.argmax(proba))

                    labels = ["Strong SELL", "Weak SELL", "HOLD", "Weak BUY", "Strong BUY"]
                    signal = labels[pred]
                    confidence = float(proba[pred])
                    price = float(closes[-1])
                    ts_now = int(time.time())

                    probs_dict = {labels[i]: round(float(p), 3) for i, p in enumerate(proba)}

                    # 💾 simulazione ordini con limite memoria
                    action = None
                    if ("BUY" in signal or "SELL" in signal) and confidence > 0.55:
                        order_id += 1
                        action = "BUY" if "BUY" in signal else "SELL"
                        order = {
                            "id": order_id,
                            "t": ts_now,
                            "symbol": symbol.upper(),
                            "price": price,
                            "signal": signal,
                            "confidence": round(confidence, 3),
                            "side": action
                        }
                        orders.append(order)
                        orders[:] = orders[-200:]  # ✅ max 200 ordini lato server
                        save_orders()
                        print(f"💾 Ordine simulato: {order}")

                    last_row = df.iloc[-1]

                    # 🔹 Calcolo MACD con Pandas
                    last_macd, last_signal, last_hist = compute_macd(df["close"].values)

                    # ✅ invia solo l’ultimo segnale
                    try:
                        await websocket.send_json({
                            "symbol": symbol.upper(),
                            "close": price,
                            "ma5": float(last_row["ma5"]),
                            "ma20": float(last_row["ma20"]),
                            "rsi": float(last_row["rsi"]),
                            "macd": {
                                "macd": last_macd,
                                "signal": last_signal,
                                "hist": last_hist
                            },
                            "signal": signal,
                            "confidence": round(confidence, 3),
                            "probs": probs_dict,
                            "action": action,
                            "t": ts_now
                        })
                    except Exception as e:
                        print(f"⚠️ WS chiuso, stop invio signals: {e}")
                        return

                except Exception as e:
                    print(f"❌ Errore predizione: {e}")
                    continue

    except WebSocketDisconnect:
        print(f"🔌 Client disconnesso da /ws/signals ({symbol.upper()})")
    finally:
        await client.close_connection()


# ------------------ Endpoint REST ordini ------------------

@router.get("/simulated_orders")
def get_orders():
    return {"orders": orders}


# carica ordini salvati al riavvio
load_orders()
