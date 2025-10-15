from django import setup
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE','chiva_backend.settings')
setup()
from cart.models import Payment, CartHistory
p=Payment.objects.filter(paysuite_reference='4dcd5c46-81de-42ea-a163-adba60753c90').first()
print('Payment:', p.id if p else None, getattr(p,'status',None), getattr(p,'order_id',None))
o = p.order if p and p.order else None
print('Order:', o.id if o else None, getattr(o,'status',None) if o else None)
if p and p.cart:
    print('CartHistory recent:')
    rows = list(CartHistory.objects.filter(cart=p.cart).order_by('-timestamp')[:10].values('event','description','metadata','timestamp'))
    for r in rows:
        print(r)
