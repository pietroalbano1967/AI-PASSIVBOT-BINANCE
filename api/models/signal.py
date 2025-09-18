from pydantic import BaseModel
from typing import Dict

class SignalResponse(BaseModel):
    symbol: str
    close: float
    signal: str
    confidence: float
    probs: Dict[str, float]
    t: int
