# ---- Build stage ----
FROM node:20-alpine AS build

WORKDIR /app

# Build argument to control whether we run the production build
ARG BUILD_ENV=production

# Install dependencies first (better layer caching)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source
COPY . .

# Only run the production build when BUILD_ENV=production
RUN if [ "$BUILD_ENV" = "production" ]; then \
			npm run build; \
		else \
			echo "Skipping production build (BUILD_ENV=$BUILD_ENV)"; \
		fi

# Default command starts dev server (dev compose overrides command)
CMD [ "npm", "run", "dev" ]
