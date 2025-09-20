from fastapi import APIRouter, WebSocket
from binance import AsyncClient, BinanceSocketManager
import asyncio

router = APIRouter()
active_connections = {}

async def handle_candle_1s_connection(websocket: WebSocket, symbol: str):
    await websocket.accept()
    connection_id = id(websocket)
    active_connections[connection_id] = websocket
    
    print(f"✅ WebSocket connesso per {symbol}")
    
    client = None
    try:
        client = await AsyncClient.create()
        bsm = BinanceSocketManager(client)
        
        # Usa kline_socket per dati consistenti
        async with bsm.kline_socket(symbol=symbol.lower(), interval="1s") as stream:
            while True:
                data = await stream.recv()
                
                if data and "k" in data:
                    kline = data["k"]
                    candle = {
                        "t": kline["t"],        # timestamp in ms
                        "s": kline["s"],        # symbol
                        "o": float(kline["o"]), # open
                        "h": float(kline["h"]), # high
                        "l": float(kline["l"]), # low
                        "c": float(kline["c"]), # close
                        "v": float(kline["v"]), # volume
                        "x": kline["x"]         # is closed
                    }
                    
                    try:
                        await websocket.send_json(candle)
                    except:
                        break
                        
    except Exception as e:
        print(f"❌ Errore: {e}")
    finally:
        if connection_id in active_connections:
            del active_connections[connection_id]
        if client:
            await client.close_connection()
        print(f"🔚 Connessione chiusa per {symbol}")

# ✅ ROTTA CORRETTA: /ws/candles1s con parametro query
@router.websocket("/ws/candles1s")
async def websocket_candles_1s(websocket: WebSocket):
    # Estrai il simbolo dai query parameters
    symbol = websocket.query_params.get("symbol", "btcusdt")
    
    await handle_candle_1s_connection(websocket, symbol)