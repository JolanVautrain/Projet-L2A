#!/bin/bash
# Script unifié pour gérer les containers Docker en développement
# Utilisation: 
#   ./script/docker-dev.sh              # Redémarrage rapide (défaut)
#   ./script/docker-dev.sh update       # Mise à jour complète avec reconstruction
#   ./script/docker-dev.sh logs         # Afficher les logs
#   ./script/docker-dev.sh stop         # Arrêter les containers

set -e

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Se placer à la racine du projet
cd "$(dirname "$0")/.."
PROJECT_ROOT=$(pwd)

# Vérifier que docker est disponible
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ docker-compose n'est pas installé!${NC}"
    exit 1
fi

# Variable pour le mode
MODE="${1:-restart}"

# Fonction pour afficher l'aide
show_help() {
    echo "=========================================="
    echo "  Docker Dev - Gestionnaire des Containers"
    echo "=========================================="
    echo ""
    echo "Utilisation: ./script/docker-dev.sh [commande]"
    echo ""
    echo "Commandes disponibles:"
    echo "  restart       Redémarrage rapide (défaut)"
    echo "  update        Reconstruction complète avec nouvelles images"
    echo "  logs          Afficher les logs en temps réel"
    echo "  logs-ws       Afficher les logs du serveur WebSocket uniquement"
    echo "  stop          Arrêter tous les containers"
    echo "  status        Afficher l'état des containers"
    echo "  help          Afficher cette aide"
    echo ""
    echo "Exemples:"
    echo "  ./script/docker-dev.sh              # Redémarrage rapide"
    echo "  ./script/docker-dev.sh update       # Mise à jour complète"
    echo "  ./script/docker-dev.sh logs         # Voir les logs"
    echo ""
}

# Fonction pour redémarrer rapidement
restart_containers() {
    echo "=========================================="
    echo "  Redémarrage Rapide - Docker Dev"
    echo "=========================================="
    echo ""
    
    cd "$PROJECT_ROOT"
    
    echo -e "${BLUE}🛑 Arrêt des containers...${NC}"
    docker-compose -f docker/docker-compose.dev.yml down
    
    echo ""
    echo -e "${BLUE}🚀 Démarrage des containers...${NC}"
    docker-compose -f docker/docker-compose.dev.yml up -d
    
    echo ""
    echo -e "${BLUE}⏳ Attente du démarrage (3 secondes)...${NC}"
    sleep 3
    
    echo ""
    echo "========================================="
    echo "📊 État des containers"
    echo "========================================="
    docker-compose -f docker/docker-compose.dev.yml ps
    
    echo ""
    echo -e "${GREEN}✅ Redémarrage complété!${NC}"
}

# Fonction pour mise à jour complète
update_containers() {
    echo "=========================================="
    echo "  Mise à jour Docker - Développement"
    echo "=========================================="
    echo ""
    echo "📁 Répertoire du projet: $PROJECT_ROOT"
    echo "========================================="
    
    cd "$PROJECT_ROOT"
    
    echo ""
    echo -e "${BLUE}⏳ Reconstruction des images Docker...${NC}"
    docker-compose -f docker/docker-compose.dev.yml build --no-cache
    
    echo ""
    echo -e "${BLUE}🛑 Arrêt des containers...${NC}"
    docker-compose -f docker/docker-compose.dev.yml down
    
    echo ""
    echo -e "${BLUE}🚀 Démarrage des containers...${NC}"
    docker-compose -f docker/docker-compose.dev.yml up -d
    
    echo ""
    echo -e "${BLUE}⏳ Attente du démarrage (5 secondes)...${NC}"
    sleep 5
    
    echo ""
    echo "========================================="
    echo "📊 État des containers"
    echo "========================================="
    docker-compose -f docker/docker-compose.dev.yml ps
    
    echo ""
    echo "========================================="
    echo "📋 Logs du serveur WebSocket"
    echo "========================================="
    docker-compose -f docker/docker-compose.dev.yml logs --tail 15 ws-server
    
    echo ""
    echo -e "${GREEN}✅ Mise à jour complète!${NC}"
}

# Fonction pour afficher les logs
show_logs() {
    cd "$PROJECT_ROOT"
    echo "=========================================="
    echo "  Logs - Docker Dev (Ctrl+C pour quitter)"
    echo "=========================================="
    echo ""
    docker-compose -f docker/docker-compose.dev.yml logs -f
}

# Fonction pour afficher les logs du WebSocket
show_ws_logs() {
    cd "$PROJECT_ROOT"
    echo "=========================================="
    echo "  Logs WebSocket - Docker Dev (Ctrl+C pour quitter)"
    echo "=========================================="
    echo ""
    docker-compose -f docker/docker-compose.dev.yml logs -f ws-server
}

# Fonction pour arrêter
stop_containers() {
    echo "=========================================="
    echo "  Arrêt des Containers"
    echo "=========================================="
    echo ""
    
    cd "$PROJECT_ROOT"
    
    echo -e "${BLUE}🛑 Arrêt des containers...${NC}"
    docker-compose -f docker/docker-compose.dev.yml down
    
    echo ""
    echo -e "${GREEN}✅ Containers arrêtés!${NC}"
}

# Fonction pour afficher le statut
show_status() {
    cd "$PROJECT_ROOT"
    echo "=========================================="
    echo "  État des Containers"
    echo "=========================================="
    echo ""
    docker-compose -f docker/docker-compose.dev.yml ps
}

# Exécuter la commande appropriée
case "$MODE" in
    restart)
        restart_containers
        ;;
    update)
        update_containers
        ;;
    logs)
        show_logs
        ;;
    logs-ws)
        show_ws_logs
        ;;
    stop)
        stop_containers
        ;;
    status)
        show_status
        ;;
    help)
        show_help
        ;;
    *)
        echo -e "${RED}❌ Commande inconnue: $MODE${NC}"
        echo ""
        show_help
        exit 1
        ;;
esac
