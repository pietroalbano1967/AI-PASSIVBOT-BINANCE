from fastapi import WebSocket, Query
from binance import AsyncClient, BinanceSocketManager
from starlette.websockets import WebSocketDisconnect
import numpy as np, time, pandas as pd
from .ai_utils import compute_features, models, FEATURE_COLUMNS
import json, pathlib

orders = []  # storico ordini simulati
order_id = 0
ORDERS_FILE = pathlib.Path("orders.json")
CANDLES_FILE = pathlib.Path("candles.json")

last_save_time = 0  # ⏱ controllo frequenza salvataggio

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
            
def register_ws_signals(app):
    @app.websocket("/ws/signals")
    async def ws_signals(websocket: WebSocket, symbol: str = Query("BTCUSDT")):
        global order_id   # ✅ dichiarato qui

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

                    # ✅ invia dati solo quando abbiamo almeno 20 candele
                    if len(closes) < 20:
                        continue

                    df = pd.DataFrame({
                        "open": closes,
                        "close": closes,
                        "high": highs,
                        "low": lows,
                        "volume": volumes
                    })

                    # prepara candele raw (ultime 300)
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
                        # 🔮 predizione AI
                        proba = model.predict_proba(X)[0]
                        pred = int(np.argmax(proba))

                        labels = ["Strong SELL", "Weak SELL", "HOLD", "Weak BUY", "Strong BUY"]
                        signal = labels[pred]
                        confidence = float(proba[pred])
                        price = float(closes[-1])
                        ts_now = int(time.time())

                        probs_dict = {labels[i]: round(float(p), 3) for i, p in enumerate(proba)}

                        # 💾 simulazione ordini
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
                            save_orders()
                            print(f"💾 Ordine simulato: {order}")

                        last_row = df.iloc[-1]

                        # ✅ invio solo se abbiamo tutto definito
                        try:
                            await websocket.send_json({
                                "symbol": symbol.upper(),
                                "close": price,
                                "ma5": float(last_row["ma5"]),
                                "ma20": float(last_row["ma20"]),
                                "rsi": float(last_row["rsi"]),
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

    # carica ordini salvati al riavvio
    load_orders()

    @app.get("/simulated_orders")
    def get_orders():
        return {"orders": orders}
