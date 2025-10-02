from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from cart.models import Cart, CartItem
from products.models import Product
from decimal import Decimal


class Command(BaseCommand):
    help = 'Create a test cart with items for testing payments'

    def add_arguments(self, parser):
        parser.add_argument('--user-id', type=str, default='test-uid', help='User ID to create cart for')
        parser.add_argument('--product-id', type=int, help='Product ID to add to cart')

    def handle(self, *args, **options):
        user_id = options['user_id']
        
        # Get or create user
        user, created = User.objects.get_or_create(
            username=user_id,
            defaults={'email': f'{user_id}@test.com', 'first_name': 'Test User'}
        )
        if created:
            self.stdout.write(f'Created user: {user.username}')
        else:
            self.stdout.write(f'Using existing user: {user.username}')

        # Get or create active cart
        cart, created = Cart.objects.get_or_create(
            user=user,
            status='active',
            defaults={'subtotal': Decimal('0.00'), 'total': Decimal('0.00')}
        )
        if created:
            self.stdout.write(f'Created cart: {cart.id}')
        else:
            self.stdout.write(f'Using existing cart: {cart.id}')

        # Add product to cart if specified
        product_id = options.get('product_id')
        if product_id:
            try:
                product = Product.objects.get(id=product_id, status='active')
                cart_item, created = CartItem.objects.get_or_create(
                    cart=cart,
                    product=product,
                    defaults={'quantity': 1, 'price': product.price}
                )
                if created:
                    self.stdout.write(f'Added product: {product.name} (${product.price})')
                else:
                    cart_item.quantity += 1
                    cart_item.save()
                    self.stdout.write(f'Updated quantity for: {product.name}')
                
                # Recalculate totals
                cart.calculate_totals()
                
            except Product.DoesNotExist:
                self.stdout.write(self.style.ERROR(f'Product {product_id} not found'))
        else:
            # Add first available product if no specific product requested
            product = Product.objects.filter(status='active').first()
            if product:
                cart_item, created = CartItem.objects.get_or_create(
                    cart=cart,
                    product=product,
                    defaults={'quantity': 1, 'price': product.price}
                )
                if created:
                    self.stdout.write(f'Added product: {product.name} (${product.price})')
                cart.calculate_totals()

        # Show final cart status
        cart.refresh_from_db()
        self.stdout.write(
            self.style.SUCCESS(
                f'Cart ready! User: {user.username}, Items: {cart.items.count()}, '
                f'Total: ${cart.total}'
            )
        )