# Resolução: Pedidos sem Informações de Produto

## Problema Identificado

Os pedidos estavam sendo criados sem informações completas dos produtos, dificultando o fulfillment (separação e entrega). Apenas o `product_id` era armazenado, mas faltavam:

- Nome do produto
- SKU (código do produto)
- Imagem do produto
- Nome e código da cor
- Peso e dimensões
- Preço unitário e subtotal

## Causa Raiz

No fluxo de pagamento (`initiate_payment`), ao criar o registro de `Payment`, os **itens do carrinho não estavam sendo incluídos** no campo `request_data`. 

O webhook do PaySuite (`paysuite_webhook`) tentava criar os `OrderItem` a partir de:
1. `request_data['items']` → **não existia**
2. `request_data['meta']['items']` → **não existia**  
3. Fallback: itens do carrinho → **funcionava, mas só se o carrinho ainda existisse**

Se o carrinho fosse limpo antes do webhook processar, **nenhum item era criado**.

## Solução Implementada

### 1. Backend: `initiate_payment` (views.py)

**Antes:**
```python
payment = Payment.objects.create(
    order=None,
    cart=cart,
    method=method,
    amount=charge_total,
    currency=client_currency,
    status='initiated',
    request_data={
        'shipping_address': shipping_address,
        'billing_address': billing_address,
        'shipping_method': shipping_method,
        'customer_notes': customer_notes,
        'shipping_cost': str(shipping_cost),
        # ❌ Itens do carrinho NÃO eram incluídos aqui
        'meta': {...}
    }
)
```

**Depois:**
```python
# Prepare cart items data for order creation in webhook
cart_items_data = []
for cart_item in cart.items.select_related('product', 'color').all():
    item_data = {
        'product_id': cart_item.product.id if cart_item.product else None,
        'product': cart_item.product.id if cart_item.product else None,
        'name': cart_item.product.name if cart_item.product else '',
        'sku': getattr(cart_item.product, 'sku', '') if cart_item.product else '',
        'color_id': cart_item.color.id if cart_item.color else None,
        'color': cart_item.color.id if cart_item.color else None,
        'color_name': cart_item.color.name if cart_item.color else '',
        'quantity': cart_item.quantity,
        'price': str(cart_item.price),
        'unit_price': str(cart_item.price),
    }
    cart_items_data.append(item_data)

payment = Payment.objects.create(
    order=None,
    cart=cart,
    method=method,
    amount=charge_total,
    currency=client_currency,
    status='initiated',
    request_data={
        'shipping_address': shipping_address,
        'billing_address': billing_address,
        'shipping_method': shipping_method,
        'customer_notes': customer_notes,
        'shipping_cost': str(shipping_cost),
        'items': cart_items_data,  # ✅ Itens agora incluídos
        'meta': {...}
    }
)
```

### 2. Backend: Model OrderItem Expandido

O modelo `OrderItem` foi expandido de 4 para 15 campos:

```python
class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True, blank=True)
    
    # Snapshot de informações do produto para fulfillment
    product_name = models.CharField(max_length=255)
    sku = models.CharField(max_length=100)
    product_image = models.URLField(max_length=500, blank=True)
    
    # Informações de cor
    color = models.ForeignKey(Color, on_delete=models.SET_NULL, null=True, blank=True)
    color_name = models.CharField(max_length=100, blank=True)
    color_hex = models.CharField(max_length=7, blank=True)
    
    # Informações de preço (snapshot no momento da compra)
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)
    
    # Informações logísticas
    weight = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    dimensions = models.CharField(max_length=100, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
```

### 3. Backend: Webhook Atualizado

O webhook já estava preparado para processar os itens corretamente:

```python
# Webhook processa items de request_data
items_payload = rd.get('items')  # ✅ Agora existe!

if items_payload and isinstance(items_payload, list):
    for it in items_payload:
        # Cria OrderItem com todas as informações
        OrderItem.objects.create(
            order=order,
            product=product,
            product_name=name,
            sku=sku,
            product_image=product_image,  # URL completo
            color=color,
            color_name=color_name,
            color_hex=color_hex,
            quantity=qty,
            unit_price=unit_price,
            subtotal=line_total,
            weight=product.weight,
            dimensions=product.dimensions
        )
```

### 4. Frontend: UI Atualizada

**OrdersManagement.tsx e AccountOrders.tsx:**

- Interface `OrderItem` atualizada com 15 campos
- Design profissional com cards responsivos
- Exibição de:
  - Imagem do produto (20x20px)
  - SKU em badge azul com fonte monoespaçada
  - Color swatch com código hex
  - Peso e dimensões
  - Quantidade, preço unitário e subtotal
  - Grid responsivo: 2 colunas mobile, 4 colunas desktop

## Migração do Banco de Dados

Foi criada a migração `0016_alter_orderitem_options_orderitem_color_and_more` que adiciona os 10 novos campos à tabela `orderitem`.

**Aplicação da migração:**
```bash
docker compose exec backend python manage.py migrate
```

## Resultado

### Antes ❌
```json
{
  "order_id": 123,
  "items": [
    {
      "id": 1,
      "product": 45,
      "product_name": "Laptop Dell",
      "sku": "DELL-LAP-001"
    }
  ]
}
```

### Depois ✅
```json
{
  "order_id": 123,
  "items": [
    {
      "id": 1,
      "product": 45,
      "product_name": "Laptop Dell Inspiron 15",
      "sku": "DELL-LAP-001",
      "product_image": "https://chivacomputer.co.mz/media/products/dell-laptop.jpg",
      "color": 3,
      "color_name": "Prata",
      "color_hex": "#C0C0C0",
      "quantity": 2,
      "unit_price": "45000.00",
      "subtotal": "90000.00",
      "weight": "2.5",
      "dimensions": "35x25x2 cm"
    }
  ]
}
```

## Commits

1. **Backend (models + webhook):**  
   `64aebaf` - feat: Add comprehensive product details to OrderItem

2. **Frontend (UI):**  
   `92ae0b2` - feat: Update frontend to display comprehensive OrderItem details

3. **Backend (payment fix):**  
   `bb65743` - fix: Include cart items in payment request_data for order creation

## Deploy

1. **Backend:** Docker rebuild + restart
2. **Frontend:** npm run build (Nginx serve)
3. **Migração:** Aplicada em produção

## Verificação

Para verificar se funciona:

1. Criar um novo pedido através do checkout
2. Ver detalhes do pedido no admin (OrdersManagement.tsx)
3. Confirmar que todos os campos estão preenchidos:
   - ✅ Imagem do produto
   - ✅ SKU
   - ✅ Cor (nome + hex)
   - ✅ Peso e dimensões
   - ✅ Preço e subtotal

## Benefícios

- **Fulfillment completo:** Admins veem exatamente o que enviar
- **Histórico preservado:** Informações do produto no momento da compra
- **Independente do carrinho:** Pedido preservado mesmo se carrinho for limpo
- **UI profissional:** Interface responsiva e informativa
- **Logistics ready:** Peso e dimensões disponíveis para cálculo de envio

---

**Status:** ✅ Resolvido e deployado em produção  
**Data:** 19/10/2025  
**Testado:** Aguardando primeiro pedido pós-deploy
