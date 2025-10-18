# Script de Teste - Fluxo Completo de Cupom

## Teste 1: Validar cupom com cart_total
curl "https://chivacomputer.co.mz/api/cart/coupon/validate/?code=TESTE20&cart_total=1000"

Esperado:
```json
{
  "valid": true,
  "discount_amount": 200.00,
  "coupon": {...}
}
```

## Teste 2: Simular checkout com cupom
POST https://chivacomputer.co.mz/api/cart/initiate-payment/
```json
{
  "method": "mpesa",
  "phone": "258840000000",
  "amount": 800,
  "shipping_amount": 0,
  "currency": "MZN",
  "coupon_code": "TESTE20",
  "items": [{"id": 1, "quantity": 1}],
  "shipping_address": {...},
  "billing_address": {...}
}
```

Esperado:
- Backend deve calcular: 1000 (subtotal) - 200 (desconto) + 0 (frete) = 800
- Payment.amount deve ser 800
- Gateway Paysuite deve receber amount=800

## Logs importantes para verificar no servidor:
```bash
ssh root@chivacomputer.co.mz "tail -100 /home/chiva/chiva-veresao-1/backend/logs/gunicorn.log | grep -i coupon"
```

Procurar por:
- "✅ Coupon TESTE20 applied: discount=200.00 on cart_subtotal=1000.00"
- "charge_total=800.00"

## Teste Frontend:
1. Acesse: https://chivacomputer.co.mz/carrinho
2. Adicione produtos no valor de 1000 MZN
3. Digite cupom: TESTE20
4. Clique em "Aplicar"
5. Verifique se desconto de 200 MZN aparece
6. Total deve mostrar 800 MZN
7. Clique em "Finalizar Compra"
8. Preencha dados de entrega
9. Confirme pedido
10. Verifique no Paysuite se o valor enviado foi 800 MZN (não 1000)

## Verificação no banco de dados:
```bash
ssh root@chivacomputer.co.mz
cd /home/chiva/chiva-veresao-1/backend
source venv/bin/activate
python manage.py shell
```

```python
from cart.models import Payment, Cart
from decimal import Decimal

# Buscar último pagamento
p = Payment.objects.last()
print(f"Amount: {p.amount}")
print(f"Request Data: {p.request_data}")

# Buscar carrinho associado
if p.cart:
    print(f"Cart Subtotal: {p.cart.subtotal}")
    print(f"Applied Coupon: {p.cart.applied_coupon}")
    print(f"Discount Amount: {p.cart.discount_amount}")
```

Esperado:
- Payment.amount = 800.00 (com desconto)
- Cart.discount_amount = 200.00
- Cart.applied_coupon = Coupon(TESTE20)
