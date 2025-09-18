# ws_tickers.py - SOSTITUISCI con questo codice
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
        
        # Aggiungi questa connessione alla lista attiva
        connection_id = id(websocket)
        active_ticker_connections[connection_id] = websocket
        
        try:
            client = await AsyncClient.create()
            bsm = BinanceSocketManager(client)
            
            streams = [
                "btcusdt@miniTicker", "ethusdt@miniTicker", "bnbusdt@miniTicker",
                "solusdt@miniTicker", "xrpusdt@miniTicker", "adausdt@miniTicker",
                "dogeusdt@miniTicker", "avaxusdt@miniTicker", "maticusdt@miniTicker",
                "ltcusdt@miniTicker"
            ]
            
            ts = bsm.multiplex_socket(streams)

            async with ts as stream:
                while True:
                    msg = await stream.recv()
                    data = msg.get("data")

                    # ✅ Filtra i ticker vuoti o incompleti
                    if data and data.get("s") and data.get("c"):
                        ticker = {
                            "s": data["s"],  # Usa 's' invece di 'symbol' per compatibilità
                            "c": float(data["c"]),  # Usa 'c' invece di 'price'
                            "v": float(data["v"]),  # Usa 'v' invece di 'volume'
                            "h": float(data["h"]),  # Usa 'h' invece di 'high'
                            "l": float(data["l"]),  # Usa 'l' invece di 'low'
                            "o": float(data.get("o", data["c"]))  # Aggiungi open
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
            # Rimuovi la connessione dalla lista attiva
            if connection_id in active_ticker_connections:
                del active_ticker_connections[connection_id]
            if client:
                await client.close_connection()