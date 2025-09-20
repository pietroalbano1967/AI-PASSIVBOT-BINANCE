# ws_tickers.py - Versione corretta
from fastapi import WebSocket
from binance import AsyncClient, BinanceSocketManager
from starlette.websockets import WebSocketDisconnect
import asyncio

active_ticker_connections = {}

def register_ws_tickers(app):
    @app.websocket("/ws/tickers")
    async def ws_tickers(websocket: WebSocket):
        await websocket.accept()
        client = None
        connection_id = id(websocket)
        active_ticker_connections[connection_id] = websocket
        
        try:
            client = await AsyncClient.create()
            bsm = BinanceSocketManager(client)
            
            # Streams per i simboli più popolari
            streams = [
                "btcusdt@miniTicker", "ethusdt@miniTicker", "bnbusdt@miniTicker",
                "solusdt@miniTicker", "xrpusdt@miniTicker", "adausdt@miniTicker",
                "dogeusdt@miniTicker", "dotusdt@miniTicker", "avaxusdt@miniTicker",
                "linkusdt@miniTicker"
            ]
            
            ts = bsm.multiplex_socket(streams)

            async with ts as stream:
                while True:
                    msg = await stream.recv()
                    data = msg.get("data", {})
                    
                    # Formatta i dati in modo compatibile con il frontend
                    if data:
                        ticker = {
                            "s": data.get("s", ""),  # symbol
                            "c": float(data.get("c", 0)),  # current price
                            "o": float(data.get("o", data.get("c", 0))),  # open price
                            "h": float(data.get("h", 0)),  # high price
                            "l": float(data.get("l", 0)),  # low price
                            "v": float(data.get("v", 0))   # volume
                        }
                        
                        # Invia solo se la connessione è ancora attiva
                        if connection_id in active_ticker_connections:
                            try:
                                await websocket.send_json(ticker)
                            except:
                                break

        except WebSocketDisconnect:
            print("🔌 Client disconnesso da /ws/tickers")
        except Exception as e:
            print(f"⚠️ Errore WS tickers: {e}")
        finally:
            if connection_id in active_ticker_connections:
                del active_ticker_connections[connection_id]
            if client:
                await client.close_connection()