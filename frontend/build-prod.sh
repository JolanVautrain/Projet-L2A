#!/bin/bash
# Script de build pour la production
# Ce script doit être exécuté AVANT le déploiement Docker

set -e

echo "========================================="
echo " 🏗️  Build Frontend pour Production"
echo "========================================="

# Se placer dans le dossier frontend
cd "$(dirname "$0")"

# Vérifier si .env.production existe
if [ ! -f ".env.production" ]; then
    echo "⚠️  Fichier .env.production non trouvé."
    echo "   Copie de .env.production.example..."
    cp .env.production.example .env.production
    echo ""
    echo "⚠️  IMPORTANT : Modifiez .env.production avec l'IP de votre Raspberry Pi !"
    echo "   Exemple : VITE_WS_URL=ws://192.168.1.100:15256/ws"
    echo ""
    read -p "Appuyez sur Entrée pour continuer après avoir modifié le fichier..."
fi

echo ""
echo "📦 Installation des dépendances..."
npm install

echo ""
echo "🔨 Build de l'application..."
npm run build

echo ""
echo "✅ Build terminé avec succès !"
echo "   Les fichiers sont dans : dist/"
echo ""
echo "Prochaine étape : Exécutez ./docker/deploy-prod.sh"
