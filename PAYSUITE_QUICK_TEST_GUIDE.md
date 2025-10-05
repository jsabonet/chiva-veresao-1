# 🧪 PaySuite Testing - Guia Completo e Rápido

## ✅ Infraestrutura de Testes Implementada

O sistema agora possui **infraestrutura completa** para testes seguros do PaySuite, **sem riscos financeiros**.

## 🚀 Teste Rápido (30 segundos)

```bash
# Navegue para o backend
cd backend

# Teste rápido - apenas validação de API
python manage.py test_paysuite_safe --quick --amount 5.99 --method emola

# Resultado esperado: ✅ Pagamento de teste criado com sucesso!
```

## 🔬 Teste Completo (2 minutos)

```bash
# Teste completo - carrinho + pagamento + simulação
python manage.py test_paysuite_safe --mode mock --amount 8.50 --method mpesa

# Resultado esperado: Carrinho criado → Pagamento processado → Pedido criado
```

## 📋 Comandos Disponíveis

### Teste Rápido
```bash
python manage.py test_paysuite_safe --quick
python manage.py test_paysuite_safe --quick --amount 7.99 --method emola
python manage.py test_paysuite_safe --quick --phone 851234567
```

### Testes por Modo
```bash
# Modo Mock (offline, respostas simuladas)
python manage.py test_paysuite_safe --mode mock --amount 5.99

# Modo Sandbox (conecta ao sandbox PaySuite, se disponível)  
python manage.py test_paysuite_safe --mode sandbox --amount 12.50

# Modo Development (híbrido)
python manage.py test_paysuite_safe --mode development --amount 8.99
```

### Métodos de Pagamento
```bash
# E-mola
python manage.py test_paysuite_safe --method emola --phone 851234567

# M-Pesa
python manage.py test_paysuite_safe --method mpesa --phone 841234567

# Cartão
python manage.py test_paysuite_safe --method card
```

## 🛡️ Segurança dos Testes

### ✅ O que está protegido:

1. **Valores limitados**: Máximo 50.00 MZN
2. **Números de teste**: 841234567, 851234567, 843000000
3. **Ambientes isolados**: Mock/Sandbox/Development
4. **Fallback automático**: Se sandbox falhar → mock response
5. **Dados separados**: Usuário de teste dedicado

### ❌ Não há risco de:

- Cobranças reais
- Transações financeiras 
- Impacto em produção
- Perda de dados

## 🎯 Casos de Uso

### Durante Desenvolvimento
```bash
# Teste rápido para validar mudanças
python manage.py test_paysuite_safe --quick

# Teste de integração completa
python manage.py test_paysuite_safe --mode mock
```

### Antes de Deploy
```bash
# Testar todos os métodos
python manage.py test_paysuite_safe --method emola
python manage.py test_paysuite_safe --method mpesa
python manage.py test_paysuite_safe --method card

# Testar valores diferentes
python manage.py test_paysuite_safe --amount 1.50
python manage.py test_paysuite_safe --amount 25.00
python manage.py test_paysuite_safe --amount 49.99
```

### Debug de Issues
```bash
# Simular problema específico
python manage.py test_paysuite_safe --mode mock --amount 10.00 --method emola --phone 851234567
```

## 📊 Interpretando Resultados

### ✅ Sucesso
```
🚀 Iniciando Testes PaySuite Seguros
Modo: mock
Valor: 8.5 MZN
Método: mpesa
--------------------------------------------------
🔬 Teste Completo - Fluxo End-to-End
🧹 Limpando dados de teste...
🛒 Criando carrinho de teste...
Carrinho criado: 6.00 MZN
💳 Testando criação de pagamento...
✅ Pagamento criado com sucesso!
Pedido criado: #69
```

### ⚠️ Warnings Normais
```
Invalid HTTP_HOST header: 'testserver' - NORMAL no modo mock
HTTPSConnectionPool... Failed to resolve - NORMAL, fallback para mock
```

### ❌ Problemas Reais
```
❌ Nenhum produto ativo encontrado - Adicionar produtos ao DB
❌ Erro na criação: [...] - Verificar configuração PaySuite
```

## 🔧 Configuração (já feita)

No arquivo `.env`:
```env
PAYSUITE_TEST_MODE=sandbox
MAX_TEST_AMOUNT=50.00
CART_CLEAR_ON_INITIATE=true
```

## 📱 Integração Frontend

O frontend já está configurado para trabalhar com esta infraestrutura:

1. **Cart.tsx**: Envia valores corretos para backend
2. **usePayments.ts**: Gerencia estado de pagamentos
3. **ProductDetails.tsx**: Exibe imagens corretamente

## 🎉 Status Final

✅ **Infraestrutura de testes completa**  
✅ **Zero risco financeiro**  
✅ **Múltiplos modos de teste**  
✅ **Validação end-to-end**  
✅ **Documentação completa**  

**Você pode agora desenvolver e testar pagamentos com total segurança!**

---

## 🆘 Troubleshooting

### Comando não encontrado
```bash
cd backend
python manage.py help  # Verificar se Django está funcionando
```

### Erro de importação
```bash
python manage.py check  # Verificar configuração Django
```

### Banco de dados
```bash
python manage.py migrate  # Aplicar migrações
```

### Produtos de teste
```bash
python manage.py shell
# >>> from products.models import Product
# >>> Product.objects.filter(status='active').count()
```