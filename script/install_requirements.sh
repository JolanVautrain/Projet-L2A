#!/usr/bin/env bash
# Script Bash : crée un virtualenv Python et installe les dépendances (développement)
# Usage:
#   ./script/install_requirements.sh              # installe dev
#   ./script/install_requirements.sh -v .venv -f  # avec options
#
# Options:
#   -r <path>             Chemin du fichier requirements (défaut: backend/requirements-dev.txt)
#   -v <path>             Chemin du virtualenv (défaut: .venv)
#   -f                    Force la recréation du venv

REQ_PATH="backend/requirements-dev.txt"
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

echo "== Installation des dépendances (développement) =="
echo "Requirements: $REQ_PATH"
echo "Virtualenv: $VENV_PATH"

# Trouve le chemin de Python3
PYTHON_CMD=""
if command -v python3 >/dev/null 2>&1; then
  PYTHON_CMD=python3
elif command -v python >/dev/null 2>&1; then
  # Vérifie si la version est >=3
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
    echo "Suppression du venv existant..."
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

echo ""
echo "Mise à jour de pip, setuptools et wheel..."
"$PIP_PATH" install --upgrade pip setuptools wheel

echo ""
echo "Installation des dépendances depuis $REQ_PATH ..."
"$PIP_PATH" install -r "$REQ_PATH"

echo ""
echo "Installation terminée."
echo ""
echo "Pour activer le venv :"
echo "  source $VENV_PATH/bin/activate"
echo ""
echo "Pour désactiver le venv :"
echo "  deactivate"

