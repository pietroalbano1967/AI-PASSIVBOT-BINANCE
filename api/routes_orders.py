from fastapi import APIRouter
import os, json

router = APIRouter()

ORDERS_FILE = os.path.join(os.path.dirname(__file__), "orders.json")

# lista ordini in memoria
orders = []

@router.get("/simulated_orders")
def get_orders():
    return {"orders": orders}

@router.post("/save_orders")
def save_orders():
    """Salva gli ordini in JSON e svuota la lista"""
    with open(ORDERS_FILE, "w") as f:
        json.dump(orders, f, indent=2)
    count = len(orders)
    orders.clear()
    return {"status": "ok", "saved": count, "file": ORDERS_FILE}
