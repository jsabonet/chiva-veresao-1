FROM node:20-bullseye as build
WORKDIR /app
ENV NPM_CONFIG_OPTIONAL=false
# prevent npm from fetching optional native binaries (rollup native)
# Copy project files. Do NOT copy package-lock.json so `npm install --no-optional` will
# generate modules without optional native binaries that can fail in some container platforms.
COPY package.json ./
# If you have an .npmrc, add it to the frontend context; otherwise skip copying it
# Copy environment file so Vite has VITE_* values at build time. Use .env.local in the frontend folder.
# We copy .env.local as .env so Vite picks up VITE_* variables at build time
COPY .env.local .env
COPY src/ ./src/
COPY index.html ./
COPY public/ ./public/
COPY tsconfig.json ./
COPY vite.config.ts ./
RUN npm install --silent --no-optional
RUN npm run build

FROM nginx:stable
COPY --from=build /app/dist /usr/share/nginx/html
COPY deploy/nginx/default.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
