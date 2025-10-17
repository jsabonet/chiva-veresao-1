"""
Management command to poll PaySuite for pending payment status
Backup solution when webhooks are not working
"""
from django.core.management.base import BaseCommand
from cart.models import Payment, Order
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Poll PaySuite API for pending payments status (backup when webhooks fail)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--minutes',
            type=int,
            default=30,
            help='Check payments from last N minutes (default: 30)',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be updated without actually updating',
        )

    def handle(self, *args, **options):
        minutes = options['minutes']
        dry_run = options['dry_run']
        
        since = datetime.now() - timedelta(minutes=minutes)
        
        # Buscar payments pending recentes
        pending_payments = Payment.objects.filter(
            status='pending',
            created_at__gte=since
        ).exclude(
            paysuite_reference__isnull=True
        ).exclude(
            paysuite_reference=''
        )
        
        total = pending_payments.count()
        self.stdout.write(f'🔍 Found {total} pending payments from last {minutes} minutes')
        
        if total == 0:
            self.stdout.write(self.style.SUCCESS('✅ No pending payments to check'))
            return
        
        # Import PaySuite client
        try:
            from cart.payments.paysuite import PaysuiteClient
            client = PaysuiteClient()
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'❌ Failed to initialize PaySuite client: {e}'))
            return
        
        updated_count = 0
        failed_count = 0
        
        for payment in pending_payments:
            try:
                self.stdout.write(f'\n📋 Checking Payment #{payment.id} (Ref: {payment.paysuite_reference})')
                
                # Verificar se PaySuite client tem método de consulta
                # Nota: PaySuite pode não ter endpoint público de consulta
                # Neste caso, precisamos usar o checkout_url ou esperar webhook
                
                # Por enquanto, vamos apenas logar
                self.stdout.write(f'   Created: {payment.created_at.strftime("%Y-%m-%d %H:%M:%S")}')
                self.stdout.write(f'   Method: {payment.method}')
                self.stdout.write(f'   Amount: {payment.amount} {payment.currency}')
                
                # TODO: Implementar consulta ao PaySuite quando API estiver disponível
                # result = client.get_payment_status(payment.paysuite_reference)
                
                # Por enquanto, marcar como "needs_manual_check"
                if not dry_run:
                    # Adicionar nota no payment para admin verificar
                    payment.request_data = payment.request_data or {}
                    payment.request_data['polled_at'] = datetime.now().isoformat()
                    payment.request_data['polling_note'] = 'Webhook not received, needs manual verification'
                    payment.save(update_fields=['request_data'])
                
                self.stdout.write(f'   ⚠️  Marked for manual verification')
                
            except Exception as e:
                failed_count += 1
                self.stdout.write(self.style.ERROR(f'   ❌ Error: {e}'))
        
        self.stdout.write('\n' + '=' * 60)
        self.stdout.write(f'📊 SUMMARY:')
        self.stdout.write(f'   Total checked: {total}')
        self.stdout.write(f'   Updated: {updated_count}')
        self.stdout.write(f'   Failed: {failed_count}')
        self.stdout.write(f'   Needs manual check: {total - updated_count - failed_count}')
        
        if dry_run:
            self.stdout.write(self.style.WARNING('\n⚠️  DRY RUN - No changes were made'))
        
        self.stdout.write('=' * 60)
