# 📊 ESTRUTURA DE ARMAZENAMENTO DOS PEDIDOS - CHIVA E-COMMERCE

## 🏗️ Resumo da Arquitetura

O sistema de pedidos da Chiva utiliza **PostgreSQL** como banco de dados principal, com duas tabelas centrais:

### 🗃️ Tabela Principal: `cart_order`
**Armazena todos os pedidos do sistema**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | bigint | Chave primária única |
| `order_number` | varchar | Número visível (ex: CHV202510030085) |
| `user_id` | integer | FK para auth_user |
| `total_amount` | numeric | Valor total do pedido |
| `status` | varchar | Estado: pending, paid, shipped, delivered, cancelled, refunded |
| `shipping_address` | jsonb | Endereço de entrega (JSON) |
| `billing_address` | jsonb | Endereço de cobrança (JSON) |
| `shipping_method` | varchar | Método: standard, express |
| `shipping_cost` | numeric | Custo do frete |
| `tracking_number` | varchar | Número de rastreamento |
| `estimated_delivery` | date | Data estimada de entrega |
| `delivered_at` | timestamp | Data/hora da entrega |
| `notes` | text | Notas internas |
| `customer_notes` | text | Observações do cliente |
| `created_at` | timestamp | Data de criação |
| `updated_at` | timestamp | Data da última atualização |

### 💳 Tabela de Pagamentos: `cart_payment`
**Armazena informações de pagamento para cada pedido**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | bigint | Chave primária única |
| `order_id` | bigint | FK para cart_order |
| `method` | varchar | Método: mpesa, visa, paypal |
| `amount` | numeric | Valor do pagamento |
| `currency` | varchar | Moeda (MZN, USD) |
| `status` | varchar | Estado: pending, paid, failed, refunded |
| `paysuite_reference` | varchar | Referência PaySuite |
| `raw_response` | jsonb | Resposta completa da API (JSON) |
| `created_at` | timestamp | Data de criação |
| `updated_at` | timestamp | Data da última atualização |

## 🔗 Relacionamentos

```
auth_user (1) ──────── (N) cart_order (1) ──────── (N) cart_payment
    ↑                         ↑                          ↑
 Usuário                   Pedido                   Pagamentos
```

- **1 usuário** pode ter **N pedidos**
- **1 pedido** pode ter **N pagamentos** (parciais, estornos, etc.)

## 🔄 Ciclo de Vida do Pedido

```
pending → paid → shipped → delivered
   ↓        ↓
cancelled  refunded
```

## 📊 Estado Atual do Sistema

### Estatísticas dos Pedidos:
- **Total de pedidos**: 85
- **Receita total**: $174,173.88
- **Distribuição**:
  - 75 pedidos `pending` (88.2%)
  - 10 pedidos `paid` (11.8%)

### Estatísticas dos Pagamentos:
- **Total de pagamentos**: 84
- **Distribuição**:
  - 55 pagamentos `pending` (65.5%)
  - 20 pagamentos `initiated` (23.8%)
  - 5 pagamentos `completed` (6.0%)
  - 4 pagamentos `paid` (4.8%)

## 🎯 Exemplo de Pedido Real

```
📦 Pedido: #CHV202510030085
   Usuário: jsabonete09@gmail.com
   Status: paid
   Total: $6,000.00
   Criado: 2025-10-03 17:20:44
   
💳 Pagamento:
   - mpesa: $6,000.00 (paid)
```

## 🔧 APIs Disponíveis

- **`/api/cart/orders/`** - Lista pedidos do usuário atual ✅
- **`/api/cart/admin/orders/`** - Lista todos os pedidos (admin) ⚠️ 

## 📁 Localização dos Arquivos

- **Modelos**: `backend/cart/models.py`
- **APIs**: `backend/cart/views.py`
- **Frontend**: `frontend/src/pages/OrdersManagement.tsx`

---

*Este documento foi gerado automaticamente baseado na estrutura atual do banco de dados da Chiva E-commerce.*