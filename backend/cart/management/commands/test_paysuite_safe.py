"""
Comando Django para executar testes seguros do PaySuite
Uso: python manage.py test_paysuite_safe
"""

from django.core.management.base import BaseCommand
from django.conf import settings
import os
import sys
from decimal import Decimal
from cart.payments.safe_paysuite import create_test_payment, get_paysuite_client


class Command(BaseCommand):
    help = 'Executar testes seguros do PaySuite sem valores reais'

    def add_arguments(self, parser):
        parser.add_argument(
            '--mode',
            type=str,
            default='sandbox',
            choices=['sandbox', 'mock', 'development'],
            help='Modo de teste (sandbox, mock, development)'
        )
        parser.add_argument(
            '--amount',
            type=float,
            default=5.99,
            help='Valor do pagamento de teste (máximo 50.00)'
        )
        parser.add_argument(
            '--method',
            type=str,
            default='emola',
            choices=['emola', 'mpesa', 'card'],
            help='Método de pagamento'
        )
        parser.add_argument(
            '--phone',
            type=str,
            default='851234567',
            help='Número de telefone de teste'
        )
        parser.add_argument(
            '--quick',
            action='store_true',
            help='Executar apenas teste rápido'
        )

    def handle(self, *args, **options):
        # Configurar ambiente de teste
        original_mode = os.getenv('PAYSUITE_TEST_MODE')
        os.environ['PAYSUITE_TEST_MODE'] = options['mode']
        
        self.stdout.write(
            self.style.SUCCESS('🚀 Iniciando Testes PaySuite Seguros')
        )
        self.stdout.write(f"Modo: {options['mode']}")
        self.stdout.write(f"Valor: {options['amount']} MZN")
        self.stdout.write(f"Método: {options['method']}")
        self.stdout.write("-" * 50)

        try:
            if options['quick']:
                self.run_quick_test(options)
            else:
                self.run_full_test(options)
                
        except KeyboardInterrupt:
            self.stdout.write(
                self.style.WARNING('\n⏹️ Teste interrompido pelo usuário')
            )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'❌ Erro durante o teste: {e}')
            )
        finally:
            # Restaurar configuração original
            if original_mode:
                os.environ['PAYSUITE_TEST_MODE'] = original_mode
            else:
                os.environ.pop('PAYSUITE_TEST_MODE', None)

    def run_quick_test(self, options):
        """Executar teste rápido"""
        self.stdout.write("🧪 Teste Rápido - Criação de Pagamento")
        
        try:
            response = create_test_payment(
                amount=options['amount'],
                method=options['method'],
                phone=options['phone']
            )
            
            if response.get('status') == 'success':
                self.stdout.write(
                    self.style.SUCCESS('✅ Pagamento de teste criado com sucesso!')
                )
                data = response.get('data', {})
                self.stdout.write(f"ID: {data.get('id', 'N/A')}")
                self.stdout.write(f"Referência: {data.get('reference', 'N/A')}")
                
                checkout_url = data.get('checkout_url')
                if checkout_url:
                    self.stdout.write(f"URL Checkout: {checkout_url}")
                else:
                    self.stdout.write("Pagamento direto (sem redirect)")
                    
            else:
                self.stdout.write(
                    self.style.ERROR(f'❌ Falha: {response.get("message", "Erro desconhecido")}')
                )
                
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'❌ Erro ao criar pagamento: {e}')
            )

    def run_full_test(self, options):
        """Executar teste completo"""
        from cart.models import Cart, Order, Payment
        from django.contrib.auth.models import User
        
        self.stdout.write("🔬 Teste Completo - Fluxo End-to-End")
        
        # 1. Limpar dados de teste anteriores
        self.stdout.write("🧹 Limpando dados de teste...")
        test_user, _ = User.objects.get_or_create(
            username='test_paysuite_user',
            defaults={'email': 'test@paysuite.local'}
        )
        
        Cart.objects.filter(user=test_user, status='active').delete()
        Order.objects.filter(user=test_user, status='pending').delete()
        
        # 2. Criar carrinho de teste
        self.stdout.write("🛒 Criando carrinho de teste...")
        from products.models import Product
        
        # Encontrar um produto para teste
        product = Product.objects.filter(status='active').first()
        if not product:
            self.stdout.write(
                self.style.ERROR('❌ Nenhum produto ativo encontrado')
            )
            return
            
        # Criar carrinho
        cart = Cart.objects.create(
            user=test_user,
            status='active'
        )
        
        from cart.models import CartItem
        CartItem.objects.create(
            cart=cart,
            product=product,
            quantity=1,
            price=Decimal(str(options['amount'] - 2.5))  # Deixar espaço para shipping
        )
        
        cart.calculate_totals()
        self.stdout.write(f"Carrinho criado: {cart.total} MZN")
        
        # 3. Testar criação de pagamento
        self.stdout.write("💳 Testando criação de pagamento...")
        
        try:
            client = get_paysuite_client()
            response = client.create_payment(
                amount=float(cart.total) + 2.5,  # Adicionar shipping
                method=options['method'],
                reference=f"TEST_ORDER_{cart.id}",
                description=f"Teste completo - Carrinho {cart.id}",
                msisdn=options['phone'],
                callback_url="http://127.0.0.1:8000/api/cart/payments/webhook/",
                metadata={
                    'test': True,
                    'cart_id': cart.id,
                    'user_id': test_user.id
                }
            )
            
            if response.get('status') == 'success':
                self.stdout.write(
                    self.style.SUCCESS('✅ Pagamento criado com sucesso!')
                )
                
                # 4. Criar registro de pedido
                order = Order.objects.create(
                    cart=cart,
                    user=test_user,
                    total_amount=Decimal(str(options['amount'])),
                    status='pending'
                )
                
                data = response.get('data', {})
                Payment.objects.create(
                    order=order,
                    method=options['method'],
                    amount=Decimal(str(options['amount'])),
                    currency='MZN',
                    paysuite_reference=data.get('id'),
                    status='pending',
                    raw_response=response
                )
                
                self.stdout.write(f"Pedido criado: #{order.id}")
                
                # 5. Simular webhook (apenas em modo mock)
                if options['mode'] == 'mock':
                    self.stdout.write("🔔 Simulando webhook...")
                    self.simulate_webhook(order, data.get('id'))
                
            else:
                self.stdout.write(
                    self.style.ERROR(f'❌ Falha na criação: {response.get("message")}')
                )
                
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'❌ Erro no teste: {e}')
            )

    def simulate_webhook(self, order, payment_id):
        """Simular webhook de confirmação"""
        from django.test import Client
        import json
        
        client = Client()
        webhook_data = {
            "event": "payment.success",
            "data": {
                "id": payment_id,
                "reference": f"TEST_ORDER_{order.cart.id}",
                "amount": float(order.total_amount),
                "status": "completed"
            },
            "metadata": {
                "order_id": order.id,
                "cart_id": order.cart.id,
                "user_id": order.user.id
            }
        }
        
        response = client.post(
            '/api/cart/payments/webhook/',
            data=json.dumps(webhook_data),
            content_type='application/json'
        )
        
        if response.status_code == 200:
            self.stdout.write(
                self.style.SUCCESS('✅ Webhook simulado com sucesso!')
            )
            
            # Verificar se o pedido foi atualizado
            order.refresh_from_db()
            self.stdout.write(f"Status do pedido: {order.status}")
        else:
            self.stdout.write(
                self.style.ERROR(f'❌ Falha no webhook: {response.status_code}')
            )