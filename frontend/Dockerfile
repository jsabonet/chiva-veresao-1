# ========================
# Build do frontend
# ========================
FROM node:20-bullseye AS build

ARG BUILD_FRONTEND=true
WORKDIR /app

# Evita instalar dependências opcionais que podem quebrar o build
ENV NPM_CONFIG_OPTIONAL=false

# Instala ferramentas de compilação necessárias para binários nativos
RUN apt-get update && apt-get install -y \
    build-essential \
    python3 \
    libc6-dev \
    && rm -rf /var/lib/apt/lists/*

# Copiar arquivos essenciais para o build
COPY package.json ./ 
COPY package-lock.json ./ 
COPY .env.local .env
COPY tsconfig*.json ./
COPY vite.config.ts ./
COPY src/ ./src/
COPY public/ ./public/
COPY index.html ./

# Rodar build somente se BUILD_FRONTEND=true
RUN if [ "$BUILD_FRONTEND" = "true" ]; then \
      # Use package-lock.json for reproducible installs when present, and omit optional
      # dependencies (native optional binaries) which often fail in container builds.
      if [ -f package-lock.json ]; then \
        npm ci --omit=optional --silent || true; \
      else \
        npm install --no-optional --silent || true; \
      fi; \
      # Try build; if it fails due to missing native rollup binary, attempt to
      # install the linux native rollup package and retry once.
      if npm run build; then \
        echo "Build succeeded"; \
      else \
        echo "Initial build failed — attempting to install @rollup/rollup-linux-x64-gnu and retry"; \
        npm install @rollup/rollup-linux-x64-gnu --silent || true; \
        npm run build; \
      fi; \
    else \
      echo "Skipping frontend build inside Docker (BUILD_FRONTEND=false)"; \
    fi

# ========================
# Servidor Nginx
# ========================
FROM nginx:stable

# Copiar build do frontend
COPY --from=build /app/dist /usr/share/nginx/html

# Configuração personalizada do Nginx
COPY deploy/nginx/default.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
