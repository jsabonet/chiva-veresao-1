from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient


class ShippingMethodAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(username='admin', password='pass')
        self.admin.is_staff = True
        self.admin.save()

    def test_crud_shipping_method(self):
        self.client.login(username='admin', password='pass')
        # Create
        payload = {
            'id': 'test_method',
            'name': 'Teste',
            'price': '100.00',
            'min_order': '0.00',
            'delivery_time': '1-2 dias',
            'regions': 'Todo o país',
            'enabled': True
        }
        res = self.client.post('/api/cart/admin/shipping-methods/', payload, format='json')
        self.assertEqual(res.status_code, 201)
        # List
        res = self.client.get('/api/cart/admin/shipping-methods/')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(any(m['id']=='test_method' for m in data))
        # Update
        res = self.client.put('/api/cart/admin/shipping-methods/test_method/', {'name': 'Teste 2'}, format='json')
        self.assertEqual(res.status_code, 200)
        # Delete
        res = self.client.delete('/api/cart/admin/shipping-methods/test_method/')
        self.assertIn(res.status_code, (200,204))
*** End Patch