#!/bin/bash
# Script unifié de build et déploiement pour Raspberry Pi
# Utilisation: ./deploy-prod.sh

set -e

echo "=========================================="
echo "  Build & Déploiement Production"
echo "  Raspberry Pi"
echo "=========================================="

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Se placer à la racine du projet
cd "$(dirname "$0")/.."
PROJECT_ROOT=$(pwd)

echo ""
echo "========================================="
echo " 🏗️  Étape 1 : Build Frontend"
echo "========================================="

# Vérifier si .env.production existe
if [ ! -f "$PROJECT_ROOT/frontend/.env.production" ]; then
    echo -e "${YELLOW}⚠️  Fichier .env.production non trouvé.${NC}"
    echo "   Copie de .env.production.example..."
    if [ -f "$PROJECT_ROOT/frontend/.env.production.example" ]; then
        cp "$PROJECT_ROOT/frontend/.env.production.example" "$PROJECT_ROOT/frontend/.env.production"
    fi
    echo ""
    echo -e "${RED}⚠️  IMPORTANT : Modifiez .env.production avec l'IP de votre Raspberry Pi !${NC}"
    echo "   Exemple : VITE_WS_URL=ws://192.168.1.100:15256/ws"
    echo ""
    read -p "Appuyez sur Entrée pour continuer après avoir modifié le fichier..."
fi

echo ""
echo "📦 Installation des dépendances frontend..."
cd "$PROJECT_ROOT/frontend"
npm install

echo ""
echo "🔨 Build de l'application..."
npm run build

echo ""
echo -e "${GREEN}✅ Build frontend terminé avec succès !${NC}"

echo ""
echo "========================================="
echo " 🚀 Étape 2 : Déploiement Docker"
echo "========================================="

cd "$PROJECT_ROOT/docker"

# Vérifier si .env existe
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  Fichier .env non trouvé. Copie de .env.prod.example...${NC}"
    if [ -f ".env.prod.example" ]; then
        cp .env.prod.example .env
    fi
    echo -e "${RED}⚠️  IMPORTANT : Modifiez le fichier .env avec vos valeurs sécurisées !${NC}"
    echo -e "${YELLOW}   Arrêt du script. Relancez après avoir configuré .env${NC}"
    exit 1
fi

# Charger les variables d'environnement
set -a
source .env
set +a

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
docker compose -f docker-compose.prod.yml exec -T backend python init_db/db_init.py

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
echo "  - Voir les logs : cd docker && docker compose -f docker-compose.prod.yml logs -f"
echo "  - Arrêter : cd docker && docker compose -f docker-compose.prod.yml down"
echo "  - Redémarrer : cd docker && docker compose -f docker-compose.prod.yml restart"
echo ""
