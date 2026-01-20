param(
    [string]$venvPath = ".venv"
)

Write-Output "Preparing virtual environment at $venvPath..."

if (-not (Test-Path $venvPath)) {
    Write-Output "Creating virtual environment at $venvPath..."
    python -m venv $venvPath
    Write-Output "Virtualenv created at $venvPath"
} else {
    Write-Output "Virtualenv already exists at $venvPath"
}

$activate = Join-Path $venvPath "Scripts\Activate.ps1"
Write-Output "To activate the venv in PowerShell run: . $activate"

Write-Output "Installing dependencies into the venv..."
try {
    & "$venvPath\Scripts\python.exe" -m pip install --upgrade pip
    & "$venvPath\Scripts\python.exe" -m pip install -r backend/requirements.txt
    & "$venvPath\Scripts\python.exe" -m pip install pytest pytest-cov flake8 mypy types-psycopg2
} catch {
    Write-Error "Failed to install dependencies: $_"
    exit 1
}

# create marker file so run_tests scripts know deps are installed
try {
    $marker = Join-Path $venvPath '.deps_installed'
    New-Item -ItemType File -Path $marker -Force | Out-Null
    Write-Output "Created marker: $marker"
} catch {
    Write-Warning "Could not create deps marker: $_"
}

Write-Output "Done."
