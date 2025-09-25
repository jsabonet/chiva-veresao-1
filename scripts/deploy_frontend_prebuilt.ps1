param(
  [Parameter(Mandatory=$true)][string]$Remote, # e.g. root@123.45.67.89
  [int]$Port = 22,
  [string]$SshKey = ""
)

# Usage: .\scripts\deploy_frontend_prebuilt.ps1 -Remote root@1.2.3.4 -Port 22 -SshKey C:\Users\you\.ssh\id_rsa

$root = Split-Path -Parent $MyInvocation.MyCommand.Definition
$repoRoot = Join-Path $root ".."
$frontend = Join-Path $repoRoot "frontend"
$dist = Join-Path $frontend "dist"

Write-Host "Building frontend locally..."
Push-Location $frontend
if (Test-Path node_modules) { Remove-Item node_modules -Recurse -Force }
npm ci
npm run build
Pop-Location

if (-not (Test-Path $dist)) {
  Write-Error "dist not found: $dist"
  exit 1
}

$sshOpts = "-p $Port"
if ($SshKey -ne "") { $sshOpts += " -i `"$SshKey`"" }

Write-Host "Creating backup and copying dist to remote $Remote..."
# create remote backup and directory
ssh $sshOpts $Remote "mkdir -p $frontend; mv $frontend/dist $frontend/dist.bak_$(Get-Date -UFormat %s) || true; mkdir -p $frontend/dist"

# Use tar over ssh: create archive and send
Push-Location $dist
$tarCmd = "tar -czf - . | ssh $sshOpts $Remote `"tar -xzf - -C $frontend/dist`""
Invoke-Expression $tarCmd
Pop-Location

Write-Host "Triggering remote docker compose build and up (BUILD_FRONTEND=false)"
ssh $sshOpts $Remote "cd $repoRoot && docker compose build --no-cache --build-arg BUILD_FRONTEND=false frontend && docker compose up -d frontend"

Write-Host "Deploy finished."