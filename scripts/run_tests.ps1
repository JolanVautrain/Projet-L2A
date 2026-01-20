param(
    [string]$venvPath = ".venv"
)

$PythonExe = if (Test-Path "$venvPath\Scripts\python.exe") { "$venvPath\Scripts\python.exe" } else { "python" }
$ReportsDir = Join-Path "backend" "tests"
$ReportsDir = Join-Path $ReportsDir "reports"
New-Item -ItemType Directory -Path $ReportsDir -Force | Out-Null

Write-Host 'Checking backend at http://localhost:5000 ...'
$backendUp = $false
try { Invoke-WebRequest -Uri http://localhost:5000/ -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop | Out-Null; $backendUp = $true } catch { $backendUp = $false }
if (-not $backendUp) {
    Write-Host 'Backend not reachable — starting via docker-compose (docker/docker-compose.yml)...'
    Push-Location 'docker'
    docker-compose up -d backend | Out-Null
    Pop-Location
    Write-Host 'Waiting for backend to become available...'
    for ($i = 0; $i -lt 30; $i++) { try { Invoke-WebRequest -Uri http://localhost:5000/ -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop | Out-Null; Write-Host 'Backend is up'; break } catch { Start-Sleep -Seconds 1 } }
}

$junitPath = Join-Path $ReportsDir 'junit.xml'
$covPath = Join-Path $ReportsDir 'coverage.xml'
$logPath = Join-Path $ReportsDir 'pytest.log'

# Postgres handling
$keepPg = $false
if ($env:KEEP_PG_CONTAINER -eq '1') { $keepPg = $true }
$pgStarted = $false
if ($keepPg) {
    $tempPgContainer = 'projl2a_test_db_persistent'
    $exists = (docker ps -a --format '{{.Names}}' | Select-String -Pattern ("^" + [regex]::Escape($tempPgContainer) + "$")) -ne $null
    if ($exists) {
        $running = (docker ps --format '{{.Names}}' | Select-String -Pattern ("^" + [regex]::Escape($tempPgContainer) + "$")) -ne $null
        if (-not $running) { Write-Host "Starting existing Postgres container $tempPgContainer"; docker start $tempPgContainer | Out-Null }
        else { Write-Host "Reusing running Postgres container $tempPgContainer" }
    } else {
        Write-Host "Creating persistent Postgres container $tempPgContainer"
        docker run --name $tempPgContainer -e POSTGRES_USER=mon_user -e POSTGRES_PASSWORD=mon_pass -e POSTGRES_DB=ma_db -P -d postgres:15 | Out-Null
    }
    # get mapped host port for the persistent container
    Start-Sleep -Seconds 1
    $portInfo = docker port $tempPgContainer 5432
    if ($portInfo) { $hostPort = ($portInfo -split ':')[-1].Trim(); $env:POSTGRES_PORT = $hostPort; Write-Host ('Persistent container mapped host port: ' + $hostPort) }
} else {
    $guid = [System.Guid]::NewGuid().ToString().Substring(0,8)
    $tempPgContainer = 'projl2a_test_db_' + $guid
    Write-Host ('Starting temporary Postgres container ' + $tempPgContainer)
    docker run --name $tempPgContainer -e POSTGRES_USER=mon_user -e POSTGRES_PASSWORD=mon_pass -e POSTGRES_DB=ma_db -P -d postgres:15 | Out-Null
    $pgStarted = $true
    # obtain mapped host port for container's 5432
    Start-Sleep -Seconds 1
    $portInfo = docker port $tempPgContainer 5432
    if ($portInfo) { $hostPort = ($portInfo -split ':')[-1].Trim() } else { $hostPort = '5432' }
    Write-Host ('Mapped Postgres host port: ' + $hostPort)
    # normalize port to digits and cast to int
    $portDigits = ($hostPort -replace '\D','')
    if ([string]::IsNullOrWhiteSpace($portDigits)) { Write-Host 'Failed to parse mapped port'; exit 1 }
    $portNum = [int]$portDigits
    Write-Host ('Waiting for Postgres to accept connections on port ' + $portNum)
    for ($i=0; $i -lt 60; $i++) { Start-Sleep -Seconds 1; $tcp = Test-NetConnection -ComputerName '127.0.0.1' -Port $portNum -WarningAction SilentlyContinue; if ($tcp.TcpTestSucceeded) { Write-Host 'Postgres is up'; break } }
    $env:POSTGRES_PORT = $portNum
}

# Ensure dependencies installed via init script
$depMarker = Join-Path $venvPath '.deps_installed'
if (Test-Path $depMarker) { Write-Host 'Dependencies marker found — continuing.' } else { Write-Host ''; Write-Host 'ERROR: dependencies not installed. Run .\scripts\init_env.ps1 (or see README) to set up the virtual environment and install dev dependencies.'; exit 1 }

# Export Postgres variables so tests use the same credentials as docker-compose
$env:POSTGRES_USER = 'mon_user'
$env:POSTGRES_PASSWORD = 'mon_pass'
$env:POSTGRES_DB = 'ma_db'
# do not override host/port if already set from mapped container
if (-not $env:POSTGRES_HOST) { $env:POSTGRES_HOST = '127.0.0.1' }
if (-not $env:POSTGRES_PORT) { $env:POSTGRES_PORT = '5432' }

Write-Host ('Running pytest (reports in ' + $ReportsDir + ')...')

# Build pytest args
$pytestArgs = @('backend', ('--junitxml=' + $junitPath))
if ($env:SKIP_COVERAGE -ne '1') { $pytestArgs += '--cov=backend'; $pytestArgs += ('--cov-report=xml:' + $covPath) }
if ($env:TEST_PARALLEL -eq '1') { $pytestArgs += '-n'; $pytestArgs += 'auto' }

& $PythonExe -m pytest @pytestArgs 2>&1 | Tee-Object -FilePath $logPath

if ($pgStarted) { Write-Host ('Stopping and removing temporary Postgres container ' + $tempPgContainer); docker rm -f $tempPgContainer | Out-Null }

Write-Host ('Tests finished. Logs: ' + $logPath)
exit $LASTEXITCODE
