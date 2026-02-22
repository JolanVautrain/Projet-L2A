#!/bin/bash
# Script unifié de build et déploiement pour Raspberry Pi
# Utilisation: ./deploy-prod.sh

set -e

echo "=========================================="
echo "Build & Déploiement Production"
echo "Raspberry Pi"
echo "=========================================="

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # Pas de couleur

# Se placer à la racine du projet
cd "$(dirname "$0")/.."
PROJECT_ROOT=$(pwd)

# Emplacement du fichier .env.production
ENV_PROD_FILE="$PROJECT_ROOT/docker/.env.production"

echo ""
echo "========================================="
echo "Étape 0 : Configuration Raspberry Pi"
echo "========================================="


# Si le fichier .env.production existe déjà, on n'interroge pas l'utilisateur
if [ -f "$ENV_PROD_FILE" ]; then
    echo -e "${GREEN}Fichier $ENV_PROD_FILE trouvé — utilisation existante (pas de demande d'adresse IP).${NC}"
    # Tenter d'extraire l'IP depuis les variables VITE_BACKEND_URL ou VITE_WS_URL
    RASPBERRY_IP=$(grep -E '^VITE_BACKEND_URL=' "$ENV_PROD_FILE" 2>/dev/null || true)
    if [ -n "$RASPBERRY_IP" ]; then
        RASPBERRY_IP=$(echo "$RASPBERRY_IP" | sed -E 's|VITE_BACKEND_URL=http://([^/:]+).*$|\1|')
    else
        RASPBERRY_IP=$(grep -E '^VITE_WS_URL=' "$ENV_PROD_FILE" 2>/dev/null || true)
        if [ -n "$RASPBERRY_IP" ]; then
            RASPBERRY_IP=$(echo "$RASPBERRY_IP" | sed -E 's|VITE_WS_URL=ws://([^/:]+).*$|\1|')
        fi
    fi
    if [ -n "$RASPBERRY_IP" ]; then
        echo -e "${GREEN}IP extraite depuis .env.production : $RASPBERRY_IP${NC}"
    else
        echo -e "${YELLOW}Impossible d'extraire l'adresse IP depuis $ENV_PROD_FILE. Certaines étapes n'utiliseront pas d'IP.${NC}"
    fi
    echo ""
    echo "Test de connectivité en cours..."
else
    # Demander l'IP du Raspberry Pi
    read -p "Entrez l'adresse IP de votre Raspberry Pi (ex: 192.168.1.100) : " RASPBERRY_IP

    # Valider le format IP
    if ! [[ $RASPBERRY_IP =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$ ]]; then
        echo -e "${RED}Erreur : Format IP invalide : $RASPBERRY_IP${NC}"
        exit 1
    fi

    echo -e "${GREEN}Format IP validé : $RASPBERRY_IP${NC}"
    echo ""
    echo "Test de connectivité en cours..."
fi

# Test 1 : Ping
echo -n "  • Ping du Raspberry Pi... "
if ping -c 1 -W 2 "$RASPBERRY_IP" > /dev/null 2>&1; then
    echo -e "${GREEN}${NC}"
else
    echo -e "${YELLOW}${NC}"
    echo -e "${YELLOW}Attention : Le Raspberry Pi ne répond pas au ping${NC}"
fi

# Test 2 : Vérifier si SSH est accessible (port 22)
echo -n "  • Vérification port SSH (22)... "
if timeout 2 bash -c "echo >/dev/tcp/$RASPBERRY_IP/22" > /dev/null 2>&1; then
    echo -e "${GREEN}${NC}"
else
    echo -e "${YELLOW}${NC}"
    echo -e "${YELLOW}Attention : Le port SSH (22) n'est pas accessible${NC}"
fi

# Test 3 : Vérifier la validité des chiffres de l'IP
IFS='.' read -ra OCTETS <<< "$RASPBERRY_IP"
IP_VALID=true
for OCTET in "${OCTETS[@]}"; do
    if (( OCTET > 255 )); then
        IP_VALID=false
        break
    fi
done

if [ "$IP_VALID" = false ]; then
    echo -e "${RED}Erreur : Octet IP invalide (doit être <= 255)${NC}"
    exit 1
fi

echo -e "${GREEN}Validation complète de l'IP : $RASPBERRY_IP${NC}"

# Créer le fichier .env.production si n'existe pas
ENV_PROD_FILE="$PROJECT_ROOT/docker/.env.production"
if [ ! -f "$ENV_PROD_FILE" ]; then
    echo ""
    echo -e "${YELLOW}Création du fichier .env.production...${NC}"
    
    if [ -f "$PROJECT_ROOT/docker/.env.production.example" ]; then
        cp "$PROJECT_ROOT/docker/.env.production.example" "$ENV_PROD_FILE"
    else
        # Créer le fichier par défaut s'il n'existe pas
        cat > "$ENV_PROD_FILE" <<EOF
# ==========================================
# CONFIGURATION DE PRODUCTION
# ==========================================

# Base de données PostgreSQL
POSTGRES_USER=l2a_user
POSTGRES_PASSWORD=ChangeMeToASecureRandomPassword123!
POSTGRES_DB=l2a_production
POSTGRES_HOST=db
POSTGRES_PORT=5432

# Flask
FLASK_ENV=production
FLASK_DEBUG=0
SECRET_KEY=ChangeMeToAVeryLongRandomSecretKey123456789!

# Port d'accès externe (Raspberry Pi)
APP_PORT=15256

# URLs WebSocket et Backend
VITE_BACKEND_URL=http://$RASPBERRY_IP:15256/api
VITE_WS_URL=ws://$RASPBERRY_IP:15256/ws
EOF
    fi
fi

# Remplacer les URLs dans le fichier .env.production avec l'IP fournie
sed -i "s|VITE_BACKEND_URL=.*|VITE_BACKEND_URL=http://$RASPBERRY_IP:15256/api|g" "$ENV_PROD_FILE"
sed -i "s|VITE_WS_URL=.*|VITE_WS_URL=ws://$RASPBERRY_IP:15256/ws|g" "$ENV_PROD_FILE"

echo -e "${GREEN}Fichier .env.production créé/modifié avec succès${NC}"
echo ""

echo ""
echo "========================================="
echo "Étape 1 : Build Frontend"
echo "========================================="

# Vérifier si .env.production existe
if [ ! -f "$PROJECT_ROOT/frontend/.env.production" ]; then
    echo -e "${YELLOW}Fichier .env.production non trouvé.${NC}"
    echo "Copie de .env.production.example..."
    if [ -f "$PROJECT_ROOT/frontend/.env.production.example" ]; then
        cp "$PROJECT_ROOT/frontend/.env.production.example" "$PROJECT_ROOT/frontend/.env.production"
    fi
    
    # Remplacer les URLs dans .env.production avec l'IP fournie
    sed -i "s|VITE_BACKEND_URL=.*|VITE_BACKEND_URL=http://$RASPBERRY_IP:15256/api|g" "$PROJECT_ROOT/frontend/.env.production"
    sed -i "s|VITE_WS_URL=.*|VITE_WS_URL=ws://$RASPBERRY_IP:15256/ws|g" "$PROJECT_ROOT/frontend/.env.production"
    
    echo -e "${GREEN}Fichier .env.production configuré${NC}"
fi

echo ""
echo "Installation des dépendances frontend..."
cd "$PROJECT_ROOT/frontend"
npm install

echo ""
echo "Build de l'application..."
npm run build

echo ""
echo -e "${GREEN} Build frontend terminé avec succès !${NC}"

echo ""
echo "========================================="
echo "Étape 2 : Déploiement Docker"
echo "========================================="

cd "$PROJECT_ROOT/docker"

echo ""
echo "2)  Vérification de la configuration produc..."

# Le fichier .env.production a déjà été créé à l'étape 0
if [ ! -f ".env.production" ]; then
    echo -e "${RED}Erreur : Fichier .env.production non trouvé${NC}"
    exit 1
fi

# Charger les variables d'environnement depuis .env.production
set -a
source .env.production
set +a

echo -e "${GREEN}Configuration produc chargée${NC}"

echo ""
echo "3)  Arrêt des conteneurs existants..."
docker compose -f docker-compose.prod.yml --env-file .env.production down

echo ""
echo "4)  Construction des images..."
docker compose -f docker-compose.prod.yml --env-file .env.production build --no-cache

echo ""
echo "5)  Démarrage des services..."
docker compose -f docker-compose.prod.yml --env-file .env.production up -d

echo ""
echo "6)  Attente du démarrage de la base de données..."
sleep 10

echo ""
echo "7)  Initialisation de la base de données..."
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T backend python init_db/db_init.py

echo ""
echo "8)  Vérification du statut des services..."
docker compose -f docker-compose.prod.yml --env-file .env.production ps

echo ""
echo -e "${GREEN}=========================================="
echo "Déploiement terminé avec succès !"
echo "==========================================${NC}"
echo ""
echo "L'application est accessible sur :"
echo -e "  ${GREEN}http://$RASPBERRY_IP:${APP_PORT:-15256}${NC}"
echo ""
echo "Commandes utiles :"
echo "  - Voir les logs : cd docker && docker compose -f docker-compose.prod.yml logs -f"
echo "  - Arrêter : cd docker && docker compose -f docker-compose.prod.yml down"
echo "  - Redémarrer : cd docker && docker compose -f docker-compose.prod.yml restart"
echo ""
echo "Configuration sauvegardée dans : $ENV_PROD_FILE"
echo ""
