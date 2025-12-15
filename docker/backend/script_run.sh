#!/bin/bash

# on lance le conteneur backend
# on précise le mapping de port 5000:5000, on peut joindre l'application backend via le port 5000 de la machine hôte

# sans montage de volume car le code backend ne va pas changer fréquemment (idéalement pour une application en production)
# docker run --name backend-dev -p 5000:5000 mon-backend

# avec montage de volume pour le code backend (utile en développement si on modifie fréquemment le code)
docker run --name backend-dev -p 5000:5000 -v "$(pwd)/../../api":/app mon-backend