# Firebase Authentication Setup

Este projeto agora usa Firebase Authentication para proteger as rotas administrativas.

## Configuração do Firebase

### 1. Criar projeto no Firebase

1. Acesse [Firebase Console](https://console.firebase.google.com/)
2. Clique em "Adicionar projeto"
3. Siga os passos para criar o projeto
4. Habilite Authentication no projeto:
   - Vá para Authentication > Sign-in method
   - Habilite "Email/Password"
   - (Opcional) Habilite "Google" para permitir login social

#### Ativando Login com Google

1. Em Authentication > Sign-in method, habilite o provedor "Google"
2. Opcional: personalize nome do produto e logotipo em Authentication > Templates / Branding
3. (Se solicitado) Adicione os domínios autorizados (ex: `localhost` e seu domínio de produção)
4. Salve as alterações
5. Nenhuma variável extra é necessária – o SDK usa as existentes
6. Na interface de login e registro agora haverá o botão de Google. O primeiro login com Google cria automaticamente a conta (não é necessário passar pelo formulário). Caso o popup seja bloqueado, o fluxo alterna para redirect automaticamente.

### 2. Configurar variáveis de ambiente

1. Copie o arquivo `.env.example` para `.env`:
```bash
cp .env.example .env
```

2. No Firebase Console, vá em Project Settings > General > Your apps
3. Adicione uma aplicação web se ainda não tiver
4. Copie as configurações do Firebase e substitua no arquivo `.env`:

```env
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

### 3. Executar o projeto

```bash
npm run dev
```

## Como usar a autenticação

### Rotas protegidas
Todas as rotas `/admin/*` agora requerem autenticação:
- `/admin` - Dashboard principal
- `/admin/dashboard` - Analytics
- `/admin/products` - Gestão de produtos
- `/admin/categories` - Gestão de categorias
- `/admin/products/create` - Criar produto
- `/admin/products/edit/:id` - Editar produto
- `/admin/pedidos` - Gestão de pedidos
- `/admin/clientes` - Gestão de clientes
- `/admin/configuracoes` - Configurações

### Páginas de autenticação
- `/login` - Página de login
- `/register` - Página de registro
- `/forgot-password` - Recuperar senha (envia email de redefinição)

### Funcionalidades implementadas
| Status | Funcionalidade |
|--------|----------------|
| ✅ | Login com email/senha |
| ✅ | Login com Google (popup com fallback para redirect) |
| ✅ | Recuperação de senha (reset via email) |
| ✅ | Registro de novos usuários |
| ✅ | Logout |
| ✅ | Proteção de rotas administrativas |
| ✅ | Persistência de sessão |
| ✅ | Validação de formulários |
| ✅ | Tratamento de erros do Firebase |
| ✅ | Interface responsiva |
| ✅ | Integração com layout administrativo |

### Primeiro acesso
1. Acesse `/register` para criar a primeira conta administrativa
2. Faça login em `/login`
3. Acesse o painel administrativo em `/admin`

### Logout
Use o menu do usuário no canto superior direito do painel administrativo para fazer logout.

### Recuperar senha
1. Acesse `/forgot-password`
2. Informe seu email e envie
3. Se o email estiver cadastrado, você receberá um link de redefinição (verifique SPAM)
4. Abra o link e defina uma nova senha

Observação: A mensagem de sucesso é genérica para não revelar se o email existe (boa prática de segurança).

## Segurança

- As senhas são criptografadas pelo Firebase
- As sessões são gerenciadas automaticamente
- Tokens de autenticação são renovados automaticamente
- Rotas protegidas redirecionam para login quando necessário

## Próximos passos (opcionais)

- Configurar regras de segurança no Firestore (se usar banco de dados)
- Adicionar outros provedores sociais (Facebook, GitHub, etc.)
-- (Feito) Implementar reset de senha
- Adicionar verificação de email
- Configurar roles/permissões de usuário
- Auditoria de logins (ex: registrar último acesso)
