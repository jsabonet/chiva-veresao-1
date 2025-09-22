#!/usr/bin/env python
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'chiva_backend.settings')
django.setup()

from django.contrib.auth.models import User
from django.test import Client
import json

def test_favorites_api():
    # Test with Django test client
    client = Client()
    
    # Login as test user
    try:
        user = User.objects.get(username='testuser')
        client.force_login(user)
        
        print('Testing favorites API with authenticated user...')
        print()
        
        # Test get favorites
        print('1. GET /api/favorites/')
        response = client.get('/api/favorites/')
        print(f'Status: {response.status_code}')
        data = response.json()
        print(f'Favorites count: {data["count"]}')
        if data['results']:
            print('First favorite:')
            fav = data['results'][0]
            print(f'  - Product: {fav["product"]["name"]}')
            print(f'  - Created: {fav["created_at"]}')
        
        print()
        
        # Test check favorite status for a favorited product
        print('2. GET /api/favorites/check/33/')
        response = client.get('/api/favorites/check/33/')
        print(f'Status: {response.status_code}')
        data = response.json()
        print(f'Is favorite: {data["is_favorite"]}')
        
        print()
        print('Success! Favorites API working with authentication.')
        
    except User.DoesNotExist:
        print('Test user not found. Please run create_test_favorites.py first.')

if __name__ == "__main__":
    test_favorites_api()