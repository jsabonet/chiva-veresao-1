# Lógica de Timeout de Pagamentos - Sistema Híbrido

## 📊 Problema Identificado

O PaySuite não retorna status de falha via API `/v1/payments/{id}`:
- ✅ Dashboard mostra "Failed"
- ❌ API retorna `transaction: null` (igual a pending)
- ❌ Não há campo `error`, `message`, ou `status` indicando falha

## 💡 Solução Implementada: **Timeout Híbrido**

### 🔴 **Hard Timeout: 15 minutos**
Limite absoluto de tempo. Após 15 minutos, **qualquer** pagamento com `transaction: null` é marcado como `failed`.

**Motivo**: Pagamentos legítimos não demoram mais de 15 minutos.

```python
if payment_age_minutes > 15:
    status = 'failed'
    reason = "Hard timeout: 15 minutos sem confirmação"
```

### 🟡 **Soft Timeout: 3 minutos + 60 polls**
Detecta falhas mais rápido quando há **muitas tentativas** sem sucesso.

**Condições simultâneas**:
1. Pagamento tem **mais de 3 minutos**
2. Sistema já fez **mais de 60 consultas** (polling)

**Motivo**: Se o frontend está fazendo polling a cada 3 segundos por 3 minutos e ainda não há confirmação, provavelmente falhou (não apenas está lento).

```python
if payment_age_minutes > 3 AND poll_count > 60:
    status = 'failed'
    reason = "Soft timeout: 3 minutos e 60+ tentativas sem sucesso"
```

## 📈 Tracking de Polling

### Novos Campos no Modelo `Payment`:
```python
poll_count = IntegerField(default=0)        # Contador de tentativas
last_polled_at = DateTimeField(null=True)   # Última consulta
```

### Incremento Automático:
Cada vez que o backend consulta o PaySuite:
```python
payment.poll_count += 1
payment.last_polled_at = timezone.now()
payment.save(update_fields=['poll_count', 'last_polled_at'])
```

## ⏱️ Cenários de Uso

### Cenário 1: Pagamento Bem-Sucedido Rápido
```
00:00 - Payment criado, poll_count=0
00:03 - Poll #1: transaction=null, poll_count=1 → pending
00:06 - Poll #2: transaction=null, poll_count=2 → pending
00:09 - Poll #3: transaction={...}, poll_count=3 → ✅ PAID
```

### Cenário 2: Pagamento Falhou (Saldo Insuficiente)
```
00:00 - Payment criado, poll_count=0
00:03 - Poll #1: transaction=null, poll_count=1 → pending
00:06 - Poll #2: transaction=null, poll_count=2 → pending
...
03:00 - Poll #60: transaction=null, poll_count=60 → pending
03:03 - Poll #61: transaction=null, poll_count=61 → ❌ FAILED (soft timeout)
```
**Falha detectada em ~3 minutos** ao invés de 15!

### Cenário 3: Pagamento Muito Lento mas Bem-Sucedido
```
00:00 - Payment criado, poll_count=0
...
10:00 - Poll #200: transaction=null → pending (dentro do hard timeout)
...
14:00 - Poll #280: transaction={...} → ✅ PAID (antes do hard timeout)
```

### Cenário 4: Pagamento Abandonado
```
00:00 - Payment criado, poll_count=0
00:03 - Poll #1: transaction=null → pending
00:06 - Poll #2: transaction=null → pending
...
02:00 - Frontend parou de fazer polling (usuário fechou aba)
...
15:00 - Alguém consulta o pedido → ❌ FAILED (hard timeout)
```

## 📊 Benefícios

### ✅ Detecção Rápida de Falhas
- Falhas reais detectadas em **~3 minutos** ao invés de 15
- Usuário recebe feedback mais rápido

### ✅ Sem Falsos Positivos
- Pagamentos lentos mas legítimos não são marcados como falhos
- Hard timeout de 15 minutos protege casos extremos

### ✅ Adaptativo
- Sistema aprende com o comportamento: muitos polls = problema
- Combina tempo + tentativas para decisão mais inteligente

## 🔧 Configuração Atual

```python
HARD_TIMEOUT_MINUTES = 15    # Limite absoluto
SOFT_TIMEOUT_MINUTES = 3     # Tempo mínimo para soft timeout
SOFT_TIMEOUT_POLLS = 60      # Número de polls para soft timeout
```

### Cálculo do Soft Timeout:
- Frontend faz polling a cada **3 segundos**
- 60 polls × 3s = **180 segundos** = **3 minutos**
- Após 3 minutos de polling contínuo sem sucesso → provavelmente falhou

## 📝 Mensagens de Erro

### Hard Timeout:
```
"Pagamento expirado: Hard timeout: 15 minutos sem confirmação"
```

### Soft Timeout:
```
"Pagamento expirado: Soft timeout: 3 minutos e 61 tentativas sem sucesso"
```

## 🎯 Próximas Melhorias Possíveis

1. **Timeout ajustável por método de pagamento**:
   - M-Pesa pode demorar mais → timeout maior
   - e-Mola geralmente é mais rápido → timeout menor

2. **Detecção de padrões de falha**:
   - Se PaySuite sempre demora X tempo antes de falhar, ajustar soft timeout

3. **Notificação proativa**:
   - Alertar usuário após 2 minutos: "Pagamento demorando mais que o normal"

4. **Analytics**:
   - Rastrear quantos pagamentos atingem soft vs hard timeout
   - Otimizar valores baseado em dados reais
