# Chiva Computer — E-commerce com Pagamentos Paysuite

Sistema completo de e-commerce com integração de pagamentos via Paysuite (M-Pesa e e-Mola), gerenciamento de produtos, carrinho de compras, e área administrativa.

## 🚀 Novidades Recentes

### 📧 Sistema de Notificações por Email (Outubro 2025) ⭐ NOVO!

Sistema completo de emails **100% GRATUITO** implementado!

**Funcionalidades:**
- ✅ Confirmação de pedido automática
- ✅ Status de pagamento (aprovado/pendente/falhou)
- ✅ Notificação de envio com tracking
- ✅ Recuperação de carrinho abandonado
- ✅ Notificação de nova venda para admin
- ✅ Templates HTML profissionais e responsivos
- ✅ 300 emails/dia GRÁTIS via Brevo

**📚 Documentação de Emails:**

| Documento | Propósito | Tempo |
|-----------|-----------|-------|
| [📧 EMAIL_QUICKSTART.md](EMAIL_QUICKSTART.md) | Setup rápido (5min) | 5 min |
| [📖 SISTEMA_NOTIFICACOES_EMAIL.md](SISTEMA_NOTIFICACOES_EMAIL.md) | Guia completo | 30 min |
| [🎨 GUIA_VISUAL_BREVO.md](GUIA_VISUAL_BREVO.md) | Passo a passo Brevo | 15 min |
| [💻 EXEMPLOS_USO_EMAILS.md](EXEMPLOS_USO_EMAILS.md) | Código de exemplo | Consulta |
| [📊 RESUMO_EXECUTIVO_EMAILS.md](RESUMO_EXECUTIVO_EMAILS.md) | Visão executiva | 10 min |

**🚀 Setup Rápido:**
```bash
# 1. Criar conta grátis: https://www.brevo.com
# 2. Obter API Key no dashboard
# 3. Configurar .env:
BREVO_API_KEY=sua_api_key_aqui
BREVO_SENDER_EMAIL=seu_email@example.com

# 4. Testar:
cd backend
python test_email_system.py
```

---

### ✅ Sistema de Pagamentos Completo (Outubro 2025)

O sistema de pagamentos está **100% funcional e pronto para produção**!

**Características:**
- ✅ Integração completa com Paysuite Gateway
- ✅ Suporte a M-Pesa e e-Mola
- ✅ Rastreamento em tempo real de status de pagamento
- ✅ UI moderna com feedback visual (aprovado/recusado/pendente)
- ✅ Cart management inteligente (limpa apenas após confirmação)
- ✅ Webhooks configuráveis (dev e produção)
- ✅ Logging completo para debugging

**📚 Documentação Completa:**

| Documento | Para Quem | Tempo |
|-----------|-----------|-------|
| [ÍNDICE.md](INDICE.md) | Todos | 2 min |
| [RESUMO_EXECUTIVO.md](RESUMO_EXECUTIVO.md) | Visão geral rápida | 5 min |
| [NGROK_DEVELOPMENT_SETUP.md](NGROK_DEVELOPMENT_SETUP.md) | Desenvolvimento local | 15 min |
| [PRODUCTION_DEPLOYMENT_GUIDE.md](PRODUCTION_DEPLOYMENT_GUIDE.md) | Deploy produção | 30-60 min |
| [FAQ.md](FAQ.md) | Dúvidas específicas | Consulta |

**🤖 Script Automatizado:**
```powershell
# Inicia ambiente de desenvolvimento com ngrok automaticamente
.\scripts\start-dev-with-ngrok.ps1
```

**Ver:** [INDICE.md](INDICE.md) para navegação completa da documentação.

---

## 📋 Resumo Geral

Este README descreve os passos práticos para testar localmente e subir o projeto em um Droplet no DigitalOcean usando Docker Compose. Contém comandos PowerShell e instruções de configuração.

**Resumo rápido:**
- O repositório já contém Dockerfiles para backend e frontend, um `docker-compose.yml`, e um script auxiliar `scripts/deploy.ps1` que constrói a imagem do backend usando dependências de produção (`requirements.prod.txt`) e sobe a stack.
- Antes de rodar em produção: atualize o `.env` com valores reais (ou use Secrets do DigitalOcean). Não versionar credenciais.
- **NOVO:** Configure `WEBHOOK_BASE_URL` para webhooks do Paysuite funcionarem (ver [PRODUCTION_DEPLOYMENT_GUIDE.md](PRODUCTION_DEPLOYMENT_GUIDE.md))

Pré-requisitos
- Droplet (Ubuntu 22.04+ recomendado) ou máquina local com Docker e Docker Compose.
- Docker e Docker Compose instalados no servidor.
- Registrar domínio e acesso para configurar DNS.

1) Preparar localmente (teste rápido)

1.1 Copiar o exemplo de env e ajustar valores:

```powershell
cd D:\Projectos\versao_1_chiva
cp .env.example .env
notepad .env
# Edite SECRET_KEY, DB_* e ALLOWED_HOSTS conforme necessário
```

1.2 Build e subir via Docker Compose (usa `requirements.prod.txt` para o backend):

```powershell
.\scripts\deploy.ps1
```

O script fará: build do backend (com ARG REQUIREMENTS=prod) e `docker compose up -d --build`.

1.3 Ver logs e checar endpoints:

```powershell
docker compose ps
docker compose logs -f backend
docker compose logs -f frontend
# Acesse no browser: http://localhost (frontend)
# API: http://localhost/api/
```

2) Preparar Droplet (DigitalOcean)

2.1 Crie um droplet (recomendado com espaço suficiente; 2GB+ RAM como mínimo para uma instância básica).

2.2 Instale Docker e Docker Compose no Droplet (exemplo rápido para Ubuntu):

```bash
sudo apt update && sudo apt -y upgrade
sudo apt install -y ca-certificates curl gnupg lsb-release
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
sudo usermod -aG docker $USER
```

2.3 Clonar repositório no Droplet e preparar `.env` (ou usar Secrets):

```bash
git clone https://github.com/<seu-usuario>/chiva-veresao-1.git
cd chiva-veresao-1
cp .env.example .env
nano .env
```

2.4 Build e rodar no Droplet

```bash
docker build --build-arg REQUIREMENTS=prod -t chiva-backend:prod ./backend
docker compose up -d --build
```

3) Banco de dados e migrações
- O entrypoint (`backend/entrypoint.sh`) já tenta aplicar `python manage.py migrate` e `collectstatic`. Se preferir, rode manualmente:

```bash
docker compose exec backend python manage.py migrate --noinput
docker compose exec backend python manage.py createsuperuser
```

4) Configurar domínio e TLS

Opção A — DigitalOcean Load Balancer (recomendado):
- Crie um Load Balancer no painel DO e aponte para o droplet; ative HTTPS e solicite um certificado Let's Encrypt pelo painel.

Opção B — Nginx + Certbot no Droplet:

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
# configurar nginx para proxy (ex.: /etc/nginx/sites-available/chiva.conf)
sudo nginx -t && sudo systemctl restart nginx
sudo certbot --nginx -d seu-dominio.com -d www.seu-dominio.com
```

5) Armazenamento de media (recomendado)
- Evite usar volume de host para `media` em produção. Use DigitalOcean Spaces (compatível S3) com `django-storages`.
- Posso adicionar `django-storages` e configuração de exemplo se desejar.

6) Observações de segurança e produção
- Nunca deixar `DEBUG=True` em produção.
- Use DO Managed Postgres se possível e configure `DB_HOST`/`DB_USER`/`DB_PASSWORD` corretamente.
- Faça backups automáticos do banco e do storage.
- Remova ou separe dependências de ML da imagem do webapp (já criamos `requirements.prod.txt`).

7) Comandos úteis

```powershell
# Subir localmente
.\scripts\deploy.ps1

# Ver status
docker compose ps

# Logs
docker compose logs -f backend
docker compose logs -f frontend

# Entrar no container backend
docker compose exec backend bash

# Rodar migrações manualmente
docker compose exec backend python manage.py migrate --noinput

# Criar superuser
docker compose exec backend python manage.py createsuperuser
```

8) Problemas conhecidos
- O `requirements.txt` original contém pacotes de Machine Learning que tornam o build muito pesado. A imagem do backend foi ajustada para usar por padrão `requirements.prod.txt`. Se você precisa do ML no mesmo container, considere criar uma imagem separada ou usar um runner de CI com recursos suficientes.

Contato / próximos passos
- Posso: (A) adicionar `django-storages` para DigitalOcean Spaces; (B) adicionar script de backup do Postgres; (C) automatizar a emissão de certificados via certbot no `docker-compose` se preferir.

Escolha uma das opções acima e eu implemento a próxima etapa.
# Chiva Computer & Service - Loja de Computadores

## 🖥️ Sobre o Projeto

Site da **Chiva Computer & Service**, loja especializada em produtos de informática em Moçambique. O site apresenta um catálogo completo de computadores, laptops, periféricos e acessórios das melhores marcas do mercado.

## 🎯 Características Principais

### 💻 Produtos em Destaque
- **Laptops & Notebooks**: Desde ultrabooks executivos até laptops gaming
- **Desktops**: PCs personalizados para trabalho e gaming  
- **Monitores**: Telas de alta qualidade para todas as necessidades
- **Periféricos**: Teclados, mouses, webcams e acessórios
- **Componentes**: SSDs, memórias RAM e componentes para upgrade

### ✨ Funcionalidades
- **Páginas individuais** para cada produto com especificações completas
- **Carrinho de compras** integrado
- **Design responsivo** para mobile e desktop
- **Galeria de imagens** para cada produto
- **Autenticação Firebase** (Email/Senha + Google)
- **Área do Cliente** com seções de perfil, pedidos e endereços (estrutura inicial)
- **Recuperação de senha** via email
- **Painel Administrativo protegido**

### 🛠️ Tecnologias Utilizadas
- **Frontend**: React 18 + TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Roteamento**: React Router
- **Icons**: Lucide React
- **Build Tool**: Vite
- **Package Manager**: Bun

## 🚀 Como Executar

### Pré-requisitos
- Node.js 18+ ou Bun
- Git

### Instalação e Execução
```bash
# Clonar o repositório
git clone [repository-url]

# Navegar para o diretório
cd versao_1_chiva

# Instalar dependências
bun install
# ou
npm install

# Executar em desenvolvimento
bun run dev
# ou 
npm run dev

# Acessar o site
http://localhost:8083
```

## 🏗️ Estrutura do Projeto

```
src/
├── components/          # Componentes reutilizáveis
│   ├── layout/         # Header, Footer
│   ├── sections/       # Seções da página (Hero, Products, etc.)
│   └── ui/            # Componentes base (Button, Card, etc.)
├── data/              # Dados dos produtos
├── lib/               # Utilitários (formatPrice, etc.)
├── pages/             # Páginas principais
└── assets/            # Imagens e arquivos estáticos
```

## 📱 Páginas Disponíveis

- **`/`** - Página inicial
- **`/produto/:id`** / **`/products/:id`** - Página de produto
- **`/products`** - Listagem de produtos (filtros futuros)
- **`/carrinho`** - Carrinho de compras
- **Autenticação**: `/login`, `/register`, `/forgot-password`
- **Área do Cliente (autenticado)**: `/account`, `/account/profile`, `/account/orders`, `/account/addresses`
- **Admin (autenticado)**: `/admin` e subseções (produtos, categorias, etc.)
- **`/404`** - Página de erro

## 🛍️ Produtos Disponíveis

### Laptops (IDs 1, 5)
- ASUS VivoBook 15 - Intel i7, 16GB RAM, 512GB SSD
- HP Pavilion 14 - AMD Ryzen 5, 12GB, 1TB

### Desktops (ID 2)
- Desktop Gaming Intel i5 + GTX 1660 Super

### Monitores (ID 3)
- Monitor Samsung 24'' Full HD VA Gaming

### Acessórios (IDs 4, 7)
- Kit Gaming Teclado + Mouse RGB Mecânico
- Webcam Logitech C920 Full HD 1080p

### Outros (IDs 6, 8)
- Impressora 3D Creality Ender 3 V2
- SSD Kingston NV2 500GB NVMe

## 📞 Contato da Empresa

- **Telefone**: +258 87 849 4330
- **Email**: chivacomputer@gmail.com
- **WhatsApp**: +258 87 849 4330
- **Localização**: Moçambique

## 🔧 Funcionalidades Técnicas

### Sistema de Produtos
- Dados centralizados em `src/data/products.ts`
- Interface TypeScript para consistência
- Funções helper para busca e filtragem

### Roteamento Dinâmico
- Páginas individuais baseadas em ID do produto
- Redirecionamento automático para 404 em produtos inexistentes
- Navegação com breadcrumbs

### Design Responsivo
- Mobile-first approach
- Breakpoints otimizados para tablets e desktops
- Componentes adaptativos

## 📈 Próximas Melhorias

- [ ] Histórico real de pedidos do cliente
- [ ] Endereços persistentes (CRUD) vinculados ao usuário
- [ ] Integração com sistema de pagamento
- [ ] Wishlist de produtos
- [ ] Comparação de produtos
- [ ] Sistema de cupons e descontos
- [ ] Upload de avatar do usuário
- [ ] Verificação de email e roles

---

**Chiva Computer & Service** - 15 anos oferecendo tecnologia de qualidade em Moçambique 🇲🇿
