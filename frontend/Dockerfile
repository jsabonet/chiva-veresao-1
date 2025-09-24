FROM node:20-bullseye as build
ARG BUILD_FRONTEND=true
WORKDIR /app

# Dependências nativas para SWC
RUN apt-get update && apt-get install -y \
    build-essential \
    python3 \
    libc6-dev \
    && rm -rf /var/lib/apt/lists/*

COPY dist /app/dist
COPY package.json ./
COPY .env.local .env
COPY src/ ./src/
COPY index.html ./
COPY public/ ./public/
COPY tsconfig.json ./
COPY vite.config.ts ./

RUN if [ "$BUILD_FRONTEND" = "true" ]; then \
      npm install --legacy-peer-deps --silent && \
      npm run build; \
    else \
      echo "Skipping frontend build inside Docker (BUILD_FRONTEND=false)"; \
    fi

FROM nginx:stable
COPY --from=build /app/dist /usr/share/nginx/html
COPY deploy/nginx/default.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
