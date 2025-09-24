# Deployment guide (Docker / DigitalOcean)

This repository contains Dockerfiles and a `docker-compose.yml` to run the full stack locally or on a server (DigitalOcean App Platform / Droplet).

Quick steps (Droplet with Docker):

1. Copy `.env.example` to `.env` and fill values.
2. Build and start services:

```powershell
# from repo root
docker compose up --build -d
```

3. The frontend will be available on port 80. The backend on port 8000.

Notes:
- Ensure you change `SECRET_KEY` and `ALLOWED_HOSTS` for production.
- Consider using a managed Postgres database in production and point `DB_HOST` accordingly.
- Add HTTPS termination (DigitalOcean Load Balancer or nginx + certbot) before exposing to users.
