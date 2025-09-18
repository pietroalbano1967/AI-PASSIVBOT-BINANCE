from fastapi import WebSocket
from binance import AsyncClient, BinanceSocketManager
from starlette.websockets import WebSocketDisconnect
import asyncio

def register_ws_tickers(app):
    @app.websocket("/ws/tickers")
    async def ws_tickers(websocket: WebSocket):
        await websocket.accept()
        streams = [
            "btcusdt@miniTicker","ethusdt@miniTicker","bnbusdt@miniTicker",
            "solusdt@miniTicker","xrpusdt@miniTicker","adausdt@miniTicker",
            "dogeusdt@miniTicker","avaxusdt@miniTicker","maticusdt@miniTicker",
            "ltcusdt@miniTicker"
        ]

        while True:  # loop di riconnessione
            try:
                client = await AsyncClient.create()
                bsm = BinanceSocketManager(client)
                ts = bsm.multiplex_socket(streams)

                async with ts as stream:
                    while True:
                        msg = await stream.recv()
                        data = msg.get("data")
                        if data:
                            await websocket.send_json(data)

            except WebSocketDisconnect:
                # client ha chiuso la connessione → esco
                break
            except Exception as e:
                print(f"⚠️ Errore WS tickers: {e}, retry fra 5s")
                await asyncio.sleep(5)
            finally:
                await client.close_connection()
