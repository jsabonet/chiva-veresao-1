FROM node:20 as build
WORKDIR /app
# Copy project files
COPY package.json package-lock.json* ./
# If you have an .npmrc, add it to the frontend context; otherwise skip copying it
# Copy environment file so Vite has VITE_* values at build time. Use .env.local in the frontend folder.
# We copy .env.local as .env so Vite picks up VITE_* variables at build time
COPY .env.local .env
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
