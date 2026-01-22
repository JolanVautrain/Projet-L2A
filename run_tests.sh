#!/usr/bin/env bash
set -euo pipefail

VENV=".venv"
PYTHON="python"
if [ -x "$VENV/bin/python" ]; then
  PYTHON="$VENV/bin/python"
fi

REPORTS="backend/tests/reports"
mkdir -p "$REPORTS"

KEEP_PG="false"
while getopts p: flag
do
    case "${flag}" in
        p) KEEP_PG=${OPTARG};;
    esac
done

# Check backend and start if necessary
echo "Checking backend at http://localhost:5000 ..."
if command -v curl >/dev/null 2>&1; then
  if curl -sS --max-time 2 http://localhost:5000/ >/dev/null 2>&1; then
    echo "Backend appears to be running."
  else
    echo "Backend not reachable — starting via docker-compose (docker/docker-compose.yml)..."
    (cd docker && docker-compose up -d backend) || echo "docker-compose start failed"
    echo "Waiting for backend to become available..."
    for i in {1..30}; do
      if curl -sS --max-time 2 http://localhost:5000/ >/dev/null 2>&1; then
        echo "Backend is up"
        break
      fi
      sleep 1
    done
  fi
else
  echo "curl not found — attempting to start backend via docker-compose"
  (cd docker && docker-compose up -d backend) || echo "docker-compose start failed"
fi

# Postgres handling: use ephemeral host port mapping to avoid colliding with dev DB
PG_STARTED=0
if [ $KEEP_PG == "true" ]; then
  TEMP_PG_CONTAINER="projetl2a_test_db_persistent"
  if docker ps -a --format '{{.Names}}' | grep "projetl2a_test_db"; then
    if ! docker ps --format '{{.Names}}' | grep "projetl2a_test_db"; then
      echo "Starting existing Postgres container $TEMP_PG_CONTAINER"
      docker start "$TEMP_PG_CONTAINER" || true
    else
      echo "Reusing running Postgres container $TEMP_PG_CONTAINER"
    fi
  else
    echo "Creating persistent Postgres container $TEMP_PG_CONTAINER"
    docker run --name "$TEMP_PG_CONTAINER" -e POSTGRES_USER=mon_user -e POSTGRES_PASSWORD=mon_pass -e POSTGRES_DB=ma_db -P -d postgres:15 || { echo "Failed to start persistent Postgres container"; exit 1; }
  fi
  sleep 1
  MAPPED_PORT=$(docker port "$TEMP_PG_CONTAINER" 5432 | sed -E 's/.*:([0-9]+)$/\1/')
  if [ -z "$MAPPED_PORT" ]; then
    echo "Failed to determine mapped port for $TEMP_PG_CONTAINER"; exit 1
  fi
  export POSTGRES_HOST=127.0.0.1
  export POSTGRES_PORT=$MAPPED_PORT
  echo "Persistent test Postgres mapped to host port $POSTGRES_PORT"
else
  TEMP_PG_CONTAINER="projetl2a_test_db_$$"
  echo "Starting temporary Postgres container $TEMP_PG_CONTAINER"
  docker run --name "$TEMP_PG_CONTAINER" -e POSTGRES_USER=mon_user -e POSTGRES_PASSWORD=mon_pass -e POSTGRES_DB=ma_db -P -d postgres:15 || { echo "Failed to start temporary Postgres container"; exit 1; }
  PG_STARTED=1
  sleep 1
  MAPPED_PORT=$(docker port "$TEMP_PG_CONTAINER" 5432 | sed -E 's/.*:([0-9]+)$/\1/')
  if [ -z "$MAPPED_PORT" ]; then
    echo "Failed to determine mapped port for $TEMP_PG_CONTAINER"; docker rm -f "$TEMP_PG_CONTAINER" || true; exit 1
  fi
  export POSTGRES_HOST=127.0.0.1
  export POSTGRES_PORT=$MAPPED_PORT
  echo "Temporary test Postgres mapped to host port $POSTGRES_PORT"
  echo "Waiting for Postgres to accept connections..."
  for i in {1..60}; do
    if python - <<PY >/dev/null 2>&1
import socket,sys
s=socket.socket()
s.settimeout(1)
try:
    s.connect(('127.0.0.1', $MAPPED_PORT))
    s.close()
    sys.exit(0)
except Exception:
    sys.exit(1)
PY
    then
      echo "Postgres is up"
      break
    fi
    sleep 1
  done
fi

# Ensure dependencies were installed via init script
DEP_MARKER="$VENV/.deps_installed"
if [ -f "$DEP_MARKER" ]; then
  echo "Dependencies marker found — continuing."
else
  echo
  echo "ERROR: dependencies not installed. Run ./scripts/init_env.sh (or see README) to set up the virtual environment and install dev dependencies."
  exit 1
fi

# Export Postgres environment variables so tests use correct credentials/host
export POSTGRES_USER=mon_user
export POSTGRES_PASSWORD=mon_pass
export POSTGRES_DB=ma_db
export POSTGRES_HOST=${POSTGRES_HOST:-127.0.0.1}
export POSTGRES_PORT=${POSTGRES_PORT:-5432}

echo "Running pytest (reports in $REPORTS)..."

# Build pytest args
PYTEST_ARGS=(backend --junitxml="$REPORTS/junit.xml")
if [ "${SKIP_COVERAGE:-0}" != "1" ]; then
  PYTEST_ARGS+=(--cov=backend --cov-report=xml:"$REPORTS/coverage.xml")
fi
if [ "${TEST_PARALLEL:-0}" = "1" ]; then
  PYTEST_ARGS+=(-n auto)
fi

$PYTHON -m pytest "${PYTEST_ARGS[@]}" 2>&1 | tee "$REPORTS/pytest.log"
TEST_EXIT=${PIPESTATUS[0]}

if [ "$PG_STARTED" -eq 1 ]; then
  echo "Stopping and removing temporary Postgres container $TEMP_PG_CONTAINER"
  docker rm -f "$TEMP_PG_CONTAINER" || true
fi

echo "Tests finished. Logs: $REPORTS/pytest.log"

# Run additional quality tests individually and append output to the same log
QUALITY_TESTS=(
  "backend/tests/test_pylint.py"
  "backend/tests/test_isort.py"
  "backend/tests/test_mypy.py"
  "backend/tests/test_eslint.py"
)
OVERALL_FAILED=0
for t in "${QUALITY_TESTS[@]}"; do
  echo "Running quality test: $t"
  $PYTHON -m pytest "$t" 2>&1 | tee -a "$REPORTS/pytest.log"
  EXIT_CODE=${PIPESTATUS[0]}
  if [ "$EXIT_CODE" -ne 0 ]; then
    echo "Quality test failed: $t"
    OVERALL_FAILED=1
  fi
done

echo "Tests finished. Logs: $REPORTS/pytest.log"

# Determine final exit code: non-zero if main pytest or any quality test failed
if [ "$TEST_EXIT" -ne 0 ] || [ "$OVERALL_FAILED" -ne 0 ]; then
  exit 1
else
  exit 0
fi
