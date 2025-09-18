from pydantic import BaseModel

class TickerResponse(BaseModel):
    symbol: str
    price: float
    volume: float
    high: float
    low: float
