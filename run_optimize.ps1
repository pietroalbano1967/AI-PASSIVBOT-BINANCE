param (
    [string]$Config = "multiasset_light.hjson"
)

Write-Host "⚙️ Avvio ottimizzazione con config: $Config"

# Attiva venv
& "$PSScriptRoot\venv\Scripts\Activate.ps1"

# Avvia optimize.py con il config scelto
python "$PSScriptRoot\src\optimize.py" "configs/examples/$Config"
