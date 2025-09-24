Param(
  [string]$EnvFile = ".env"
)

if (-not (Test-Path $EnvFile)) {
  Write-Error "Env file $EnvFile not found. Copy .env.example to .env and edit it first."
  exit 1
}

Write-Host "Building backend image (using requirements.prod.txt)"
docker build --build-arg REQUIREMENTS=prod -t chiva-backend:prod ./backend

Write-Host "Bringing up docker compose stack"
docker compose up -d --build

Write-Host "Deployment started. Use 'docker compose logs -f' to follow logs."
