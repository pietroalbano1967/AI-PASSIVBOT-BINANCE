from fastapi import APIRouter, WebSocket, Query
from starlette.websockets import WebSocketDisconnect
from binance import AsyncClient, BinanceSocketManager
import time, asyncio, json, pathlib

router = APIRouter()
CANDLES_FILE = pathlib.Path("candles.json")
last_save_time = 0  # ⏱ controllo salvataggi

def save_candles(symbol: str, candles: list):
    """
    Salva le ultime 200 candele in un file JSON, massimo 1 volta al minuto.
    """
    global last_save_time
    now = int(time.time())
    if now - last_save_time < 60:  # salva massimo una volta al minuto
        return
    try:
        with open(CANDLES_FILE, "w") as f:
            json.dump({symbol: candles[-200:]}, f)
        last_save_time = now
    except Exception as e:
        print(f"❌ Errore salvataggio candele: {e}")


# ws_candles.py
@router.websocket("/ws/candles1s")
async def ws_candles_1s(websocket: WebSocket, symbol: str = Query("btcusdt")):
    """
    WebSocket che invia candele da 1 secondo costruite dai trade.
    """
    print(f"📡 Connessione WS aperta per {symbol.upper()}")
    await websocket.accept()
    print(f"✅ WebSocket accettato per {symbol.upper()}")

    client = await AsyncClient.create()
    bsm = BinanceSocketManager(client)
    ts = bsm.trade_socket(symbol.lower())

    candles, current_bucket = [], None

    try:
        async with ts as stream:
            print(f"🚀 Inizio streaming per {symbol.upper()}")
            while True:
                msg = await stream.recv()
                
                if "p" not in msg or "q" not in msg:
                    continue

                price = float(msg["p"])
                qty = float(msg["q"])
                now = int(time.time())  # bucket 1s

                if current_bucket != now:
                    current_bucket = now
                    new_candle = {
                        "t": now,
                        "s": symbol.upper(),
                        "o": price, "h": price,
                        "l": price, "c": price, "v": qty
                    }
                    candles.append(new_candle)
                else:
                    c = candles[-1]
                    c["h"] = max(c["h"], price)
                    c["l"] = min(c["l"], price)
                    c["c"] = price
                    c["v"] += qty

                candles = candles[-100:]  # Mantieni solo le ultime 100 candele lato server

                try:
                    # ✅ Invia sempre l'ultima candela
                    await websocket.send_json(candles[-1])
                except Exception as e:
                    print(f"⚠️ Errore invio WS: {e}")
                    break

    except WebSocketDisconnect:
        print(f"🔌 Client disconnesso da /ws/candles1s ({symbol.upper()})")
    except Exception as e:
        print(f"⚠️ Errore WS candles {symbol.upper()}: {e}")
    finally:
        await client.close_connection()
        print(f"🔚 Connessione chiusa per {symbol.upper()}")


@router.get("/saved_candles/{symbol}")
async def get_saved_candles(symbol: str):
    """
    Endpoint REST per recuperare le ultime candele salvate.
    """
    if CANDLES_FILE.exists():
        with open(CANDLES_FILE) as f:
            data = json.load(f)
        return data.get(symbol.upper(), [])
    return []
# ws_candles.py
# ws_candles.py
@router.websocket("/ws/candles1s")
async def ws_candles_1s(websocket: WebSocket, symbol: str = Query("btcusdt")):
    """
    WebSocket che invia candele da 1 secondo costruite dai trade.
    """
    print(f"📡 Connessione WS aperta per {symbol.upper()}")
    await websocket.accept()
    print(f"✅ WebSocket accettato per {symbol.upper()}")

    client = await AsyncClient.create()
    bsm = BinanceSocketManager(client)
    ts = bsm.trade_socket(symbol.lower())

    current_candle = None
    last_send_time = 0
    send_interval = 0.5  # Invia ogni 0.5 secondi invece che ad ogni trade

    try:
        async with ts as stream:
            print(f"🚀 Inizio streaming per {symbol.upper()}")
            
            while True:
                msg = await stream.recv()
                current_time = time.time()
                
                if "p" not in msg or "q" not in msg:
                    continue

                price = float(msg["p"])
                qty = float(msg["q"])
                trade_time = msg.get("T", int(current_time * 1000))
                bucket_time = int(trade_time / 1000)  # Secondi

                # Se è un nuovo secondo, crea una nuova candela
                if current_candle is None or current_candle["t"] != bucket_time:
                    if current_candle and current_time - last_send_time >= send_interval:
                        # Invia la candela completata
                        try:
                            await websocket.send_json(current_candle)
                            last_send_time = current_time
                        except Exception as e:
                            print(f"⚠️ Errore invio candela: {e}")
                            break
                    
                    # Crea nuova candela
                    current_candle = {
                        "t": bucket_time,
                        "s": symbol.upper(),
                        "o": price,
                        "h": price,
                        "l": price,
                        "c": price,
                        "v": qty
                    }
                else:
                    # Aggiorna candela corrente
                    current_candle["h"] = max(current_candle["h"], price)
                    current_candle["l"] = min(current_candle["l"], price)
                    current_candle["c"] = price
                    current_candle["v"] += qty
                    
                    # Invia solo se è passato abbastanza tempo dall'ultimo invio
                    if current_time - last_send_time >= send_interval:
                        try:
                            await websocket.send_json(current_candle)
                            last_send_time = current_time
                        except Exception as e:
                            print(f"⚠️ Errore invio candela: {e}")
                            break

    except WebSocketDisconnect:
        print(f"🔌 Client disconnesso da /ws/candles1s ({symbol.upper()})")
    except Exception as e:
        print(f"⚠️ Errore WS candles {symbol.upper()}: {e}")
    finally:
        await client.close_connection()
        print(f"🔚 Connessione chiusa per {symbol.upper()}")