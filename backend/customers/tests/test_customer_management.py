import json
from django.test import TestCase, Client
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from customers.models import Customer, PermissionChange
from django.contrib.auth import get_user_model
from firebase_admin import auth
from unittest.mock import patch, MagicMock

User = get_user_model()

class CustomerManagementTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        # Create admin user
        self.admin_user = User.objects.create_superuser(
            email='admin@test.com',
            password='testpass123'
        )
        self.client.force_authenticate(user=self.admin_user)
        
        # Create test customer
        self.customer = Customer.objects.create(
            email='customer@test.com',
            name='Test Customer',
            firebase_uid='test_firebase_uid',
            is_firebase_user=True
        )

    @patch('firebase_admin.auth.set_custom_user_claims')
    def test_grant_admin_permission(self, mock_set_claims):
        url = reverse('customer-grant-admin', args=[self.customer.id])
        response = self.client.post(url, {'notes': 'Testing admin grant'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.customer.refresh_from_db()
        self.assertTrue(self.customer.is_admin)
        
        # Check if Firebase claims were updated
        mock_set_claims.assert_called_once_with(
            'test_firebase_uid', 
            {'admin': True}
        )

        # Check permission change log
        change_log = PermissionChange.objects.filter(
            customer=self.customer,
            change_type='grant_admin'
        ).first()
        self.assertIsNotNone(change_log)
        self.assertEqual(change_log.notes, 'Testing admin grant')

    @patch('firebase_admin.auth.set_custom_user_claims')
    def test_revoke_admin_permission(self, mock_set_claims):
        # First grant admin
        self.customer.is_admin = True
        self.customer.save()

        url = reverse('customer-revoke-admin', args=[self.customer.id])
        response = self.client.post(url, {'notes': 'Testing admin revoke'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.customer.refresh_from_db()
        self.assertFalse(self.customer.is_admin)
        
        # Check if Firebase claims were updated
        mock_set_claims.assert_called_once_with(
            'test_firebase_uid', 
            {'admin': False}
        )

    def test_get_permission_history(self):
        # Create some permission changes
        PermissionChange.objects.create(
            customer=self.customer,
            changed_by=self.admin_user,
            change_type='grant_admin',
            notes='Test grant'
        )
        PermissionChange.objects.create(
            customer=self.customer,
            changed_by=self.admin_user,
            change_type='revoke_admin',
            notes='Test revoke'
        )

        url = reverse('customer-permission-history', args=[self.customer.id])
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(len(data), 2)
        self.assertEqual(data[0]['change_type'], 'revoke_admin')
        self.assertEqual(data[1]['change_type'], 'grant_admin')

    @patch('firebase_admin.auth.get_user')
    def test_sync_firebase_user(self, mock_get_user):
        # Mock Firebase user data
        mock_get_user.return_value = MagicMock(
            uid='new_firebase_uid',
            email='updated@test.com',
            display_name='Updated Name',
            custom_claims={'admin': True}
        )

        url = reverse('customer-sync-firebase', args=[self.customer.id])
        response = self.client.post(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.customer.refresh_from_db()
        self.assertEqual(self.customer.firebase_uid, 'new_firebase_uid')
        self.assertEqual(self.customer.email, 'updated@test.com')
        self.assertEqual(self.customer.name, 'Updated Name')
        self.assertTrue(self.customer.is_admin)

    def test_unauthorized_access(self):
        # Create non-admin user
        regular_user = User.objects.create_user(
            email='regular@test.com',
            password='testpass123'
        )
        self.client.force_authenticate(user=regular_user)

        url = reverse('customer-grant-admin', args=[self.customer.id])
        response = self.client.post(url, {'notes': 'Should fail'})

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)