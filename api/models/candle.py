from pydantic import BaseModel

class CandleResponse(BaseModel):
    t: int       # timestamp
    symbol: str
    o: float
    h: float
    l: float
    c: float
    v: float
