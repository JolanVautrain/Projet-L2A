#!/usr/bin/env bash
set -euo pipefail

VENV=".venv"
if [ "$#" -ge 1 ]; then
  VENV="$1"
fi

echo "Preparing virtual environment at $VENV..."
if [ ! -d "$VENV" ]; then
  echo "Creating virtual environment at $VENV..."
  python -m venv "$VENV"
  echo "Virtualenv created at $VENV"
else
  echo "Virtualenv already exists at $VENV"
fi

echo "To activate: source $VENV/bin/activate"

echo "Installing dependencies into the venv..."
"$VENV/bin/python" -m pip install --upgrade pip
"$VENV/bin/python" -m pip install -r backend/requirements.txt
# Python dev tools
"$VENV/bin/python" -m pip install pytest pytest-cov flake8 mypy types-psycopg2 types-Flask-Cors pylint isort

# create marker file so run_tests scripts know deps are installed
MARKER="$VENV/.deps_installed"
touch "$MARKER"
echo "Created marker: $MARKER"

# If frontend exists, install npm deps and ensure eslint/stylelint
FRONTEND_PKG="frontend/package.json"
if [ -f "$FRONTEND_PKG" ]; then
  echo "Found frontend/package.json - installing npm dependencies..."
  pushd frontend >/dev/null
  if [ ! -d "node_modules" ]; then
    echo "Running npm install..."
    npm install
  else
    echo "node_modules already present - skipping npm install"
  fi

  # ensure eslint is installed
  if ! npm list --depth=0 eslint >/dev/null 2>&1; then
    npm install --save-dev eslint || true
  fi

  # ensure stylelint is installed
  if ! npm list --depth=0 stylelint >/dev/null 2>&1; then
    npm install --save-dev stylelint stylelint-config-standard || true
  fi

  popd >/dev/null
else
  echo "No frontend/package.json found - skipping npm step"
fi

echo "Done."
