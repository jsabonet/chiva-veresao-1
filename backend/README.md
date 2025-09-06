# Chiva Store Backend

Backend da loja de computadores Chiva desenvolvido com Django e Django REST Framework.

## 🚀 Configuração do Ambiente

### Pré-requisitos

1. **Python 3.9+**
2. **PostgreSQL 12+**
3. **pip** (gerenciador de pacotes Python)

### 📋 Instalação

1. **Clone o repositório e navegue para o backend:**
```bash
cd backend
```

2. **Crie um ambiente virtual:**
```bash
python -m venv venv
```

3. **Ative o ambiente virtual:**
```bash
# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate
```

4. **Instale as dependências:**
```bash
pip install -r requirements.txt
```

## 🗄️ Configuração do PostgreSQL

### Instalação do PostgreSQL

**Windows:**
1. Baixe o PostgreSQL do site oficial: https://www.postgresql.org/download/windows/
2. Execute o instalador e siga as instruções
3. Lembre-se da senha do usuário `postgres`

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

**macOS (com Homebrew):**
```bash
brew install postgresql
brew services start postgresql
```

### Configuração do Banco de Dados

1. **Configure as variáveis de ambiente:**
   
   Edite o arquivo `.env` na raiz do backend:
```env
# Database Configuration
DB_NAME=chiva_db
DB_USER=postgres
DB_PASSWORD=sua_senha_aqui
DB_HOST=localhost
DB_PORT=5432

# Security
SECRET_KEY=sua-chave-secreta-aqui
DEBUG=True

# CORS Settings
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

2. **Execute o script de configuração do banco:**
```bash
python setup_database.py
```

3. **Execute as migrações:**
```bash
python manage.py makemigrations
python manage.py migrate
```

4. **Crie um superusuário:**
```bash
python manage.py createsuperuser
```

## 🏃‍♂️ Executando o Servidor

```bash
python manage.py runserver
```

O servidor estará disponível em: http://127.0.0.1:8000/

## 📚 Documentação da API

Após iniciar o servidor, acesse:

- **Swagger UI:** http://127.0.0.1:8000/api/docs/
- **ReDoc:** http://127.0.0.1:8000/api/redoc/
- **Schema JSON:** http://127.0.0.1:8000/api/schema/

## 🛠️ Endpoints da API

### Produtos
- `GET /api/products/` - Lista todos os produtos
- `POST /api/products/` - Cria um novo produto
- `GET /api/products/{id}/` - Detalhes do produto por ID
- `GET /api/products/slug/{slug}/` - Detalhes do produto por slug
- `PUT/PATCH /api/products/{id}/` - Atualiza produto
- `DELETE /api/products/{id}/` - Remove produto

### Categorias
- `GET /api/categories/` - Lista todas as categorias
- `POST /api/categories/` - Cria uma nova categoria
- `GET /api/categories/{id}/` - Detalhes da categoria
- `PUT/PATCH /api/categories/{id}/` - Atualiza categoria
- `DELETE /api/categories/{id}/` - Remove categoria

### Produtos Especiais
- `GET /api/products/featured/` - Produtos em destaque
- `GET /api/products/bestsellers/` - Produtos mais vendidos
- `GET /api/products/on-sale/` - Produtos em promoção
- `GET /api/products/category/{id}/` - Produtos por categoria

### Estatísticas
- `GET /api/products/stats/` - Estatísticas do sistema

## 🔧 Comandos Úteis

### Resetar banco de dados:
```bash
python manage.py flush
python manage.py migrate
python manage.py createsuperuser
```

### Carregar dados de exemplo:
```bash
python manage.py loaddata fixtures/categories.json
python manage.py loaddata fixtures/products.json
```

### Criar migrações:
```bash
python manage.py makemigrations
```

### Aplicar migrações:
```bash
python manage.py migrate
```

## 🧪 Testes

```bash
python manage.py test
```

## 📦 Estrutura do Projeto

```
backend/
├── chiva_backend/          # Configurações do projeto
│   ├── settings.py
│   ├── urls.py
│   └── wsgi.py
├── products/               # App de produtos
│   ├── models.py          # Modelos de dados
│   ├── serializers.py     # Serializers da API
│   ├── views.py           # Views da API
│   ├── urls.py            # URLs do app
│   └── admin.py           # Interface admin
├── media/                  # Arquivos de mídia
├── requirements.txt        # Dependências
├── .env                   # Variáveis de ambiente
└── manage.py              # Utilitário Django
```

## 🔐 Variáveis de Ambiente

| Variável | Descrição | Padrão |
|----------|-----------|---------|
| `DB_NAME` | Nome do banco de dados | `chiva_db` |
| `DB_USER` | Usuário do banco | `postgres` |
| `DB_PASSWORD` | Senha do banco | _(vazio)_ |
| `DB_HOST` | Host do banco | `localhost` |
| `DB_PORT` | Porta do banco | `5432` |
| `SECRET_KEY` | Chave secreta Django | _(auto-gerada)_ |
| `DEBUG` | Modo debug | `True` |
| `CORS_ALLOWED_ORIGINS` | Origens permitidas CORS | `http://localhost:5173` |

## 🤝 Contribuição

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.
