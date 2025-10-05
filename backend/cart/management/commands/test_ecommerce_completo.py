"""
Sistema de Testes Completo para E-commerce - Sem Pagamentos Reais
Este módulo permite testar todo o fluxo de checkout sem processar pagamentos reais
"""

from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from cart.models import Cart, CartItem, Order, Payment
from products.models import Product, Color
from decimal import Decimal
import json
import time
from datetime import datetime, timedelta


class Command(BaseCommand):
    help = 'Sistema completo de testes para e-commerce sem pagamentos reais'

    def add_arguments(self, parser):
        parser.add_argument(
            '--mode',
            type=str,
            default='demo',
            choices=['demo', 'simulation', 'stress'],
            help='Modo de teste (demo, simulation, stress)'
        )
        parser.add_argument(
            '--user-email',
            type=str,
            default='cliente@teste.com',
            help='Email do usuário de teste'
        )
        parser.add_argument(
            '--orders-count',
            type=int,
            default=1,
            help='Número de pedidos para criar'
        )
        parser.add_argument(
            '--payment-method',
            type=str,
            default='emola',
            choices=['emola', 'mpesa', 'card', 'random'],
            help='Método de pagamento simulado'
        )
        parser.add_argument(
            '--auto-approve',
            action='store_true',
            help='Aprovar pagamentos automaticamente'
        )

    def handle(self, *args, **options):
        self.stdout.write(
            self.style.SUCCESS('🎮 SISTEMA DE TESTES COMPLETO - E-COMMERCE DEMO')
        )
        self.stdout.write("=" * 60)
        self.stdout.write(f"Modo: {options['mode']}")
        self.stdout.write(f"Email de teste: {options['user_email']}")
        self.stdout.write(f"Pedidos a criar: {options['orders_count']}")
        self.stdout.write(f"Método de pagamento: {options['payment_method']}")
        self.stdout.write("-" * 60)

        try:
            if options['mode'] == 'demo':
                self.run_demo_mode(options)
            elif options['mode'] == 'simulation':
                self.run_simulation_mode(options)
            elif options['mode'] == 'stress':
                self.run_stress_test(options)
                
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'❌ Erro durante o teste: {e}')
            )

    def run_demo_mode(self, options):
        """Executar modo demo com fluxo completo"""
        self.stdout.write("🎯 MODO DEMO - Fluxo Completo de Checkout")
        
        # 1. Preparar usuário de teste
        user = self.create_test_user(options['user_email'])
        
        # 2. Criar carrinho com produtos
        cart = self.create_test_cart(user)
        
        # 3. Simular checkout completo
        order = self.simulate_checkout_process(cart, options)
        
        # 4. Simular processamento de pagamento
        self.simulate_payment_processing(order, options)
        
        # 5. Mostrar resultados
        self.show_demo_results(order)

    def create_test_user(self, email):
        """Criar ou recuperar usuário de teste"""
        self.stdout.write("👤 Preparando usuário de teste...")
        
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                'username': email.split('@')[0] + '_demo',
                'first_name': 'Cliente',
                'last_name': 'Teste'
            }
        )
        
        if created:
            self.stdout.write(
                self.style.SUCCESS(f'✅ Usuário criado: {user.username}')
            )
        else:
            self.stdout.write(f'📋 Usando usuário existente: {user.username}')
            
        return user

    def create_test_cart(self, user):
        """Criar carrinho de teste com produtos"""
        self.stdout.write("🛒 Criando carrinho de teste...")
        
        # Limpar carrinho anterior
        Cart.objects.filter(user=user, status='active').delete()
        
        # Criar novo carrinho
        cart = Cart.objects.create(user=user, status='active')
        
        # Adicionar produtos ao carrinho
        products = Product.objects.filter(status='active')[:3]  # 3 produtos
        
        for i, product in enumerate(products, 1):
            # Escolher cor se disponível
            color = product.colors.filter(is_active=True).first()
            
            # Definir quantidade
            quantity = i  # 1, 2, 3
            
            # Criar item do carrinho
            CartItem.objects.create(
                cart=cart,
                product=product,
                color=color,
                quantity=quantity,
                price=product.price
            )
            
            self.stdout.write(
                f'📦 Adicionado: {product.name} x{quantity} - {product.price * quantity} MZN'
            )
        
        cart.calculate_totals()
        
        self.stdout.write(
            self.style.SUCCESS(f'✅ Carrinho criado com {cart.get_total_items()} itens - Total: {cart.total} MZN')
        )
        
        return cart

    def simulate_checkout_process(self, cart, options):
        """Simular processo completo de checkout"""
        self.stdout.write("🔄 Simulando processo de checkout...")
        
        # Dados de teste para endereço
        shipping_address = {
            'street': 'Avenida Julius Nyerere, 123',
            'city': 'Maputo',
            'state': 'Maputo',
            'postal_code': '1100',
            'country': 'Moçambique'
        }
        
        billing_address = shipping_address.copy()  # Mesmo endereço
        
        # Criar pedido
        order = Order.objects.create(
            user=cart.user,
            cart=cart,
            total_amount=cart.total,
            shipping_cost=Decimal('50.00'),  # Frete fixo
            status='pending',
            shipping_method='standard',
            shipping_address=json.dumps(shipping_address),
            billing_address=json.dumps(billing_address),
            customer_notes='Pedido de teste criado automaticamente'
        )
        
        # Marcar carrinho como processado
        cart.status = 'completed'
        cart.save()
        
        self.stdout.write(
            self.style.SUCCESS(f'✅ Pedido criado: #{order.order_number}')
        )
        
        return order

    def simulate_payment_processing(self, order, options):
        """Simular processamento de pagamento"""
        self.stdout.write("💳 Simulando processamento de pagamento...")
        
        # Simular diferentes cenários de pagamento
        if options['auto_approve']:
            payment_status = 'completed'
            order_status = 'paid'
            message = "Pagamento aprovado automaticamente (TESTE)"
        else:
            payment_status = 'pending'
            order_status = 'pending_payment'
            message = "Aguardando confirmação de pagamento (TESTE)"
        
        # Criar registro de pagamento simulado
        payment = Payment.objects.create(
            order=order,
            method=options['payment_method'],
            amount=order.total_amount + order.shipping_cost,
            currency='MZN',
            paysuite_reference=f'DEMO_{order.id}_{int(time.time())}',
            status=payment_status,
            raw_response=json.dumps({
                'status': payment_status,
                'message': message,
                'demo_mode': True,
                'timestamp': datetime.now().isoformat()
            })
        )
        
        # Atualizar status do pedido
        order.status = order_status
        order.save()
        
        self.stdout.write(
            self.style.SUCCESS(f'✅ Pagamento simulado: {payment.paysuite_reference}')
        )
        self.stdout.write(f'💰 Status: {payment_status} - {message}')

    def show_demo_results(self, order):
        """Mostrar resultados do teste"""
        self.stdout.write("📊 RESULTADOS DO TESTE")
        self.stdout.write("=" * 40)
        
        # Informações do pedido
        self.stdout.write(f"🔢 Número do Pedido: #{order.order_number}")
        self.stdout.write(f"👤 Cliente: {order.user.email}")
        self.stdout.write(f"💰 Valor Total: {order.total_amount + order.shipping_cost} MZN")
        self.stdout.write(f"📦 Status: {order.get_status_display()}")
        
        # Itens do pedido
        self.stdout.write("\n📋 ITENS DO PEDIDO:")
        for item in order.cart.items.all():
            color_info = f" ({item.color.name})" if item.color else ""
            self.stdout.write(
                f"  • {item.product.name}{color_info} x{item.quantity} - {item.get_total_price()} MZN"
            )
        
        # Pagamento
        payment = order.payments.first()
        if payment:
            self.stdout.write(f"\n💳 PAGAMENTO:")
            self.stdout.write(f"  • Método: {payment.get_method_display()}")
            self.stdout.write(f"  • Status: {payment.get_status_display()}")
            self.stdout.write(f"  • Referência: {payment.paysuite_reference}")
        
        # URLs para teste no frontend
        self.stdout.write("\n🌐 TESTE NO FRONTEND:")
        self.stdout.write(f"  • Login com: {order.user.email}")
        self.stdout.write(f"  • Acesse: http://localhost:5173/meus-pedidos")
        self.stdout.write(f"  • Pedido #: {order.order_number}")
        
        self.stdout.write("\n" + "=" * 40)
        self.stdout.write(
            self.style.SUCCESS('🎉 TESTE COMPLETO FINALIZADO COM SUCESSO!')
        )

    def run_simulation_mode(self, options):
        """Executar múltiplas simulações"""
        self.stdout.write("🔄 MODO SIMULAÇÃO - Múltiplos Pedidos")
        
        user = self.create_test_user(options['user_email'])
        orders_created = []
        
        for i in range(options['orders_count']):
            self.stdout.write(f"\n--- Pedido {i+1}/{options['orders_count']} ---")
            
            cart = self.create_test_cart(user)
            order = self.simulate_checkout_process(cart, options)
            self.simulate_payment_processing(order, options)
            
            orders_created.append(order)
            
            # Pequena pausa entre pedidos
            time.sleep(1)
        
        # Mostrar resumo
        self.stdout.write("\n📊 RESUMO DA SIMULAÇÃO:")
        total_value = sum(o.total_amount + o.shipping_cost for o in orders_created)
        self.stdout.write(f"✅ {len(orders_created)} pedidos criados")
        self.stdout.write(f"💰 Valor total simulado: {total_value} MZN")

    def run_stress_test(self, options):
        """Executar teste de stress"""
        self.stdout.write("⚡ MODO STRESS TEST - Alta Performance")
        
        import random
        from concurrent.futures import ThreadPoolExecutor
        
        # Criar múltiplos usuários
        users = []
        for i in range(5):
            email = f"stress_test_{i}@demo.com"
            user = self.create_test_user(email)
            users.append(user)
        
        # Função para criar pedido
        def create_stress_order(user_index):
            try:
                user = users[user_index % len(users)]
                cart = self.create_test_cart(user)
                order = self.simulate_checkout_process(cart, options)
                self.simulate_payment_processing(order, options)
                return order
            except Exception as e:
                self.stdout.write(f"❌ Erro no pedido: {e}")
                return None
        
        # Executar em paralelo
        with ThreadPoolExecutor(max_workers=3) as executor:
            futures = [
                executor.submit(create_stress_order, i) 
                for i in range(options['orders_count'])
            ]
            
            orders = [f.result() for f in futures if f.result()]
        
        self.stdout.write(
            self.style.SUCCESS(f'⚡ Stress test completo: {len(orders)} pedidos processados')
        )