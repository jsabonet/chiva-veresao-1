# Sistema de Perfil e Endereços - Implementação Completa

## 📋 Resumo

Implementado sistema completo de gestão de perfil do usuário e endereços de entrega, com sincronização automática com o checkout. O sistema permite que os usuários salvem múltiplos endereços, definam um padrão, e usem essas informações durante o processo de compra.

## 🎯 Funcionalidades Implementadas

### Backend

#### 1. **Modelo CustomerAddress** (`backend/customers/models.py`)
```python
class CustomerAddress(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='addresses')
    label = models.CharField(max_length=50, blank=True)  # Casa, Trabalho, Outro
    name = models.CharField(max_length=255)
    phone = models.CharField(max_length=30)
    address = models.CharField(max_length=255)
    city = models.CharField(max_length=100)
    province = models.CharField(max_length=100)
    postal_code = models.CharField(max_length=20, blank=True)
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

**Recursos:**
- Primeiro endereço automaticamente marcado como padrão
- Apenas um endereço padrão por usuário (validação automática)
- Ordenação por padrão e data de criação

#### 2. **API Endpoints** (`backend/customers/views.py` e `urls.py`)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/customers/me/addresses/` | Lista todos endereços do usuário |
| POST | `/api/customers/me/addresses/` | Cria novo endereço |
| GET | `/api/customers/me/addresses/{id}/` | Detalhes de um endereço |
| PUT | `/api/customers/me/addresses/{id}/` | Atualiza endereço |
| DELETE | `/api/customers/me/addresses/{id}/` | Remove endereço |
| POST | `/api/customers/me/addresses/{id}/set-default/` | Define endereço como padrão |
| GET/PUT | `/api/customers/me/profile/` | Perfil com defaultAddress |

#### 3. **Melhorias no Endpoint de Perfil**

**GET /api/customers/me/profile/**
```json
{
  "name": "João Silva",
  "email": "joao@example.com",
  "phone": "+258 84 123 4567",
  "defaultAddress": {
    "id": 1,
    "label": "Casa",
    "name": "João Silva",
    "phone": "+258 84 123 4567",
    "address": "Rua 123, Bairro X",
    "city": "Maputo",
    "province": "Maputo",
    "postal_code": "1100",
    "is_default": true
  }
}
```

**PUT /api/customers/me/profile/**
- Permite atualização de `displayName` e `phone`
- Retorna dados completos incluindo `defaultAddress`

#### 4. **Configuração de Admin**
- Adicionado `chivacomputer@gmail.com` à lista `FIREBASE_ADMIN_EMAILS`
- Registrado `CustomerAddress` no Django Admin
- Interface de gestão com filtros por província, padrão, data

### Frontend

#### 1. **AccountProfile.tsx** - Perfil do Usuário

**Recursos:**
- ✅ Carregamento de dados do backend via API
- ✅ Campo de nome editável
- ✅ Campo de telefone editável
- ✅ Email (somente leitura)
- ✅ Exibição do endereço padrão
- ✅ Link para gerenciar endereços
- ✅ Loading states e error handling
- ✅ Toast notifications para sucesso/erro
- ✅ Save real com PUT ao backend

**Exemplo de Uso:**
```tsx
// Carrega perfil automaticamente
useEffect(() => {
  loadProfile();
}, []);

// Save com feedback
const handleSave = async () => {
  await apiClient.put('/customers/me/profile/', {
    displayName: profile.name,
    phone: profile.phone
  });
  toast({ title: 'Sucesso', description: 'Perfil atualizado!' });
};
```

#### 2. **AccountAddresses.tsx** - Gestão de Endereços

**Recursos:**
- ✅ Lista todos endereços do usuário
- ✅ Badge "Padrão" no endereço default
- ✅ Grid responsivo (1 coluna mobile, 2 desktop)
- ✅ Dialog de Add/Edit com formulário completo
- ✅ Validação de campos obrigatórios
- ✅ Seletor de província (todas as 10 províncias de Moçambique)
- ✅ Seletor de tipo (Casa, Trabalho, Outro) com ícones
- ✅ Checkbox "Definir como padrão"
- ✅ Botão "Tornar Padrão" para endereços não-padrão
- ✅ Botão "Editar" abre dialog pré-preenchido
- ✅ Botão "Remover" com confirmação (AlertDialog)
- ✅ Estado vazio com CTA para adicionar primeiro endereço
- ✅ Loading states

**Fluxo de Uso:**
1. Usuário clica "Adicionar Endereço"
2. Preenche formulário (nome, telefone, endereço, cidade, província)
3. Opcionalmente marca como padrão
4. Salva → POST `/api/customers/me/addresses/`
5. Lista atualiza automaticamente

#### 3. **Checkout.tsx** - Integração com Endereços

**Recursos:**
- ✅ Carrega endereços salvos ao entrar no checkout
- ✅ Selector "Usar Endereço Salvo" no topo do formulário
- ✅ Pre-fill automático do endereço padrão
- ✅ Opção "Novo Endereço" no selector
- ✅ Checkbox "Salvar este endereço para compras futuras" (só aparece para novos endereços)
- ✅ Save automático ao finalizar pedido se checkbox marcado
- ✅ Continua fluxo normal mesmo se save falhar

**Exemplo de Integração:**
```tsx
// Carrega endereços salvos
useEffect(() => {
  if (currentUser) {
    loadSavedAddresses();
  }
}, [currentUser]);

// Pre-fill automático do default
const defaultAddress = savedAddresses.find(addr => addr.is_default);
if (defaultAddress) {
  handleSelectSavedAddress(defaultAddress.id);
}

// Save ao finalizar pedido
if (saveNewAddress && currentUser && selectedAddressId === null) {
  await apiClient.post('/customers/me/addresses/', {
    label: 'Checkout',
    ...shippingAddress,
    is_default: savedAddresses.length === 0
  });
}
```

## 🔄 Fluxo de Uso Completo

### Cenário 1: Primeiro Uso
1. Usuário vai para **Checkout**
2. Preenche dados de entrega
3. Marca "Salvar este endereço para compras futuras"
4. Finaliza pedido → Endereço salvo automaticamente como padrão
5. Próxima compra: formulário já vem preenchido ✨

### Cenário 2: Múltiplos Endereços
1. Usuário vai para **Meu Perfil** → **Gerenciar Endereços**
2. Clica "Adicionar Endereço"
3. Adiciona endereço "Trabalho"
4. Adiciona endereço "Casa" e marca como padrão
5. No **Checkout**: selector aparece com opções
6. Seleciona "Trabalho" → formulário preenche automaticamente

### Cenário 3: Editar Endereço
1. Usuário vai para **Endereços**
2. Clica "Editar" no endereço "Casa"
3. Altera cidade de "Maputo" para "Matola"
4. Salva → Endereço atualizado
5. Próximo checkout já usa dados atualizados

## 📦 Estrutura de Arquivos

```
backend/
├── customers/
│   ├── models.py              # CustomerAddress model
│   ├── serializers.py         # CustomerAddressSerializer
│   ├── views.py               # address views + updated me_profile
│   ├── urls.py                # address endpoints
│   ├── admin.py               # CustomerAddressAdmin
│   └── migrations/
│       └── 0003_customeraddress.py
└── .env                       # FIREBASE_ADMIN_EMAILS updated

frontend/
├── src/
│   └── pages/
│       ├── account/
│       │   ├── AccountProfile.tsx      # Perfil completo
│       │   └── AccountAddresses.tsx    # Gestão de endereços
│       └── Checkout.tsx                # Integração com endereços
```

## 🧪 Como Testar

### 1. Backend (Local)

```bash
# Aplicar migração
cd backend
python manage.py migrate customers

# Iniciar servidor
python manage.py runserver

# Testar endpoints
# GET endereços
curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/customers/me/addresses/

# POST novo endereço
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"label":"Casa","name":"João Silva","phone":"+258 84 123 4567","address":"Rua 123","city":"Maputo","province":"Maputo","postal_code":"1100","is_default":true}' \
  http://localhost:8000/api/customers/me/addresses/

# GET perfil (deve incluir defaultAddress)
curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/customers/me/profile/
```

### 2. Frontend (Local)

```bash
cd frontend
npm run dev

# Acessar:
# http://localhost:5173/account/profile      → Ver perfil
# http://localhost:5173/account/addresses    → Gerenciar endereços
# http://localhost:5173/checkout             → Testar integração
```

### 3. Fluxo de Teste Completo

1. **Login** com `chivacomputer@gmail.com` (agora tem acesso admin)
2. **Ir para Meu Perfil**:
   - Editar nome e telefone
   - Clicar "Salvar" → Verificar toast de sucesso
3. **Ir para Endereços**:
   - Clicar "Adicionar Endereço"
   - Preencher formulário
   - Salvar como padrão
4. **Adicionar Produto ao Carrinho**
5. **Ir para Checkout**:
   - Verificar que formulário já vem preenchido
   - Testar selector de endereços
   - Testar "Novo Endereço" + checkbox "Salvar"
   - Finalizar pedido
6. **Voltar para Endereços**:
   - Verificar novo endereço apareceu
   - Testar editar
   - Testar "Tornar Padrão"
   - Testar deletar (com confirmação)

## 🚀 Deploy

### Backend
```bash
# SSH no servidor
ssh root@157.230.16.193

# Atualizar código
cd /path/to/versao_1_chiva/backend
git pull origin main

# Aplicar migração
python manage.py migrate customers

# Reiniciar serviço
sudo systemctl restart gunicorn
# OU
docker-compose restart backend
```

### Frontend
- Deploy automático via Cloudflare Pages ao fazer push

## 🎨 Screenshots das Features

### AccountProfile.tsx
- Campo nome editável
- Campo telefone editável
- Card com endereço padrão
- Botão "Gerenciar Endereços"
- Loading skeleton

### AccountAddresses.tsx
- Grid de endereços (badges, ícones)
- Dialog de add/edit
- Seletor de província
- Seletor de tipo (Casa/Trabalho/Outro)
- AlertDialog de confirmação de delete

### Checkout.tsx
- Selector "Usar Endereço Salvo"
- Formulário pre-preenchido
- Checkbox "Salvar endereço"

## 📝 Notas Técnicas

### Validações
- Backend: DRF serializers validam campos obrigatórios
- Frontend: Validação antes de enviar (toast se campos vazios)
- is_default: Apenas um por usuário (lógica no model.save())

### Estados de Loading
- Profile: Skeleton com 3 barras animadas
- Addresses: Skeleton com 2 cards animados
- Checkout: Mantém estrutura existente

### Error Handling
- Try/catch em todas chamadas API
- Toast notifications para feedback
- console.warn para erros não-críticos (ex: falha ao carregar endereços)

### Performance
- Endereços carregados apenas 1x (useEffect com currentUser)
- Re-carregamento após CRUD (loadAddresses())
- Prefere estados locais para UI responsiva

## ✅ Checklist de Implementação

- [x] Modelo CustomerAddress
- [x] Serializers
- [x] Views de CRUD
- [x] URLs
- [x] Migração aplicada
- [x] Admin registrado
- [x] chivacomputer@gmail.com adicionado aos admins
- [x] AccountProfile.tsx completo
- [x] AccountAddresses.tsx completo
- [x] Checkout.tsx integrado
- [x] Testes locais
- [x] Commit e push
- [ ] Deploy backend
- [ ] Testes em produção

## 🐛 Troubleshooting

### Endereços não aparecem
- Verificar token válido
- Verificar migrations aplicadas
- Checar console do navegador para erros

### Checkout não pre-preenche
- Verificar se usuário tem endereço padrão
- Verificar loadSavedAddresses() no useEffect
- Checar se currentUser está disponível

### Save de endereço falha no checkout
- É esperado continuar o fluxo mesmo com falha (console.warn)
- Não bloqueia finalização do pedido
- Usuário pode salvar depois manualmente

## 🔮 Melhorias Futuras (Opcionais)

- [ ] Validação de formato de telefone
- [ ] Autocomplete de endereço (Google Maps API)
- [ ] Múltiplos telefones por endereço
- [ ] Campo "instruções de entrega"
- [ ] Compartilhamento de endereços (contas business)
- [ ] Histórico de entregas por endereço
- [ ] Sugestão de endereço baseado em geolocalização

---

**Implementado por:** GitHub Copilot  
**Data:** 22 de Outubro de 2025  
**Commit:** `5edff0d`  
**Status:** ✅ Completo e testado localmente
