#!/usr/bin/env python
"""
Script to create test coupons and cart data for testing
"""

import os
import sys
import django
from datetime import datetime, timedelta
from decimal import Decimal

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'chiva_backend.settings')
django.setup()

from django.utils import timezone
from cart.models import Coupon, Cart, CartItem
from products.models import Product, Color
from django.contrib.auth.models import User

def create_test_coupons():
    """Create test coupons for testing"""
    print("Creating test coupons...")
    
    # Create percentage discount coupon
    coupon1, created = Coupon.objects.get_or_create(
        code='DESCONTO10',
        defaults={
            'name': 'Desconto 10%',
            'description': 'Desconto de 10% em toda a compra',
            'discount_type': 'percentage',
            'discount_value': Decimal('10.00'),
            'valid_from': timezone.now(),
            'valid_until': timezone.now() + timedelta(days=30),
            'minimum_amount': Decimal('50.00'),
            'max_uses': 100,
            'is_active': True,
        }
    )
    if created:
        print(f"✓ Created coupon: {coupon1.code}")
    
    # Create fixed amount discount coupon
    coupon2, created = Coupon.objects.get_or_create(
        code='SAVE20',
        defaults={
            'name': 'Economize R$ 20',
            'description': 'Desconto fixo de R$ 20',
            'discount_type': 'fixed',
            'discount_value': Decimal('20.00'),
            'valid_from': timezone.now(),
            'valid_until': timezone.now() + timedelta(days=15),
            'minimum_amount': Decimal('100.00'),
            'max_uses': 50,
            'is_active': True,
        }
    )
    if created:
        print(f"✓ Created coupon: {coupon2.code}")
    
    # Create expired coupon for testing
    coupon3, created = Coupon.objects.get_or_create(
        code='EXPIRED',
        defaults={
            'name': 'Cupom Expirado',
            'description': 'Cupom usado para testes (expirado)',
            'discount_type': 'percentage',
            'discount_value': Decimal('15.00'),
            'valid_from': timezone.now() - timedelta(days=10),
            'valid_until': timezone.now() - timedelta(days=1),
            'is_active': True,
        }
    )
    if created:
        print(f"✓ Created expired coupon: {coupon3.code}")

def create_test_cart():
    """Create a test cart with items"""
    print("Creating test cart data...")
    
    # Get or create a test user
    user, created = User.objects.get_or_create(
        username='testuser',
        defaults={
            'email': 'test@example.com',
            'first_name': 'Test',
            'last_name': 'User',
        }
    )
    if created:
        user.set_password('testpass123')
        user.save()
        print(f"✓ Created test user: {user.username}")
    
    # Create test cart
    cart, created = Cart.objects.get_or_create(
        user=user,
        status='active',
        defaults={
            'last_activity': timezone.now(),
        }
    )
    if created:
        print(f"✓ Created test cart: {cart.id}")
    
    # Get some products to add to cart
    products = Product.objects.filter(status='active')[:2]
    colors = Color.objects.filter(is_active=True)[:1]
    
    if products.exists():
        for i, product in enumerate(products):
            color = colors.first() if colors.exists() and i == 0 else None
            
            cart_item, created = CartItem.objects.get_or_create(
                cart=cart,
                product=product,
                color=color,
                defaults={
                    'quantity': 2,
                    'price': product.price,
                }
            )
            if created:
                print(f"✓ Added product to cart: {product.name}")
    
    # Calculate cart totals
    cart.calculate_totals()
    print(f"✓ Cart total: R$ {cart.total}")

def main():
    print("=== Creating Test Data for Cart System ===\n")
    
    try:
        create_test_coupons()
        print()
        create_test_cart()
        print()
        
        # Show summary
        print("=== Summary ===")
        print(f"Coupons created: {Coupon.objects.count()}")
        print(f"Carts created: {Cart.objects.count()}")
        print(f"Cart items created: {CartItem.objects.count()}")
        
        print("\n=== Available Test Coupons ===")
        for coupon in Coupon.objects.all():
            status = "✓ Valid" if coupon.is_valid() else "✗ Invalid"
            print(f"Code: {coupon.code} | Type: {coupon.discount_type} | Value: {coupon.discount_value} | {status}")
        
        print("\n✅ Test data creation completed successfully!")
        
    except Exception as e:
        print(f"❌ Error creating test data: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    main()