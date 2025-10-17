#!/usr/bin/env python
"""
Script para demonstrar a lógica de timeout híbrido
Mostra quando um pagamento seria marcado como failed
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'chiva_backend.settings')
django.setup()

from cart.models import Payment
from django.utils import timezone
from datetime import timedelta

# Configurações (mesmas do código)
HARD_TIMEOUT_MINUTES = 15
SOFT_TIMEOUT_MINUTES = 3
SOFT_TIMEOUT_POLLS = 60

def check_payment_timeout(payment_id):
    """Verifica se um pagamento deveria estar failed"""
    try:
        payment = Payment.objects.get(id=payment_id)
        
        print(f"\n{'='*60}")
        print(f"📍 Payment #{payment.id}")
        print(f"{'='*60}")
        print(f"Status Atual:     {payment.status}")
        print(f"Criado em:        {payment.created_at}")
        print(f"Último poll:      {payment.last_polled_at or 'Nunca'}")
        print(f"Contagem polls:   {payment.poll_count}")
        
        # Calcular idade
        age = timezone.now() - payment.created_at
        age_minutes = age.total_seconds() / 60
        
        print(f"\n📊 Análise:")
        print(f"Idade:            {age_minutes:.2f} minutos ({age})")
        print(f"Polls realizados: {payment.poll_count}")
        
        # Verificar condições de timeout
        print(f"\n🔍 Verificação de Timeout:")
        
        # Hard timeout
        hard_timeout_hit = age_minutes > HARD_TIMEOUT_MINUTES
        print(f"Hard Timeout ({HARD_TIMEOUT_MINUTES} min):  {'❌ ATINGIDO' if hard_timeout_hit else f'✅ OK ({HARD_TIMEOUT_MINUTES - age_minutes:.1f} min restantes)'}")
        
        # Soft timeout
        soft_timeout_hit = age_minutes > SOFT_TIMEOUT_MINUTES and payment.poll_count > SOFT_TIMEOUT_POLLS
        print(f"Soft Timeout ({SOFT_TIMEOUT_MINUTES} min + {SOFT_TIMEOUT_POLLS} polls): ", end='')
        if soft_timeout_hit:
            print(f"❌ ATINGIDO")
        elif age_minutes > SOFT_TIMEOUT_MINUTES:
            print(f"⚠️  Tempo atingido, mas polls insuficientes ({payment.poll_count}/{SOFT_TIMEOUT_POLLS})")
        elif payment.poll_count > SOFT_TIMEOUT_POLLS:
            print(f"⚠️  Polls atingidos, mas tempo insuficiente ({age_minutes:.1f}/{SOFT_TIMEOUT_MINUTES} min)")
        else:
            print(f"✅ OK")
        
        # Decisão
        print(f"\n🎯 Decisão:")
        if hard_timeout_hit:
            print(f"❌ DEVERIA SER FAILED (Hard Timeout)")
            print(f"   Razão: Ultrapassou {HARD_TIMEOUT_MINUTES} minutos sem confirmação")
        elif soft_timeout_hit:
            print(f"❌ DEVERIA SER FAILED (Soft Timeout)")
            print(f"   Razão: {age_minutes:.1f} min + {payment.poll_count} polls = provável falha")
        else:
            print(f"✅ PODE PERMANECER PENDING")
            if age_minutes < SOFT_TIMEOUT_MINUTES:
                polls_needed = SOFT_TIMEOUT_POLLS - payment.poll_count
                time_left = SOFT_TIMEOUT_MINUTES - age_minutes
                print(f"   Soft timeout em: {max(time_left, polls_needed * 0.05):.1f} minutos")
            print(f"   Hard timeout em: {HARD_TIMEOUT_MINUTES - age_minutes:.1f} minutos")
        
        # Status real vs esperado
        if payment.status == 'pending':
            if hard_timeout_hit or soft_timeout_hit:
                print(f"\n⚠️  INCONSISTÊNCIA DETECTADA!")
                print(f"   Status atual é 'pending', mas deveria ser 'failed'")
        elif payment.status == 'failed':
            if not (hard_timeout_hit or soft_timeout_hit):
                print(f"\n⚠️  POSSÍVEL INCONSISTÊNCIA!")
                print(f"   Status é 'failed', mas timeouts não foram atingidos")
                print(f"   (Pode ter sido marcado manualmente ou por erro explícito)")
        
    except Payment.DoesNotExist:
        print(f"❌ Payment #{payment_id} não encontrado")

def simulate_polling_scenario(age_minutes, poll_count):
    """Simula um cenário e mostra o resultado"""
    print(f"\n{'='*60}")
    print(f"🧪 Simulação: {age_minutes:.1f} min, {poll_count} polls")
    print(f"{'='*60}")
    
    hard_timeout = age_minutes > HARD_TIMEOUT_MINUTES
    soft_timeout = age_minutes > SOFT_TIMEOUT_MINUTES and poll_count > SOFT_TIMEOUT_POLLS
    
    if hard_timeout:
        print(f"❌ FAILED - Hard Timeout ({age_minutes:.1f} min > {HARD_TIMEOUT_MINUTES} min)")
    elif soft_timeout:
        print(f"❌ FAILED - Soft Timeout ({age_minutes:.1f} min > {SOFT_TIMEOUT_MINUTES} min E {poll_count} polls > {SOFT_TIMEOUT_POLLS})")
    else:
        print(f"✅ PENDING - Dentro dos limites de timeout")

# Main
if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        # Verificar payment específico
        payment_id = int(sys.argv[1])
        check_payment_timeout(payment_id)
    else:
        # Mostrar exemplos de simulação
        print("\n" + "="*60)
        print("📚 EXEMPLOS DE CENÁRIOS")
        print("="*60)
        
        # Cenário 1: Pagamento novo
        simulate_polling_scenario(0.5, 10)
        
        # Cenário 2: Pagamento falhando (detectado por soft timeout)
        simulate_polling_scenario(3.5, 70)
        
        # Cenário 3: Pagamento lento mas válido
        simulate_polling_scenario(10, 30)
        
        # Cenário 4: Hard timeout
        simulate_polling_scenario(16, 320)
        
        # Cenário 5: Quase atingindo soft timeout
        simulate_polling_scenario(2.9, 59)
        
        print(f"\n{'='*60}")
        print(f"💡 Para verificar um pagamento específico:")
        print(f"   python demo_timeout_logic.py <payment_id>")
        print(f"{'='*60}\n")
