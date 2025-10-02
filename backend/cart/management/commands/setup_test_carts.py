from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from cart.models import Cart, CartItem
from products.models import Product
from decimal import Decimal


class Command(BaseCommand):
    help = 'Ensure all users have active carts for testing'

    def handle(self, *args, **options):
        # Get the first active product
        product = Product.objects.filter(status='active').first()
        if not product:
            self.stdout.write(self.style.ERROR('No active products found!'))
            return

        # Create test users and carts
        test_users = ['test-uid', 'user1', 'admin', 'testuser']
        
        for username in test_users:
            user, created = User.objects.get_or_create(
                username=username,
                defaults={
                    'email': f'{username}@test.com',
                    'first_name': 'Test',
                    'last_name': 'User'
                }
            )
            
            # Get or create active cart
            cart, cart_created = Cart.objects.get_or_create(
                user=user,
                status='active',
                defaults={
                    'subtotal': Decimal('0.00'),
                    'total': Decimal('0.00')
                }
            )
            
            # Add product if cart is empty
            if not cart.items.exists():
                CartItem.objects.create(
                    cart=cart,
                    product=product,
                    quantity=1,
                    price=product.price
                )
                cart.calculate_totals()
                action = 'Created cart with item'
            else:
                action = 'Cart already has items'
            
            self.stdout.write(f'✅ {username}: {action} (Total: ${cart.total})')
        
        self.stdout.write(
            self.style.SUCCESS(f'✨ All test users ready with active carts!')
        )