from fastapi import APIRouter
import subprocess
import pathlib
from .ai_utils import reload_models   # ✅ importa la funzione che ricarica i modelli

BASE_DIR = pathlib.Path(__file__).resolve().parent.parent

router = APIRouter()

@router.get("/status")
def status():
    return {"status": "running", "base_dir": str(BASE_DIR)}

@router.post("/backtest")
def run_backtest(config: str):
    cmd = ["python", str(BASE_DIR / "src/backtest.py"), f"configs/examples/{config}"]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    return {"command": " ".join(cmd), "stdout": proc.stdout, "stderr": proc.stderr}

@router.post("/optimize")
def run_optimize(config: str):
    cmd = ["python", str(BASE_DIR / "src/optimize.py"), f"configs/examples/{config}"]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    return {"command": " ".join(cmd), "stdout": proc.stdout, "stderr": proc.stderr}

@router.get("/results")
def list_results():
    results_path = BASE_DIR / "optimize_results"
    return {"results": [p.name for p in results_path.iterdir() if p.is_dir()]}

# ✅ nuovo endpoint
@router.post("/reload_model")
def reload_model():
    return reload_models()
