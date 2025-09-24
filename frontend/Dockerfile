FROM node:20-alpine as build
WORKDIR /app
# Copy project files
COPY package.json package-lock.json* ./
COPY .npmrc ./
# Copy environment file so Vite has VITE_* values at build time
COPY .env ./
COPY src/ ./src/
COPY index.html ./
COPY public/ ./public/
COPY tsconfig.json ./
COPY vite.config.ts ./
RUN npm ci --silent
RUN npm run build

FROM nginx:stable-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY deploy/nginx/default.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
