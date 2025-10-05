# 🧪 GUIA COMPLETO DE TESTES - E-COMMERCE SEM PAGAMENTOS REAIS

## 🎯 Objetivo
Este guia mostra como testar completamente o sistema de e-commerce **sem processar pagamentos reais**, usando simulações seguras e dados de demonstração.

## 🛡️ Métodos de Teste Disponíveis

### 1. 🎮 **Modo Demo no Frontend**
**O que é:** Interface visual para simular pagamentos
**Como usar:**
1. Acesse http://localhost:5173/checkout
2. Preencha dados de entrega
3. Na seção "Método de Pagamento", ative o **"Modo Demonstração"**
4. Escolha um método de pagamento simulado
5. Clique em "Pagar (Demo)"
6. O sistema simula todo o processo sem cobranças

**Vantagens:**
- ✅ Sem pagamentos reais
- ✅ Interface visual completa
- ✅ Testa frontend + backend
- ✅ Simula diferentes cenários (sucesso/falha)

---

### 2. 🖥️ **Comando Django - Teste Rápido**
**O que é:** Script Python para criar pedidos instantaneamente
**Como usar:**
```bash
cd backend
python criar_pedido_teste.py
```

**Opções avançadas:**
```bash
# Criar 5 pedidos de uma vez
python criar_pedido_teste.py --quantidade 5

# Ver ajuda
python criar_pedido_teste.py --help
```

**Resultado:** Cria pedido completo com pagamento simulado aprovado

---

### 3. 🔬 **Sistema de Testes Completo**
**O que é:** Ferramenta avançada para diferentes cenários
**Como usar:**
```bash
cd backend
python manage.py test_ecommerce_completo --mode demo
```

**Modos disponíveis:**
```bash
# Modo básico (1 pedido)
python manage.py test_ecommerce_completo --mode demo

# Múltiplos pedidos
python manage.py test_ecommerce_completo --mode simulation --orders-count 10

# Teste de performance
python manage.py test_ecommerce_completo --mode stress --orders-count 50
```

**Opções extras:**
```bash
# Email personalizado
--user-email cliente@teste.com

# Método de pagamento específico
--payment-method emola

# Aprovar pagamentos automaticamente
--auto-approve
```

---

### 4. 💳 **PaySuite Modo Sandbox**
**O que é:** Usar API real do PaySuite em modo de testes
**Como usar:**
```bash
cd backend
python manage.py test_paysuite_safe --mode sandbox --amount 10.00
```

**Vantagens:**
- ✅ Testa API real do PaySuite
- ✅ Valores baixos (máximo 50 MZN)
- ✅ Ambiente sandbox oficial
- ✅ Webhooks reais

---

## 🎯 Cenários de Teste Recomendados

### 📋 **Teste Básico - 5 minutos**
1. **Frontend Demo:**
   ```
   1. Acesse http://localhost:5173/
   2. Adicione produtos ao carrinho
   3. Vá para checkout
   4. Ative "Modo Demo"
   5. Complete o processo
   6. Verifique em "Meus Pedidos"
   ```

### 📋 **Teste Completo - 10 minutos**
1. **Criar dados backend:**
   ```bash
   python criar_pedido_teste.py --quantidade 3
   ```

2. **Testar frontend:**
   ```
   1. Login com: teste@exemplo.com
   2. Visualizar pedidos criados
   3. Fazer novo pedido via checkout
   4. Cancelar um pedido
   ```

### 📋 **Teste Avançado - 15 minutos**
1. **Múltiplos cenários:**
   ```bash
   python manage.py test_ecommerce_completo --mode simulation --orders-count 5 --auto-approve
   ```

2. **Teste PaySuite:**
   ```bash
   python manage.py test_paysuite_safe --mode sandbox --amount 5.99 --method emola
   ```

3. **Verificar dados:**
   ```
   1. Área administrativa
   2. Relatórios de estoque
   3. Status de pedidos
   ```

---

## 🔍 **Como Verificar os Resultados**

### 👤 **Área do Cliente**
```
URL: http://localhost:5173/meus-pedidos
Login: teste@exemplo.com (ou email usado)

O que verificar:
✅ Lista de pedidos
✅ Detalhes de cada pedido
✅ Status de pagamento
✅ Informações de entrega
✅ Opção de cancelamento
```

### 🔧 **Área Administrativa**
```
URL: http://localhost:8000/admin/
Login: admin (seu usuário admin)

O que verificar:
✅ Pedidos criados
✅ Pagamentos registrados
✅ Movimentações de estoque
✅ Histórico de status
```

### 💾 **Database**
```bash
# Verificar pedidos criados
python manage.py shell
>>> from cart.models import Order
>>> Order.objects.all()

# Verificar pagamentos
>>> from cart.models import Payment
>>> Payment.objects.all()
```

---

## 🛡️ **Segurança dos Testes**

### ✅ **Garantias de Segurança:**
- 🔒 **Modo Demo:** Zero transações reais
- 🔒 **Scripts Locais:** Apenas dados simulados
- 🔒 **PaySuite Sandbox:** Ambiente oficial de testes
- 🔒 **Valores Baixos:** Máximo 50 MZN quando usar sandbox
- 🔒 **Dados Fictícios:** Todos os dados são claramente marcados como teste

### ⚠️ **Avisos Importantes:**
- 🚨 **NUNCA** use dados pessoais reais nos testes
- 🚨 **SEMPRE** verifique que está em modo demo/sandbox
- 🚨 **CONFIRME** que pedidos estão marcados como teste
- 🚨 **LIMPE** dados de teste regularmente

---

## 🎬 **Fluxo de Teste Recomendado**

### **Passo 1: Preparação (2 min)**
```bash
cd backend
python manage.py runserver &
cd ../frontend
npm run dev &
```

### **Passo 2: Teste Backend (3 min)**
```bash
python criar_pedido_teste.py --quantidade 2
```

### **Passo 3: Teste Frontend (5 min)**
```
1. Acesse http://localhost:5173/
2. Faça login (criar conta se necessário)
3. Adicione produtos ao carrinho
4. Checkout com "Modo Demo" ativado
5. Confirme pedido criado
```

### **Passo 4: Verificação (2 min)**
```
1. Vá para "Meus Pedidos"
2. Verifique detalhes dos pedidos
3. Teste cancelamento
4. Confirme dados no admin
```

---

## 🚀 **Comandos Rápidos**

```bash
# Teste instantâneo
python criar_pedido_teste.py

# Teste completo
python manage.py test_ecommerce_completo --mode demo --auto-approve

# Limpar dados de teste
python manage.py shell -c "
from cart.models import Order, Payment;
from django.contrib.auth.models import User;
User.objects.filter(email__contains='teste').delete();
Order.objects.filter(customer_notes__contains='teste').delete()
"

# Status do sistema
python manage.py check
```

---

## 📞 **Resolução de Problemas**

### ❓ **"Não vejo pedidos criados"**
```bash
# Verificar se foram criados
python manage.py shell -c "from cart.models import Order; print(Order.objects.count())"

# Usar email correto para login
python manage.py shell -c "from django.contrib.auth.models import User; print([u.email for u in User.objects.all()])"
```

### ❓ **"Erro no modo demo"**
```bash
# Verificar componente DemoPayment
cd frontend/src/components/payments/
ls -la DemoPayment.tsx
```

### ❓ **"PaySuite não responde"**
```bash
# Usar modo mock
python manage.py test_paysuite_safe --mode mock --amount 5.00
```

---

## 🎉 **Conclusão**

Com estes métodos, você pode testar **100% do sistema** sem processar pagamentos reais:

✅ **Frontend completo** - Interface de checkout moderna
✅ **Backend completo** - APIs, estoque, pedidos
✅ **Integração PaySuite** - Webhooks e processamento
✅ **Área do cliente** - Portal de pedidos
✅ **Área administrativa** - Gestão completa
✅ **Dados realistas** - Simulações próximas ao real

**🚀 O sistema está pronto para testes seguros e completos!**