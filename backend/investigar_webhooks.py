#!/usr/bin/env python
import os
import django
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'chiva_backend.settings')
django.setup()

from cart.models import Payment

print('\n' + '='*80)
print('🔎 INVESTIGAÇÃO DE WEBHOOKS - PAYMENTS RECENTES')
print('='*80 + '\n')

payments = Payment.objects.all().order_by('-created_at')[:20]

if not payments.exists():
    print('Nenhum payment encontrado')
    exit(0)

for p in payments:
    rd = p.request_data or {}
    cb = rd.get('callback_url') if isinstance(rd, dict) else None
    ms = p.paysuite_reference or rd.get('reference') or None
    print(f'ID: {p.id}\tStatus: {p.status}\tPaysuiteRef: {ms}')
    print(f'  Created: {p.created_at}\tUpdated: {p.updated_at}')
    print(f'  Callback URL (request_data): {cb}')
    print(f'  Raw response keys: {list(p.raw_response.keys()) if p.raw_response else None}')
    print('-'*80)

print('\nDone.')
