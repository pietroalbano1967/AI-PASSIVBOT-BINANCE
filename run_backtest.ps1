# run_backtest.ps1
param(
    [string]$Config = "multiasset_light.hjson"
)

Write-Host "🔄 Avvio backtest con config: $Config" -ForegroundColor Cyan

# Attiva l'ambiente virtuale
& "$PSScriptRoot\venv\Scripts\Activate.ps1"

# Lancia il backtest
python "$PSScriptRoot\src\backtest.py" "configs\examples\$Config"

Write-Host "✅ Backtest completato" -ForegroundColor Green
