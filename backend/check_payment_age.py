#!/usr/bin/env python
"""Script para verificar idade do Payment #23"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'chiva_backend.settings')
django.setup()

from cart.models import Payment
from django.utils import timezone

try:
    payment = Payment.objects.get(id=23)
    age = timezone.now() - payment.created_at
    age_minutes = age.total_seconds() / 60
    age_hours = age_minutes / 60
    
    print(f"\n📍 Payment #{payment.id}")
    print(f"   Status: {payment.status}")
    print(f"   Created: {payment.created_at}")
    print(f"   Now: {timezone.now()}")
    print(f"   Age: {age}")
    print(f"   Age in minutes: {age_minutes:.2f}")
    print(f"   Age in hours: {age_hours:.2f}")
    
    if age_minutes > 15:
        print(f"\n⏰ PAYMENT TIMEOUT! ({age_minutes:.1f} min > 15 min)")
        print(f"   Should be marked as FAILED")
    else:
        print(f"\n⏳ Still within timeout window ({age_minutes:.1f} min < 15 min)")
        
except Payment.DoesNotExist:
    print("❌ Payment #23 não encontrado")
except Exception as e:
    print(f"❌ Erro: {e}")
    import traceback
    traceback.print_exc()
