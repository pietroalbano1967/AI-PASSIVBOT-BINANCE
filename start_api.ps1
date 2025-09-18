# start_api.ps1
# Script per avviare il server FastAPI di Passivbot

# Attiva l'ambiente virtuale
. .\venv\Scripts\Activate.ps1

# Controlla se la cartella si chiama "fastapi" o "api"
if (Test-Path ".\fastapi\main.py") {
    Write-Output "Avvio API da cartella fastapi..."
    uvicorn main:app --reload --host 127.0.0.1 --port 8000 --app-dir fastapi
}
elseif (Test-Path ".\api\main.py") {
    Write-Output "Avvio API da cartella api..."
    uvicorn main:app --reload --host 127.0.0.1 --port 8000 --app-dir api
}
else {
    Write-Error "main.py non trovato né in fastapi\ né in api\"
}
