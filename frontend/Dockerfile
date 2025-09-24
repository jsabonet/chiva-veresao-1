FROM node:20-bullseye as build
ARG BUILD_FRONTEND=true
WORKDIR /app
ENV NPM_CONFIG_OPTIONAL=false
# If you ran `npm run build` on the host and created a ./dist folder, Docker will copy it
# here and skip the in-image build when BUILD_FRONTEND=false. This avoids native optional
# binary issues in some environments.
COPY dist /app/dist

# Copy project files. Do NOT copy package-lock.json so `npm install --no-optional` will
# generate modules without optional native binaries that can fail in some container platforms.
COPY package.json ./
# Copy environment file so Vite has VITE_* values at build time. Use .env.local in the frontend folder.
COPY .env.local .env
COPY src/ ./src/
COPY index.html ./
COPY public/ ./public/
COPY tsconfig.json ./
COPY vite.config.ts ./

# Run build only when requested. If BUILD_FRONTEND=false and a dist/ was present in the context,
# the copied dist will be used.
RUN if [ "$BUILD_FRONTEND" = "true" ]; then \
        npm ci --silent && npm run build; \
    else \
        echo "Skipping frontend build inside Docker (BUILD_FRONTEND=false)"; \
    fi

FROM nginx:stable
COPY --from=build /app/dist /usr/share/nginx/html
COPY deploy/nginx/default.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
