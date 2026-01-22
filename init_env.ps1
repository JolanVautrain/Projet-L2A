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
    # Python dev tools
    & "$venvPath\Scripts\python.exe" -m pip install pytest pytest-cov flake8 mypy types-psycopg2 types-Flask-Cors pylint isort
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

# Install frontend npm deps (eslint, stylelint) if frontend/package.json exists
$frontendPkg = Join-Path (Get-Location) 'frontend\package.json'
if (Test-Path $frontendPkg) {
    Write-Output "Found frontend/package.json - installing npm dependencies..."
    Push-Location (Join-Path (Get-Location) 'frontend')
    try {
        if (-not (Test-Path 'node_modules')) {
            Write-Output "Running npm install..."
            npm install
        } else {
            Write-Output "node_modules already present - skipping npm install"
        }

        # Ensure eslint is installed as dev dependency
        $eslintInstalled = (& npm list --depth=0 eslint) -ne $null
        if (-not $eslintInstalled) { npm install --save-dev eslint }

        # Ensure stylelint is installed
        $stylelintInstalled = (& npm list --depth=0 stylelint) -ne $null
        if (-not $stylelintInstalled) { npm install --save-dev stylelint stylelint-config-standard }
    } catch {
        Write-Warning "npm install failed or npm not found: $_"
    } finally {
        Pop-Location
    }
} else {
    Write-Output "No frontend/package.json found - skipping npm step"
}

Write-Output "Done."

