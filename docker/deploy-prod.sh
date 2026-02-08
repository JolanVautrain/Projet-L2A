#!/bin/bash
# Script de déploiement pour Raspberry Pi
# Utilisation: ./deploy-prod.sh

set -e

echo "=========================================="
echo "  Déploiement Production - Raspberry Pi"
echo "=========================================="

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Vérifier si .env existe
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  Fichier .env non trouvé. Copie de .env.prod.example...${NC}"
    cp .env.prod.example .env
    echo -e "${RED}⚠️  IMPORTANT : Modifiez le fichier .env avec vos valeurs sécurisées !${NC}"
    echo -e "${YELLOW}   Arrêt du script. Relancez après avoir configuré .env${NC}"
    exit 1
fi

# Charger les variables d'environnement
set -a
source .env
set +a

echo ""
echo "1️⃣  Construction du frontend..."
cd ../frontend
npm install
npm run build
cd ../docker

echo ""
echo "2️⃣  Arrêt des conteneurs existants..."
docker compose -f docker-compose.prod.yml down

echo ""
echo "3️⃣  Construction des images..."
docker compose -f docker-compose.prod.yml build --no-cache

echo ""
echo "4️⃣  Démarrage des services..."
docker compose -f docker-compose.prod.yml up -d

echo ""
echo "5️⃣  Attente du démarrage de la base de données..."
sleep 10

echo ""
echo "6️⃣  Initialisation de la base de données..."
docker compose -f docker-compose.prod.yml exec -T backend python -c "
from backend.core.db import initialize_database
initialize_database()
print('Base de données initialisée avec succès')
"

echo ""
echo "7️⃣  Vérification du statut des services..."
docker compose -f docker-compose.prod.yml ps

echo ""
echo -e "${GREEN}=========================================="
echo "  ✅ Déploiement terminé avec succès !"
echo "==========================================${NC}"
echo ""
echo "L'application est accessible sur :"
echo -e "  ${GREEN}http://$(hostname -I | awk '{print $1}'):${APP_PORT:-15256}${NC}"
echo ""
echo "Commandes utiles :"
echo "  - Voir les logs : docker compose -f docker-compose.prod.yml logs -f"
echo "  - Arrêter : docker compose -f docker-compose.prod.yml down"
echo "  - Redémarrer : docker compose -f docker-compose.prod.yml restart"
echo ""
