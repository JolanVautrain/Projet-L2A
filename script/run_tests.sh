#!/bin/bash
# Script de test complet pour G34
# Ce script exécute tous les tests (backend et frontend) avec génération de rapports

set -e  # Arrêt en cas d'erreur

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # Pas de couleur

# Variables
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TEST_DIR="$PROJECT_ROOT/test"
REPORTS_DIR="$TEST_DIR/reports"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
VENV_DIR="$PROJECT_ROOT/.venv"

# Déterminer le bon interpréteur Python
if [ -f "$VENV_DIR/bin/python" ]; then
    PYTHON="$VENV_DIR/bin/python"
    PIP="$VENV_DIR/bin/pip"
    PYTEST="$VENV_DIR/bin/pytest"
else
    PYTHON="python3"
    PIP="pip3"
    PYTEST="pytest"
fi

# Fonction d'affichage
print_step() {
    echo -e "${BLUE}==>${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}!${NC} $1"
}

# Fonction de nettoyage
cleanup() {
    print_step "Nettoyage du conteneur de test..."
    
    # Arrêter le serveur WebSocket s'il est en cours d'exécution
    if [ -n "$WS_SERVER_PID" ] && kill -0 $WS_SERVER_PID 2>/dev/null; then
        print_step "Arrêt du serveur WebSocket (PID: $WS_SERVER_PID)..."
        kill $WS_SERVER_PID 2>/dev/null || true
        wait $WS_SERVER_PID 2>/dev/null || true
        print_success "Serveur WebSocket arrêté"
    fi
    
    cd "$PROJECT_ROOT"
    docker compose -f docker/docker-compose.test.yml down -v 2>/dev/null || true
    
    # Supprimer les fichiers temporaires de build
    if [ -d "$PROJECT_ROOT/sail_weather_backend.egg-info" ]; then
        rm -rf "$PROJECT_ROOT/sail_weather_backend.egg-info"
        print_success "Dossier sail_weather_backend.egg-info supprimé"
    fi
    
    print_success "Nettoyage terminé"
}

# Trap pour nettoyer en cas d'interruption
trap cleanup EXIT INT TERM

###############################################################################
# DÉBUT DES TESTS
###############################################################################

echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║              G34 - SUITE DE TESTS COMPLÈTE                 ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Création des dossiers de test et de rapports
print_step "Création des dossiers de test et de rapports..."
mkdir -p "$REPORTS_DIR"
mkdir -p "$TEST_DIR/backend"
print_success "Dossiers créés: $TEST_DIR/backend et $REPORTS_DIR"

# Installer les dépendances de test
print_step "Installation des dépendances de test..."
if [ -f "$BACKEND_DIR/requirements-dev.txt" ]; then
    "$PIP" install -q -r "$BACKEND_DIR/requirements-dev.txt" 2>/dev/null || {
        print_warning "Installation des dépendances DEV échouée, tentative de réinstallation"
        "$PIP" install --upgrade pip setuptools wheel
        "$PIP" install -r "$BACKEND_DIR/requirements-dev.txt"
    }
    print_success "Dépendances de test installées"
else
    print_warning "Fichier requirements-dev.txt non trouvé"
fi

# Copier les tests du backend dans le dossier test/backend
print_step "Copie des tests du backend dans test/backend/..."
if [ -d "$BACKEND_DIR/tests" ]; then
    cp -r "$BACKEND_DIR/tests/"* "$TEST_DIR/backend/" 2>/dev/null || true
    print_success "Tests copiés depuis backend/tests/"
else
    print_warning "Dossier backend/tests/ non trouvé"
fi

# Installer les dépendances frontend si nécessaire (pour ESLint)
if command -v npm >/dev/null 2>&1 && [ -f "$FRONTEND_DIR/package.json" ]; then
    if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
        print_step "Installation des dépendances frontend (npm install)..."
        (cd "$FRONTEND_DIR" && npm install)
        print_success "Dépendances frontend installées"
    else
        print_success "Dépendances frontend déjà présentes"
    fi
else
    print_warning "npm non disponible ou frontend/package.json absent"
fi

###############################################################################
# 1. DÉMARRAGE DE LA BASE DE DONNÉES DE TEST
###############################################################################

print_step "Démarrage de la base de données de test..."
cd "$PROJECT_ROOT"
docker compose -f docker/docker-compose.test.yml up -d

# Attendre que la base de données soit prête
print_step "Attente de la disponibilité de la base de données..."
max_attempts=30
attempt=0
while [ $attempt -lt $max_attempts ]; do
    if docker exec sail-weather-test-db pg_isready -U testuser -d testdb > /dev/null 2>&1; then
        print_success "Base de données prête"
        break
    fi
    attempt=$((attempt + 1))
    echo -n "."
    sleep 1
done
echo ""

if [ $attempt -eq $max_attempts ]; then
    print_error "La base de données n'a pas démarré dans le temps imparti"
    exit 1
fi

# Exporter les variables d'environnement pour les tests
export TEST_DB_HOST=localhost
export TEST_DB_PORT=5434
export TEST_DB_USER=testuser
export TEST_DB_PASSWORD=testpassword
export TEST_DB_NAME=testdb
# Variables pour conftest.py
export POSTGRES_HOST=localhost
export POSTGRES_PORT=5434
export POSTGRES_USER=testuser
export POSTGRES_PASSWORD=testpassword
export POSTGRES_DB=testdb

###############################################################################
# 2. TESTS DE FORMATAGE ET QUALITÉ DU CODE BACKEND
###############################################################################

echo ""
print_step "═══════════════════════════════════════════════════════════"
print_step "TESTS DE QUALITÉ DU CODE BACKEND"
print_step "═══════════════════════════════════════════════════════════"

cd "$PROJECT_ROOT"

# Test isort
print_step "Vérification de l'ordre des imports (isort)..."
if isort --check-only --diff backend/ > "$REPORTS_DIR/isort.log" 2>&1; then
    print_success "isort: OK"
else
    print_warning "isort: Certains imports ne sont pas dans le bon ordre (voir isort.log)"
fi

# Test pylint
print_step "Analyse statique du code (pylint)..."
if pylint backend/ --output-format=text > "$REPORTS_DIR/pylint.log" 2>&1; then
    print_success "pylint: OK"
else
    print_warning "pylint: Quelques problèmes détectés (voir pylint.log)"
fi

# Test flake8
print_step "Vérification du style (flake8)..."
if flake8 backend/ > "$REPORTS_DIR/flake8.log" 2>&1; then
    print_success "flake8: OK"
else
    print_warning "flake8: Quelques problèmes détectés (voir flake8.log)"
fi

# Test mypy
print_step "Vérification des types (mypy)..."
if mypy backend/ > "$REPORTS_DIR/mypy.log" 2>&1; then
    print_success "mypy: OK"
else
    print_warning "mypy: Quelques problèmes de typage détectés (voir mypy.log)"
fi

###############################################################################
# 3. TESTS UNITAIRES ET D'INTÉGRATION BACKEND
###############################################################################

echo ""
print_step "═══════════════════════════════════════════════════════════"
print_step "TESTS UNITAIRES ET D'INTÉGRATION BACKEND"
print_step "═══════════════════════════════════════════════════════════"

print_step "Exécution des tests pytest avec couverture..."
# Installer le backend en mode editable pour que les imports fonctionnent
"$PIP" install -q -e "$PROJECT_ROOT" 2>/dev/null || true
# Ajouter le dossier racine du projet au PYTHONPATH pour que les imports fonctionnent
export PYTHONPATH="$PROJECT_ROOT:$PYTHONPATH"
if "$PYTEST" test/backend/ \
    --verbose \
    --cov=backend \
    --cov-report=term-missing \
    --cov-report=xml:"$REPORTS_DIR/coverage-backend.xml" \
    --cov-report=html:"$REPORTS_DIR/htmlcov-backend" \
    --junit-xml="$REPORTS_DIR/junit-backend.xml" \
    --log-file="$REPORTS_DIR/pytest-backend.log" \
    --log-file-level=INFO 2>&1 | tee "$REPORTS_DIR/pytest-backend-output.log"; then
    print_success "Tests pytest backend: TOUS PASSÉS"
else
    print_error "Tests pytest backend: CERTAINS TESTS ONT ÉCHOUÉ"
    echo "Voir les détails dans $REPORTS_DIR/pytest-backend.log"
fi

###############################################################################
# 3.5 LANCEMENT DU SERVEUR WEBSOCKET POUR LES TESTS
###############################################################################

echo ""
print_step "═══════════════════════════════════════════════════════════"
print_step "DÉMARRAGE DU SERVEUR WEBSOCKET"
print_step "═══════════════════════════════════════════════════════════"

# Vérifier que Node.js est disponible
if ! command -v node >/dev/null 2>&1; then
    print_warning "Node.js non disponible. Les tests WebSocket seront ignorés."
else
    # Démarrer le serveur WebSocket en arrière-plan
    print_step "Démarrage du serveur WebSocket sur le port 3001..."
    cd "$BACKEND_DIR"
    
    # Vérifier les dépendances npm
    if [ ! -d "$BACKEND_DIR/node_modules" ]; then
        print_step "Installation des dépendances npm du backend..."
        npm install > "$REPORTS_DIR/npm-install.log" 2>&1 || {
            print_warning "Installation npm échouée, vérification du service WebSocket"
        }
    fi
    
    # Lancer le serveur WebSocket
    node "$BACKEND_DIR/gameServeur.js" > "$REPORTS_DIR/websocket-server.log" 2>&1 &
    WS_SERVER_PID=$!
    print_success "Serveur WebSocket démarré (PID: $WS_SERVER_PID)"
    
    # Attendre que le serveur soit prêt
    sleep 2
    
    # Vérifier que le serveur est up
    if ! kill -0 $WS_SERVER_PID 2>/dev/null; then
        print_error "Le serveur WebSocket n'a pas pu démarrer"
        print_warning "Vérifiez $REPORTS_DIR/websocket-server.log pour les détails"
        WS_SERVER_PID=""
    fi
fi

###############################################################################
# 4. TESTS SCÉNARIOS FRONTEND (via pytest)
###############################################################################

echo ""
print_step "═══════════════════════════════════════════════════════════"
print_step "TESTS SCÉNARIOS FRONTEND (inscription, jeu, boutique, etc.)"
print_step "═══════════════════════════════════════════════════════════"

cd "$PROJECT_ROOT"

print_step "Exécution des scénarios frontend avec couverture..."
if "$PYTEST" test/frontend/ \
    --verbose \
    --cov=backend \
    --cov-report=term-missing \
    --cov-report=xml:"$REPORTS_DIR/coverage-frontend.xml" \
    --cov-report=html:"$REPORTS_DIR/htmlcov-frontend" \
    --junit-xml="$REPORTS_DIR/junit-frontend.xml" \
    --log-file="$REPORTS_DIR/pytest-frontend.log" \
    --log-file-level=INFO 2>&1 | tee "$REPORTS_DIR/pytest-frontend-output.log"; then
    print_success "Tests scénarios frontend: TOUS PASSÉS"
else
    print_error "Tests scénarios frontend: CERTAINS TESTS ONT ÉCHOUÉ"
    echo "Voir les détails dans $REPORTS_DIR/pytest-frontend.log"
fi

# Arrêter le serveur WebSocket
if [ -n "$WS_SERVER_PID" ] && kill -0 $WS_SERVER_PID 2>/dev/null; then
    print_step "Arrêt du serveur WebSocket..."
    kill $WS_SERVER_PID 2>/dev/null || true
    wait $WS_SERVER_PID 2>/dev/null || true
    print_success "Serveur WebSocket arrêté"
fi

###############################################################################
# 5. COUVERTURE COMBINÉE (backend + frontend)
###############################################################################

echo ""
print_step "═══════════════════════════════════════════════════════════"
print_step "COUVERTURE COMBINÉE (tous les tests)"
print_step "═══════════════════════════════════════════════════════════"

cd "$PROJECT_ROOT"

print_step "Exécution de tous les tests avec couverture combinée..."
if "$PYTEST" test/backend/ test/frontend/ \
    --verbose \
    --cov=backend \
    --cov-report=term-missing \
    --cov-report=xml:"$REPORTS_DIR/coverage.xml" \
    --cov-report=html:"$REPORTS_DIR/htmlcov" \
    --junit-xml="$REPORTS_DIR/junit.xml" \
    --log-file="$REPORTS_DIR/pytest.log" \
    --log-file-level=INFO 2>&1 | tee "$REPORTS_DIR/pytest-output.log"; then
    print_success "Tests combinés: TOUS PASSÉS"
else
    print_error "Tests combinés: CERTAINS TESTS ONT ÉCHOUÉ"
    echo "Voir les détails dans $REPORTS_DIR/pytest.log"
fi

###############################################################################
# 6. TESTS FRONTEND QUALITÉ (ESLint)
###############################################################################

echo ""
print_step "═══════════════════════════════════════════════════════════"
print_step "TESTS DE QUALITÉ DU CODE FRONTEND"
print_step "═══════════════════════════════════════════════════════════"

if [ -d "$FRONTEND_DIR" ]; then
    cd "$FRONTEND_DIR"
    
    # Vérifier si node_modules existe
    if [ ! -d "node_modules" ]; then
        print_warning "node_modules non trouvé, installation des dépendances..."
        npm install
    fi
    
    print_step "Vérification ESLint du frontend..."
    if npm run lint > "$REPORTS_DIR/eslint.log" 2>&1; then
        print_success "ESLint: OK"
    else
        print_warning "ESLint: Quelques problèmes détectés (voir eslint.log)"
    fi
else
    print_warning "Dossier frontend non trouvé, tests frontend ignorés"
fi

###############################################################################
# 7. GÉNÉRATION DU RAPPORT FINAL
###############################################################################

echo ""
print_step "═══════════════════════════════════════════════════════════"
print_step "GÉNÉRATION DU RAPPORT FINAL"
print_step "═══════════════════════════════════════════════════════════"

cd "$PROJECT_ROOT"

# Créer un résumé
cat > "$REPORTS_DIR/RESUME.txt" << EOF
═══════════════════════════════════════════════════════════
SAIL WEATHER - RAPPORT DE TESTS
Date: $(date '+%Y-%m-%d %H:%M:%S')
═══════════════════════════════════════════════════════════

FICHIERS GÉNÉRÉS:
- pytest-backend.log       : Logs des tests backend
- pytest-frontend.log      : Logs des scénarios frontend
- pytest.log               : Logs combinés (tous les tests)
- junit-backend.xml        : Résultats backend JUnit
- junit-frontend.xml       : Résultats frontend JUnit
- junit.xml                : Résultats combinés JUnit
- coverage-backend.xml     : Couverture backend XML
- coverage-frontend.xml    : Couverture frontend XML
- coverage.xml             : Couverture combinée XML
- htmlcov-backend/         : Rapport couverture backend HTML
- htmlcov-frontend/        : Rapport couverture frontend HTML
- htmlcov/                 : Rapport couverture combinée HTML
- pylint.log               : Rapport d'analyse pylint
- flake8.log               : Rapport de style flake8
- isort.log                : Rapport d'ordre des imports
- mypy.log                 : Rapport de vérification des types
- eslint.log               : Rapport ESLint frontend

LOCALISATION DES RAPPORTS:
$REPORTS_DIR

COMMANDES UTILES:
- Voir la couverture HTML: open $REPORTS_DIR/htmlcov/index.html
- Voir les logs pytest: cat $REPORTS_DIR/pytest.log
- Voir tous les logs: ls -la $REPORTS_DIR/

═══════════════════════════════════════════════════════════
EOF

print_success "Rapport final généré: $REPORTS_DIR/RESUME.txt"

# Afficher un résumé
echo ""
echo -e "${GREEN}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                  TESTS TERMINÉS                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo "Rapports disponibles dans: $REPORTS_DIR"
echo ""
echo "Fichiers principaux:"
echo "  - pytest-backend.log       (logs tests backend)"
echo "  - pytest-frontend.log      (logs scénarios frontend)"
echo "  - pytest.log               (logs combinés)"
echo "  - junit.xml                (résultats JUnit combinés)"
echo "  - coverage.xml             (couverture combinée XML)"
echo "  - htmlcov/                 (couverture combinée HTML)"
echo "  - htmlcov-backend/         (couverture backend HTML)"
echo "  - htmlcov-frontend/        (couverture frontend HTML)"
echo ""
echo "Pour voir la couverture de code:"
echo "    Ouvrez: $REPORTS_DIR/htmlcov/index.html"
echo ""

# Le cleanup sera automatiquement appelé grâce au trap
rm -rf G34_backend.egg-info
exit 0
