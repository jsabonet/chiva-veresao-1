#!/usr/bin/env python

import os
import sys
import django
from django.conf import settings

# Add the project directory to the Python path
sys.path.append('/path/to/your/project')

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'chiva_backend.settings')
django.setup()

from django.contrib.auth.models import User
from products.models import Product, Favorite

def create_test_favorites():
    """Create test user and favorites"""
    
    # Create test user if doesn't exist
    test_user, created = User.objects.get_or_create(
        username='testuser',
        defaults={
            'email': 'test@example.com',
            'first_name': 'Test',
            'last_name': 'User'
        }
    )
    
    if created:
        test_user.set_password('testpass123')
        test_user.save()
        print(f"Created test user: {test_user.username}")
    else:
        print(f"Test user already exists: {test_user.username}")
    
    # Get some products to favorite
    products = Product.objects.filter(status='active')[:3]
    
    if not products:
        print("No active products found. Please create some products first.")
        return
    
    favorites_created = 0
    
    for product in products:
        favorite, created = Favorite.objects.get_or_create(
            user=test_user,
            product=product
        )
        
        if created:
            print(f"Created favorite: {test_user.username} -> {product.name}")
            favorites_created += 1
        else:
            print(f"Favorite already exists: {test_user.username} -> {product.name}")
    
    print(f"\nTotal favorites created: {favorites_created}")
    print(f"Total favorites for {test_user.username}: {Favorite.objects.filter(user=test_user).count()}")
    
    # Display all favorites
    user_favorites = Favorite.objects.filter(user=test_user).select_related('product')
    print(f"\nAll favorites for {test_user.username}:")
    for fav in user_favorites:
        print(f"- {fav.product.name} (ID: {fav.product.id}) - Added: {fav.created_at}")

if __name__ == "__main__":
    create_test_favorites()