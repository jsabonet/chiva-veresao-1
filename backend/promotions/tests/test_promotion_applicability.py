from django.test import TestCase
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta

from promotions.models import Promotion
from customers.models import Role, ExternalAuthUser


class PromotionApplicabilityTests(TestCase):
    def setUp(self):
        # Create a user and external auth mirror
        self.user = User.objects.create_user(username='testuser', email='test@example.com')
        self.user_no_role = User.objects.create_user(username='norole', email='norole@example.com')

        self.ext_user = ExternalAuthUser.objects.create(firebase_uid='uid-123', user=self.user, email=self.user.email, display_name='Test User')
        self.ext_no_role = ExternalAuthUser.objects.create(firebase_uid='uid-456', user=self.user_no_role, email=self.user_no_role.email, display_name='No Role')

        # Create a role
        self.role = Role.objects.create(name='vip', description='VIP customers')

        # Time window for active promotions
        now = timezone.now()
        self.active_start = now - timedelta(days=1)
        self.active_end = now + timedelta(days=1)

    def test_public_promotion_applies_to_anonymous(self):
        promo = Promotion.objects.create(
            name='Public Promo',
            description='Applies to everyone',
            start_date=self.active_start,
            end_date=self.active_end,
            discount_type='fixed',
            discount_value='10.00',
            status='active'
        )
        # No allowed_roles set -> public
        self.assertTrue(promo.applies_to_user(None))

    def test_public_promotion_applies_to_authenticated_user(self):
        promo = Promotion.objects.create(
            name='Public Promo',
            description='Applies to everyone',
            start_date=self.active_start,
            end_date=self.active_end,
            discount_type='fixed',
            discount_value='5.00',
            status='active'
        )
        self.assertTrue(promo.applies_to_user(self.user))

    def test_role_restricted_promotion_applies_to_user_with_role(self):
        promo = Promotion.objects.create(
            name='VIP Promo',
            description='VIP only',
            start_date=self.active_start,
            end_date=self.active_end,
            discount_type='percentage',
            discount_value='10.00',
            status='active'
        )
        promo.allowed_roles.add(self.role)
        # assign role to external user mirror
        self.ext_user.roles.add(self.role)
        self.assertTrue(promo.applies_to_user(self.user))

    def test_role_restricted_promotion_denies_user_without_role(self):
        promo = Promotion.objects.create(
            name='VIP Promo',
            description='VIP only',
            start_date=self.active_start,
            end_date=self.active_end,
            discount_type='percentage',
            discount_value='10.00',
            status='active'
        )
        promo.allowed_roles.add(self.role)
        # user_no_role does not have role
        self.assertFalse(promo.applies_to_user(self.user_no_role))

    def test_staff_bypass_for_role_restricted_promotion(self):
        promo = Promotion.objects.create(
            name='VIP Promo',
            description='VIP only',
            start_date=self.active_start,
            end_date=self.active_end,
            discount_type='percentage',
            discount_value='10.00',
            status='active'
        )
        promo.allowed_roles.add(self.role)
        # Make user_no_role staff
        self.user_no_role.is_staff = True
        self.user_no_role.save()
        self.assertTrue(promo.applies_to_user(self.user_no_role))

    def test_inactive_promotion_returns_false(self):
        now = timezone.now()
        promo = Promotion.objects.create(
            name='Old Promo',
            description='Expired',
            start_date=now - timedelta(days=10),
            end_date=now - timedelta(days=5),
            discount_type='fixed',
            discount_value='2.00',
            status='expired'
        )
        self.assertFalse(promo.applies_to_user(self.user))
