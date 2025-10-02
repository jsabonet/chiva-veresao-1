"""
Django management command to test PaySuite integration
"""
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from cart.models import Cart
import requests
import json

class Command(BaseCommand):
    help = 'Test PaySuite integration and show logs'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('🔄 Testing PaySuite integration...'))
        
        # Create a test user if doesn't exist
        user, created = User.objects.get_or_create(username='test-uid')
        if created:
            self.stdout.write(f'✅ Created test user: {user.username}')
        
        # Create a test cart
        cart = Cart.objects.filter(user=user, status='active').first()
        if not cart:
            cart = Cart.objects.create(user=user, status='active')
            self.stdout.write(f'✅ Created test cart: {cart.id}')
        
        # Make the payment request
        url = "http://127.0.0.1:8000/api/cart/payments/initiate/"
        headers = {
            "Authorization": "Bearer fake.eyJzdWIiOiJ0ZXN0LXVpZCJ9.fake",
            "Content-Type": "application/json"
        }
        data = {
            "method": "mpesa",
            "phone": "258840000000"
        }
        
        self.stdout.write(f'🌐 Making request to: {url}')
        self.stdout.write(f'📤 Request data: {json.dumps(data, indent=2)}')
        
        try:
            response = requests.post(url, headers=headers, json=data)
            self.stdout.write(f'📥 Response Status: {response.status_code}')
            self.stdout.write(f'📥 Response Body: {response.text}')
            
            if response.status_code == 200:
                self.stdout.write(self.style.SUCCESS('✅ Payment request successful!'))
                response_data = response.json()
                self.stdout.write(f'📋 Response Data: {json.dumps(response_data, indent=2)}')
            else:
                self.stdout.write(self.style.ERROR(f'❌ Payment failed with status {response.status_code}'))
                
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'❌ Request failed: {e}'))