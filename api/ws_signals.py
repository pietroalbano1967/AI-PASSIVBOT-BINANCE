from fastapi import APIRouter, WebSocket, Query
from starlette.websockets import WebSocketDisconnect
from binance import AsyncClient, BinanceSocketManager, Client
import numpy as np, time, pandas as pd
from .ai_utils import compute_features, models, FEATURE_COLUMNS
import json, pathlib
import asyncio
import math

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

    symbol_upper = symbol.upper()
    print(f"🔗 Richiesta WebSocket signals per: {symbol_upper}")

    # ✅ VERIFICA E GESTISCI MODELLO MANCANTE
    model = models.get(symbol_upper)
    if not model:
        print(f"⚠️  Modello non trovato per {symbol_upper}, uso BTCUSDT come fallback")
        model = models.get("BTCUSDT")
    
    if not model:
        error_msg = f"❌ Nessun modello disponibile per {symbol_upper}"
        print(error_msg)
        await websocket.close(code=1003, reason=error_msg)
        return

    await websocket.accept()
    print(f"✅ WebSocket signals APERTO per {symbol_upper}")

    client = await AsyncClient.create()
    bsm = BinanceSocketManager(client)

    # ✅ Bootstrap iniziale con 50 candele storiche
    closes, highs, lows, volumes = [], [], [], []
    try:
        rest_client = Client()
        data = rest_client.get_klines(symbol=symbol_upper, interval="1m", limit=50)
        closes = [float(c[4]) for c in data]
        highs = [float(c[2]) for c in data]
        lows = [float(c[3]) for c in data]
        volumes = [float(c[5]) for c in data]
        print(f"📂 Bootstrap: {len(closes)} candele storiche caricate per {symbol_upper}")
    except Exception as e:
        print(f"⚠️ Errore bootstrap storico per {symbol_upper}: {e}")

    try:
        # Usa interval più lungo per performance
        ts = bsm.kline_socket(symbol.lower(), interval="1m")
        last_heartbeat = time.time()

        async with ts as stream:
            while True:
                try:
                    # ✅ TIMEOUT E HEARTBEAT
                    msg = await asyncio.wait_for(stream.recv(), timeout=30.0)

                    # Invia heartbeat ogni 15 secondi
                    current_time = time.time()
                    if current_time - last_heartbeat > 15:
                        try:
                            await websocket.send_json({
                                "heartbeat": True,
                                "t": int(current_time),
                                "symbol": symbol_upper
                            })
                            last_heartbeat = current_time
                            print(f"💓 Heartbeat inviato per {symbol_upper}")
                        except:
                            break

                    k = msg["k"]
                    print(f"📡 Dati ricevuti per {symbol_upper}: {k['c']} (chiuso: {k['x']})")

                    closes.append(float(k["c"]))
                    highs.append(float(k["h"]))
                    lows.append(float(k["l"]))
                    volumes.append(float(k["v"]))

                    # Mantieni solo ultimi 100 punti
                    closes, highs, lows, volumes = closes[-100:], highs[-100:], lows[-100:], volumes[-100:]

                    if len(closes) < 20:
                        print(f"⏳ Accumulando dati: {len(closes)}/20")
                        continue

                    # ✅ PREPARAZIONE DATI
                    df = pd.DataFrame({
                        "open": closes, "close": closes, "high": highs,
                        "low": lows, "volume": volumes
                    })

                    # ✅ CALCOLO FEATURES
                    try:
                        df = compute_features(df)
                        if df.empty:
                            print("⚠️  DataFrame vuoto dopo compute_features")
                            continue

                        for col in FEATURE_COLUMNS:
                            if col not in df.columns:
                                df[col] = 0.0
                                print(f"⚠️  Colonna {col} mancante, impostata a 0")

                        X = df[FEATURE_COLUMNS].iloc[[-1]].fillna(0)

                        # ✅ PREDIZIONE
                        try:
                            proba = model.predict_proba(X)[0]
                            pred = int(np.argmax(proba))

                            labels = ["Strong SELL", "Weak SELL", "HOLD", "Weak BUY", "Strong BUY"]
                            signal = labels[pred]
                            confidence = float(proba[pred])
                            price = float(closes[-1])
                            ts_now = int(time.time())

                            probs_dict = {labels[i]: round(float(p), 3) for i, p in enumerate(proba)}

                            # ✅ SIMULAZIONE ORDINI
                            action = None
                            if ("BUY" in signal or "SELL" in signal) and confidence > 0.55:
                                order_id += 1
                                action = "BUY" if "BUY" in signal else "SELL"
                                order = {
                                    "id": order_id,
                                    "t": ts_now,
                                    "symbol": symbol_upper,
                                    "price": price,
                                    "signal": signal,
                                    "confidence": round(confidence, 3),
                                    "side": action
                                }
                                orders.append(order)
                                orders[:] = orders[-200:]
                                save_orders()
                                print(f"💾 Ordine simulato: {order}")

                            last_row = df.iloc[-1]

                            # ✅ CALCOLO MACD
                            last_macd, last_signal, last_hist = compute_macd(df["close"].values)

                            # ✅ FIX RSI
                            rsi_val = last_row.get("rsi", 50)
                            if rsi_val is None or math.isnan(rsi_val):
                                rsi_val = 50.0
                            
                            # ✅ Calcolo MACD (manuale, sempre stesso formato)
                            last_macd, last_signal, last_hist = compute_macd(df["close"].values)
                            # ✅ INVIO DATI
                            try:
                                payload = {
                                    "symbol": symbol_upper,
                                    "close": price,
                                    "ma5": float(last_row.get("ma5", 0)),
                                    "ma20": float(last_row.get("ma20", 0)),
                                    "rsi": float(rsi_val),
                                    "macd": {   # 👈 sempre oggetto con 3 valori
                                    "macd": last_macd,
                                    "signal": last_signal,
                                    "hist": last_hist
                                },
                                    "signal": signal,
                                    "confidence": round(confidence, 3),
                                    "probs": probs_dict,
                                    "action": action,
                                    "t": ts_now
                                }
                                await websocket.send_json(payload)
                                print(f"📤 Inviati dati a client: {payload['signal']} ({confidence})")

                            except WebSocketDisconnect:
                                print(f"🔌 Client disconnesso durante l'invio")
                                break
                            except Exception as e:
                                print(f"⚠️  Errore invio WebSocket: {e}")
                                continue

                        except Exception as e:
                            print(f"❌ Errore predizione: {e}")
                            continue

                    except Exception as e:
                        print(f"❌ Errore elaborazione features: {e}")
                        continue

                except asyncio.TimeoutError:
                    print(f"⏰ Timeout ricezione dati per {symbol_upper}, invio heartbeat")
                    try:
                        await websocket.send_json({
                            "heartbeat": True,
                            "t": int(time.time()),
                            "symbol": symbol_upper
                        })
                        last_heartbeat = time.time()
                    except:
                        print(f"❌ Errore invio heartbeat, probabilmente client disconnesso")
                        break
                except Exception as e:
                    print(f"❌ Errore ricezione dati: {e}")
                    break

    except WebSocketDisconnect:
        print(f"🔌 Client disconnesso da /ws/signals ({symbol_upper})")
    except Exception as e:
        print(f"❌ Errore generale WebSocket: {e}")
    finally:
        try:
            await client.close_connection()
            print(f"🔚 Connessione chiusa per {symbol_upper}")
        except:
            pass


# ------------------ Endpoint REST ordini ------------------

@router.get("/simulated_orders")
def get_orders():
    return {"orders": orders}


# carica ordini salvati al riavvio
load_orders()
