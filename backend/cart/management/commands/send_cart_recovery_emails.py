"""
Comando Django para enviar emails de recuperação de carrinhos abandonados
Uso: python manage.py send_cart_recovery_emails
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from django.conf import settings
from datetime import timedelta
from cart.models import Cart, AbandonedCart
from cart.email_service import get_email_service
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Envia emails de recuperação para carrinhos abandonados'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Executa sem enviar emails (apenas mostra o que seria enviado)',
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Força envio mesmo se já atingiu limite de emails',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        force = options['force']

        if dry_run:
            self.stdout.write(self.style.WARNING('🔍 Modo DRY-RUN ativado - nenhum email será enviado'))

        # Configurações
        abandonment_hours = settings.CART_ABANDONMENT_HOURS
        max_recovery_emails = settings.MAX_RECOVERY_EMAILS
        
        cutoff_time = timezone.now() - timedelta(hours=abandonment_hours)

        self.stdout.write(f'⏰ Buscando carrinhos abandonados há mais de {abandonment_hours} horas...')

        # Buscar carrinhos abandonados com condições:
        # 1. Tem items
        # 2. Última atividade há mais de X horas
        # 3. Usuário tem email
        # 4. Não atingiu limite de emails de recuperação
        # 5. Status = 'active' ou 'abandoned'

        carts_to_recover = Cart.objects.filter(
            last_activity__lt=cutoff_time,
            status__in=['active', 'abandoned'],
            user__isnull=False,  # Apenas usuários autenticados
        ).exclude(
            user__email=''
        ).select_related('user').prefetch_related('items')

        if not force:
            # Verificar quantos emails já foram enviados
            abandoned_carts_ids = AbandonedCart.objects.filter(
                recovery_emails_sent__gte=max_recovery_emails
            ).values_list('cart_id', flat=True)
            carts_to_recover = carts_to_recover.exclude(id__in=abandoned_carts_ids)

        # Filtrar carrinhos com items
        carts_with_items = []
        for cart in carts_to_recover:
            if cart.items.exists():
                carts_with_items.append(cart)

        self.stdout.write(f'📦 Encontrados {len(carts_with_items)} carrinhos para recuperação')

        if not carts_with_items:
            self.stdout.write(self.style.SUCCESS('✅ Nenhum carrinho para recuperar no momento'))
            return

        email_service = get_email_service()
        sent_count = 0
        failed_count = 0

        for cart in carts_with_items:
            try:
                # Obter ou criar AbandonedCart
                abandoned_cart, created = AbandonedCart.objects.get_or_create(
                    cart=cart,
                    defaults={
                        'abandonment_stage': 'browsing',
                        'recovery_emails_sent': 0,
                        'last_recovery_sent': timezone.now()
                    }
                )

                # Verificar se já atingiu limite de emails
                if abandoned_cart.recovery_emails_sent >= max_recovery_emails and not force:
                    self.stdout.write(
                        self.style.WARNING(
                            f'⏭️  Carrinho {cart.id} já atingiu limite de {max_recovery_emails} emails'
                        )
                    )
                    continue

                # Gerar URL de recuperação
                recovery_url = f"https://chivacomputer.co.mz/carrinho?recovery={cart.recovery_token}"

                customer_email = cart.user.email
                customer_name = cart.user.username or cart.user.first_name or 'Cliente'

                if dry_run:
                    self.stdout.write(
                        self.style.WARNING(
                            f'📧 [DRY-RUN] Enviaria email para {customer_email} - '
                            f'Carrinho {cart.id} com {cart.items.count()} items '
                            f'(Total: {cart.total} MZN)'
                        )
                    )
                else:
                    # Enviar email
                    success = email_service.send_cart_recovery_email(
                        cart=cart,
                        customer_email=customer_email,
                        customer_name=customer_name,
                        recovery_url=recovery_url
                    )

                    if success:
                        # Atualizar contadores
                        abandoned_cart.recovery_emails_sent += 1
                        abandoned_cart.last_recovery_sent = timezone.now()
                        abandoned_cart.save()

                        # Atualizar status do cart
                        if cart.status == 'active':
                            cart.status = 'abandoned'
                            cart.save(update_fields=['status'])

                        sent_count += 1
                        self.stdout.write(
                            self.style.SUCCESS(
                                f'✅ Email enviado para {customer_email} - '
                                f'Carrinho {cart.id} ({abandoned_cart.recovery_emails_sent}/{max_recovery_emails} emails)'
                            )
                        )
                    else:
                        failed_count += 1
                        self.stdout.write(
                            self.style.ERROR(
                                f'❌ Falha ao enviar email para {customer_email} - Carrinho {cart.id}'
                            )
                        )

            except Exception as e:
                failed_count += 1
                logger.error(f'Erro ao processar carrinho {cart.id}: {e}')
                self.stdout.write(
                    self.style.ERROR(
                        f'❌ Erro ao processar carrinho {cart.id}: {str(e)}'
                    )
                )

        # Resumo
        self.stdout.write('\n' + '='*60)
        if dry_run:
            self.stdout.write(
                self.style.SUCCESS(
                    f'🔍 DRY-RUN COMPLETO: {len(carts_with_items)} carrinhos seriam processados'
                )
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(
                    f'✅ Emails enviados: {sent_count}'
                )
            )
            if failed_count > 0:
                self.stdout.write(
                    self.style.ERROR(
                        f'❌ Falhas: {failed_count}'
                    )
                )

        self.stdout.write('='*60)
