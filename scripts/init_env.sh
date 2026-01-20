#!/usr/bin/env bash
set -euo pipefail
#!/usr/bin/env bash
set -euo pipefail

VENV=".venv"
if [ "$#" -ge 1 ]; then
  VENV="$1"
fi

echo "Creating virtual environment at $VENV..."
python -m venv "$VENV"
echo "Virtualenv created at $VENV"
echo "To activate: source $VENV/bin/activate"

echo "Installing dependencies into the venv..."
"$VENV/bin/python" -m pip install --upgrade pip
"$VENV/bin/python" -m pip install -r backend/requirements.txt
"$VENV/bin/python" -m pip install pytest pytest-cov flake8 mypy types-psycopg2

echo "Done."
