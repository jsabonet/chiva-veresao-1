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
