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


@router.websocket("/ws/candles1s")
async def ws_candles_1s(websocket: WebSocket, symbol: str = Query("btcusdt")):
    """
    WebSocket che invia candele da 1 secondo costruite dai trade.
    """
    print("📡 Connessione WS aperta per", symbol.upper())
    await websocket.accept()

    client = await AsyncClient.create()
    bsm = BinanceSocketManager(client)
    ts = bsm.trade_socket(symbol.lower())

    candles, current_bucket = [], None

    try:
        async with ts as stream:
            while True:
                msg = await stream.recv()
                if "p" not in msg or "q" not in msg:
                    continue

                price = float(msg["p"])
                qty = float(msg["q"])
                now = int(time.time())  # bucket 1s

                if current_bucket != now:
                    current_bucket = now
                    candles.append({
                        "t": now,
                        "s": symbol.upper(),
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
                save_candles(symbol.upper(), candles)

                try:
                    # ✅ Invia sempre l’ultima candela pronta
                    await websocket.send_json(candles[-1])
                    print("📡 Candela inviata:", candles[-1])
                except Exception as e:
                    print(f"⚠️ WS chiuso: {e}")
                    break

    except WebSocketDisconnect:
        print(f"🔌 Client disconnesso da /ws/candles1s ({symbol.upper()})")
    except Exception as e:
        print(f"⚠️ Errore WS candles {symbol.upper()}: {e}")
    finally:
        await client.close_connection()


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
