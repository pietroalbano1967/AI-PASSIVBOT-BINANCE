from fastapi import WebSocket, Query
from binance import AsyncClient, BinanceSocketManager
from starlette.websockets import WebSocketDisconnect
import time
from fastapi import APIRouter
import json, pathlib, asyncio

router = APIRouter()
CANDLES_FILE = pathlib.Path("candles.json")

last_save_time = 0  # ⏱ controllo salvataggi

def save_candles(symbol: str, candles: list):
    global last_save_time
    now = int(time.time())
    if now - last_save_time < 60:  # salva massimo una volta al minuto
        return
    try:
        with open(CANDLES_FILE, "w") as f:
            json.dump({symbol: candles[-200:]}, f)  # tieni solo ultime 200
        last_save_time = now
    except Exception as e:
        print(f"❌ Errore salvataggio candele: {e}")

def register_ws_candles(app):
    @app.websocket("/ws/candles1s")
    async def ws_candles_1s(websocket: WebSocket, symbol: str = Query("btcusdt")):
        await websocket.accept()
        while True:  # loop di riconnessione
            try:
                client = await AsyncClient.create()
                bsm = BinanceSocketManager(client)
                ts = bsm.trade_socket(symbol.lower())
                candles, current_bucket = [], None

                async with ts as stream:
                    while True:
                        msg = await stream.recv()
                        if "p" not in msg or "q" not in msg:
                            continue  # ignora messaggi non standard

                        price = float(msg["p"])
                        qty = float(msg["q"])
                        now = int(time.time())
                        bucket = now

                        if current_bucket != bucket:
                            current_bucket = bucket
                            candles.append({
                                "t": bucket, "s": symbol.upper(),
                                "o": price, "h": price,
                                "l": price, "c": price, "v": qty
                            })
                        else:
                            c = candles[-1]
                            c["h"] = max(c["h"], price)
                            c["l"] = min(c["l"], price)
                            c["c"] = price
                            c["v"] += qty

                        candles = candles[-200:]

                        try:
                            await websocket.send_json(candles[-1])
                        except Exception as e:
                            print(f"⚠️ WS chiuso, stop invio candles: {e}")
                            return


                        save_candles(symbol.upper(), candles)


            except WebSocketDisconnect:
                # chiusura normale lato client → esco
                break
            except Exception as e:
                print(f"⚠️ Errore WS candles {symbol.upper()}: {e}, retry fra 5s")
                await asyncio.sleep(5)
            finally:
                await client.close_connection()

    @router.get("/saved_candles/{symbol}")
    async def get_saved_candles(symbol: str):
        if CANDLES_FILE.exists():
            with open(CANDLES_FILE) as f:
                data = json.load(f)
            return data.get(symbol.upper(), [])
        return []
