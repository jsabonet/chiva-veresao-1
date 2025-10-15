from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from cart.models import ShippingMethod


class ShippingMethodIntegrationTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(username='int_admin', password='pass')
        self.admin.is_staff = True
        self.admin.save()

    def test_create_update_delete_shipping_method(self):
        # login as admin
        logged = self.client.login(username='int_admin', password='pass')
        self.assertTrue(logged)

        # Create
        payload = {
            'name': 'Integration Method',
            'price': '123.45',
            'min_order': '10.00',
            'delivery_time': '2 dias',
            'regions': 'Cidade A',
            'enabled': True,
        }
        res = self.client.post('/api/cart/admin/shipping-methods/', payload, format='json')
        if res.status_code != 201:
            try:
                body = res.json()
            except Exception:
                body = res.content.decode('utf-8', errors='ignore')
            self.fail(f'Create failed: status={res.status_code} body={body}')
        data = res.json()
        # Debug: print returned data to help diagnose update 404
        print('CREATE RESPONSE DATA:', data)
        self.assertIn('id', data)
        method_id = data['id']

        # Check DB
        sm = ShippingMethod.objects.get(id=method_id)
        self.assertEqual(str(sm.price), '123.45')

        # Update
        up = {'name': 'Integration Method Updated', 'price': '200.00'}
        res = self.client.put(f'/api/cart/admin/shipping-methods/{method_id}/', up, format='json')
        self.assertEqual(res.status_code, 200)
        sm.refresh_from_db()
        self.assertEqual(sm.name, 'Integration Method Updated')
        self.assertEqual(str(sm.price), '200.00')

        # Delete
        res = self.client.delete(f'/api/cart/admin/shipping-methods/{method_id}/')
        self.assertIn(res.status_code, (200, 204))
        with self.assertRaises(ShippingMethod.DoesNotExist):
            ShippingMethod.objects.get(id=method_id)
