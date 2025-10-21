# Solução: Sistema de Confirmação Manual/Automática
#
# PROBLEMA IDENTIFICADO:
# ======================
# 1. Frontend (OrderConfirmation.tsx) marca como sucesso após 2 minutos
# 2. PaySuite demora ou nunca envia webhook
# 3. Backend fica esperando forever (transaction: null)
# 4. Cliente não recebe email mesmo tendo pago
#
# SOLUÇÃO PROPOSTA:
# =================
# Opção A) Enviar email "condicional" após timeout do frontend
#  - Email: "Pagamento em processamento, confirmaremos em breve"
#  - Quando PaySuite confirmar: Enviar email final de confirmação
#
# Opção B) Admin pode marcar manualmente como "paid"
#  - Endpoint: PATCH /api/cart/orders/{id}/mark-as-paid/
#  - Envia emails automaticamente
#
# Opção C) Polling mais inteligente
#  - Se poll_count > 40 E transaction ainda é null
#  - Mas usuário já saiu da página (last_polled_at > 5 min atrás)
#  - Marcar como "presumed_paid" e enviar email condicional
#
# RECOMENDAÇÃO: Implementar OPÇÃO B primeiro (mais seguro)
#               Depois adicionar OPÇÃO A (melhor UX)

"""
Implementação: Opção B - Endpoint Manual para Marcar como Pago
"""
