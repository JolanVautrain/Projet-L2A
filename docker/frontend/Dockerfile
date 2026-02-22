FROM node:20-slim AS build

WORKDIR /app
ARG BUILD_ENV=production

# mise à jour et nettoyage pour réduire la taille de l'image
RUN apt-get update && apt-get upgrade -y \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN if [ "$BUILD_ENV" = "production" ]; then \
      npm ci --omit=dev; \
    else \
      npm ci; \
    fi

COPY . .

# Build l'application seulement en production pour réduire le temps de build en dev
RUN if [ "$BUILD_ENV" = "production" ]; then \
      npm run build; \
    else \
      echo "Skipping production build (BUILD_ENV=$BUILD_ENV)"; \
    fi

CMD [ "npm", "run", "dev" ]
