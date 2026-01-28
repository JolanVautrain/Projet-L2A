#!/usr/bin/env bash
# Script Bash : crée un virtualenv Python et installe les dépendances
# Usage:
#   ./script/install_requirements.sh
#   or
#   ./script/install_requirements.sh -r script/requirements-dev.txt -v .venv

REQ_PATH="script/requirements-dev.txt"
VENV_PATH=".venv"
FORCE=0

while getopts "r:v:f" opt; do
  case $opt in
    r) REQ_PATH="$OPTARG" ;;
    v) VENV_PATH="$OPTARG" ;;
    f) FORCE=1 ;;
    *) echo "Usage: $0 [-r requirements.txt] [-v venv_path] [-f force recreate]"; exit 1 ;;
  esac
done

set -e

echo "== Install requirements into venv =="

# Find python3
PYTHON_CMD=""
if command -v python3 >/dev/null 2>&1; then
  PYTHON_CMD=python3
elif command -v python >/dev/null 2>&1; then
  # Check version >=3
  if python -c 'import sys
print(sys.version_info[0])' 2>/dev/null | grep -q "3"; then
    PYTHON_CMD=python
  fi
fi

if [ -z "$PYTHON_CMD" ]; then
  echo "Aucun interpréteur Python 3 trouvé. Installez Python 3." >&2
  exit 1
fi

echo "Python trouvé: $PYTHON_CMD"

if [ ! -f "$REQ_PATH" ]; then
  echo "Fichier de requirements introuvable : $REQ_PATH" >&2
  exit 1
fi

if [ -d "$VENV_PATH" ] && [ $FORCE -eq 0 ]; then
  echo "Le venv existe déjà en '$VENV_PATH'. Utilisez -f pour recréer." >&2
else
  if [ -d "$VENV_PATH" ]; then
    rm -rf "$VENV_PATH"
  fi
  echo "Création du virtualenv dans $VENV_PATH..."
  $PYTHON_CMD -m venv "$VENV_PATH"
fi

PIP_PATH="$VENV_PATH/bin/pip"
if [ ! -x "$PIP_PATH" ]; then
  echo "pip introuvable dans le venv ($PIP_PATH)" >&2
  exit 1
fi

echo "Mise à jour de pip, setuptools et wheel..."
"$PIP_PATH" install --upgrade pip setuptools wheel

echo "Installation des dépendances depuis $REQ_PATH ..."
"$PIP_PATH" install -r "$REQ_PATH"

echo "Installation terminée."
echo "Pour activer le venv : source $VENV_PATH/bin/activate"
