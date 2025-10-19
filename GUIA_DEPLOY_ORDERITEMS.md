# 🚀 GUIA DE DEPLOY - CORREÇÃO ORDERITEMS

## ⚡ DEPLOY RÁPIDO (1 minuto)

### Via SSH:
```bash
# Conectar ao servidor
ssh rnqmslm@chiva.co.mz -p 2222
# OU
ssh rnqmslm@162.241.233.68

# Atualizar código
cd ~/chiva-veresao-1
git pull origin main

# Reiniciar backend
docker compose restart backend

# Verificar logs
docker compose logs -f --tail=50 backend
```

**Pronto! Sistema atualizado.**

---

## 🔍 COMO TESTAR NO SITE

### 1. Criar um pedido de teste:
1. Adicione produtos ao carrinho
2. Vá para checkout
3. Complete o pagamento via PaySuite
4. Aguarde na tela de OrderConfirmation (polling automático)
5. Sistema vai detectar pagamento confirmado
6. OrderItems serão criados automaticamente

### 2. Verificar se funcionou:

#### A) No Django Admin:
```
https://chiva.co.mz/admin/cart/order/
```
- Abra o pedido recém-criado
- Role até "ORDER ITEMS"
- Deve mostrar produtos com:
  - ✅ Nome do produto
  - ✅ SKU
  - ✅ Imagem
  - ✅ Cor e hex
  - ✅ Quantidade
  - ✅ Preços

#### B) Na conta do cliente:
```
https://chiva.co.mz/account/orders
```
- Clique no pedido
- Modal deve mostrar:
  - ✅ Cards com imagens dos produtos (16x16 a 24x24)
  - ✅ SKUs em badges
  - ✅ Cores com swatches
  - ✅ Quantidades em badges overlay
  - ✅ Especificações em grid responsivo

#### C) No OrdersManagement (Admin):
```
https://chiva.co.mz/ordersmanagement
```
- Encontre o pedido
- Deve listar produtos completos

---

## 📋 CHECKLIST DE VERIFICAÇÃO

### Após deploy:
- [ ] Backend reiniciado sem erros
- [ ] Logs não mostram erros Python
- [ ] Site carrega normalmente

### Após criar pedido teste:
- [ ] OrderConfirmation detectou pagamento
- [ ] Redirecionou para página de sucesso
- [ ] Django Admin mostra OrderItems
- [ ] AccountOrders mostra produtos
- [ ] OrdersManagement mostra produtos

### Logs esperados:
```
🔧 Creating OrderItems via polling for order X
📦 Found Y items in payment.request_data
✅ OrderItem criado: [Nome do Produto]
```

---

## 🐛 TROUBLESHOOTING

### Se OrderItems não forem criados:

1. **Verificar logs do backend:**
```bash
docker compose logs backend | grep -i "creating orderitems"
```

2. **Verificar payment.request_data:**
```bash
docker compose exec backend python manage.py shell
```
```python
from cart.models import Order, Payment
order = Order.objects.latest('created_at')
payment = order.payments.first()
print(payment.request_data.get('items'))  # Deve mostrar lista de items
```

3. **Verificar se polling está funcionando:**
- Abra DevTools (F12) no navegador
- Aba Network
- Filtro: `payment_status`
- Deve ver requests a cada 3 segundos

4. **Executar fix manual (se necessário):**
```bash
cd ~/chiva-veresao-1/backend
python fix_orders_without_items.py
```

---

## 🔄 ROLLBACK (Se necessário)

Se algo der errado e precisar voltar:

```bash
cd ~/chiva-veresao-1
git log --oneline -5  # Ver commits recentes
git checkout [commit-anterior]  # Usar commit antes de 1f1bae2
docker compose restart backend
```

---

## 📞 SUPORTE

### Logs em tempo real:
```bash
docker compose logs -f backend
```

### Verificar status dos containers:
```bash
docker compose ps
```

### Reiniciar tudo (se necessário):
```bash
docker compose down
docker compose up -d
```

---

## ✅ CONFIRMAÇÃO DE SUCESSO

Você saberá que funcionou quando:

1. ✅ Criar pedido e ver produtos no Django Admin
2. ✅ Cliente ver produtos completos em AccountOrders
3. ✅ Admin ver produtos em OrdersManagement
4. ✅ Logs mostrarem "Creating OrderItems via polling"
5. ✅ Nenhum pedido novo sem items

---

## 🎉 PRONTO!

Após o deploy, o sistema estará completamente funcional e independente de webhooks quebrados da PaySuite. Todos os pedidos novos terão informações completas de produtos automaticamente.

**Duração estimada do deploy:** 1-2 minutos  
**Downtime:** ~10 segundos (restart do backend)  
**Risco:** Mínimo (testado localmente com sucesso)
