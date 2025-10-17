#!/usr/bin/env python
import os
import django
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'chiva_backend.settings')
django.setup()

from cart.models import Payment

p = Payment.objects.get(id=16)
print("Payment #16:")
print(f"  Status: {p.status}")
print(f"  PaySuite Ref: {p.paysuite_reference}")
print(f"  Raw Response:")
print(json.dumps(p.raw_response, indent=2))
