"""
Serviço de Email usando Brevo (Sendinblue) - TOTALMENTE GRATUITO
300 emails/dia sem custo
"""

import logging
from typing import Dict, List, Optional
from decimal import Decimal
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)


class EmailService:
    """
    Serviço centralizado para envio de emails transacionais
    usando Brevo (antigo Sendinblue) - 300 emails/dia GRÁTIS
    """

    def __init__(self):
        self.api_key = settings.BREVO_API_KEY
        self.sender_email = settings.BREVO_SENDER_EMAIL
        self.sender_name = settings.BREVO_SENDER_NAME
        self.admin_email = settings.ADMIN_EMAIL
        self.enabled = settings.EMAIL_NOTIFICATIONS_ENABLED

        # Lazy import para evitar erro se SDK não estiver instalado
        if self.enabled and self.api_key:
            try:
                import sib_api_v3_sdk
                from sib_api_v3_sdk.rest import ApiException
                
                configuration = sib_api_v3_sdk.Configuration()
                configuration.api_key['api-key'] = self.api_key
                self.api_instance = sib_api_v3_sdk.TransactionalEmailsApi(
                    sib_api_v3_sdk.ApiClient(configuration)
                )
                self.ApiException = ApiException
            except ImportError:
                logger.warning("sib-api-v3-sdk não instalado. Instale com: pip install sib-api-v3-sdk")
                self.enabled = False
        else:
            logger.info("Email notifications desabilitadas ou API key não configurada")

    def _send_email(
        self,
        to_email: str,
        to_name: str,
        subject: str,
        html_content: str,
        reply_to: Optional[str] = None
    ) -> bool:
        """
        Método privado para enviar emails via Brevo
        """
        if not self.enabled:
            logger.info(f"Email desabilitado: {subject} para {to_email}")
            return False

        try:
            import sib_api_v3_sdk

            send_smtp_email = sib_api_v3_sdk.SendSmtpEmail(
                to=[{"email": to_email, "name": to_name}],
                sender={"email": self.sender_email, "name": self.sender_name},
                subject=subject,
                html_content=html_content,
            )

            if reply_to:
                send_smtp_email.reply_to = {"email": reply_to}

            api_response = self.api_instance.send_transac_email(send_smtp_email)
            logger.info(f"✅ Email enviado com sucesso: {subject} para {to_email}")
            logger.debug(f"Brevo response: {api_response}")
            return True

        except self.ApiException as e:
            logger.error(f"❌ Erro ao enviar email via Brevo: {e}")
            return False
        except Exception as e:
            logger.error(f"❌ Erro inesperado ao enviar email: {e}")
            return False

    # ========================================
    # EMAILS PARA CLIENTES
    # ========================================

    def send_order_confirmation(self, order, customer_email: str, customer_name: str) -> bool:
        """
        Email de confirmação de pedido criado
        """
        if not settings.SEND_ORDER_CONFIRMATION:
            return False

        subject = f"✅ Pedido #{order.order_number} Confirmado - Chiva Computer"
        
        # Buscar items do pedido
        order_items = order.items.all()
        items_html = ""
        for item in order_items:
            items_html += f"""
            <tr>
                <td style="padding: 12px; border-bottom: 1px solid #eee;">
                    {item.product_name} {f'({item.color_name})' if item.color_name else ''}
                </td>
                <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">
                    {item.quantity}
                </td>
                <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">
                    {item.unit_price:.2f} MZN
                </td>
                <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">
                    {item.subtotal:.2f} MZN
                </td>
            </tr>
            """

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="margin: 0; font-size: 28px;">🎉 Pedido Confirmado!</h1>
                <p style="margin: 10px 0 0 0; font-size: 16px;">Obrigado pela sua compra</p>
            </div>

            <!-- Content -->
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none;">
                
                <p style="font-size: 16px;">Olá <strong>{customer_name}</strong>,</p>
                
                <p>Recebemos o seu pedido e ele está sendo processado. Você receberá atualizações sobre o status do pagamento e envio.</p>

                <!-- Order Info Box -->
                <div style="background: #f8f9fa; border-left: 4px solid #667eea; padding: 15px; margin: 20px 0; border-radius: 5px;">
                    <h3 style="margin: 0 0 10px 0; color: #667eea;">📦 Detalhes do Pedido</h3>
                    <p style="margin: 5px 0;"><strong>Número do Pedido:</strong> #{order.order_number}</p>
                    <p style="margin: 5px 0;"><strong>Data:</strong> {order.created_at.strftime('%d/%m/%Y às %H:%M')}</p>
                    <p style="margin: 5px 0;"><strong>Status:</strong> {order.get_status_display()}</p>
                </div>

                <!-- Order Items Table -->
                <h3 style="color: #333; border-bottom: 2px solid #667eea; padding-bottom: 10px;">Itens do Pedido</h3>
                <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                    <thead>
                        <tr style="background: #f8f9fa;">
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #667eea;">Produto</th>
                            <th style="padding: 12px; text-align: center; border-bottom: 2px solid #667eea;">Qtd</th>
                            <th style="padding: 12px; text-align: right; border-bottom: 2px solid #667eea;">Preço Unit.</th>
                            <th style="padding: 12px; text-align: right; border-bottom: 2px solid #667eea;">Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items_html}
                    </tbody>
                </table>

                <!-- Total -->
                <div style="text-align: right; margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 5px;">
                    <p style="margin: 5px 0; font-size: 14px;">Subtotal: {order.total_amount - order.shipping_cost:.2f} MZN</p>
                    <p style="margin: 5px 0; font-size: 14px;">Envio: {order.shipping_cost:.2f} MZN</p>
                    <p style="margin: 10px 0 0 0; font-size: 20px; font-weight: bold; color: #667eea;">
                        Total: {order.total_amount:.2f} MZN
                    </p>
                </div>

                <!-- Shipping Address -->
                <div style="background: #f8f9fa; padding: 15px; margin: 20px 0; border-radius: 5px;">
                    <h3 style="margin: 0 0 10px 0; color: #667eea;">🚚 Endereço de Entrega</h3>
                    <p style="margin: 5px 0;">{order.shipping_address.get('name', 'N/A')}</p>
                    <p style="margin: 5px 0;">{order.shipping_address.get('address', 'N/A')}</p>
                    <p style="margin: 5px 0;">{order.shipping_address.get('city', 'N/A')}, {order.shipping_address.get('province', 'N/A')}</p>
                    <p style="margin: 5px 0;">📱 {order.shipping_address.get('phone', 'N/A')}</p>
                </div>

                <!-- Next Steps -->
                <div style="background: #e8f4f8; border-left: 4px solid #17a2b8; padding: 15px; margin: 20px 0; border-radius: 5px;">
                    <h3 style="margin: 0 0 10px 0; color: #17a2b8;">📋 Próximos Passos</h3>
                    <ul style="margin: 0; padding-left: 20px;">
                        <li>Confirmaremos o pagamento em breve</li>
                        <li>Você receberá um email quando o pedido for enviado</li>
                        <li>Acompanhe o status na sua área de pedidos</li>
                    </ul>
                </div>

                <!-- CTA Button -->
                <div style="text-align: center; margin: 30px 0;">
                    <a href="https://chivacomputer.co.mz/meus-pedidos" 
                       style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 50px; font-weight: bold; font-size: 16px;">
                        Acompanhar Pedido
                    </a>
                </div>

                <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">

                <p style="font-size: 14px; color: #666; text-align: center;">
                    Dúvidas? Entre em contato: <a href="mailto:suporte@chivacomputer.co.mz" style="color: #667eea;">suporte@chivacomputer.co.mz</a>
                </p>
            </div>

            <!-- Footer -->
            <div style="background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 10px 10px;">
                <p style="margin: 0; font-size: 14px; color: #666;">
                    <strong>Chiva Computer</strong><br>
                    A sua loja de confiança em Moçambique<br>
                    📍 Maputo | 📧 contato@chivacomputer.co.mz
                </p>
            </div>

        </body>
        </html>
        """

        return self._send_email(
            to_email=customer_email,
            to_name=customer_name,
            subject=subject,
            html_content=html_content
        )

    def send_payment_status_update(
        self, 
        order, 
        payment_status: str,
        customer_email: str,
        customer_name: str
    ) -> bool:
        """
        Email de atualização do status de pagamento
        """
        if not settings.SEND_PAYMENT_STATUS:
            return False

        status_info = {
            'paid': {
                'emoji': '✅',
                'title': 'Pagamento Aprovado!',
                'message': 'Seu pagamento foi confirmado com sucesso. Estamos preparando seu pedido para envio.',
                'color': '#28a745',
                'bg_color': '#d4edda'
            },
            'pending': {
                'emoji': '⏳',
                'title': 'Pagamento Pendente',
                'message': 'Estamos aguardando a confirmação do pagamento. Isso pode levar alguns minutos.',
                'color': '#ffc107',
                'bg_color': '#fff3cd'
            },
            'failed': {
                'emoji': '❌',
                'title': 'Pagamento Não Aprovado',
                'message': 'Infelizmente o pagamento não foi aprovado. Por favor, tente novamente ou escolha outro método.',
                'color': '#dc3545',
                'bg_color': '#f8d7da'
            }
        }

        info = status_info.get(payment_status, status_info['pending'])
        
        subject = f"{info['emoji']} {info['title']} - Pedido #{order.order_number}"

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            
            <div style="background: {info['color']}; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="margin: 0; font-size: 32px;">{info['emoji']}</h1>
                <h2 style="margin: 10px 0 0 0; font-size: 24px;">{info['title']}</h2>
            </div>

            <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none;">
                
                <p style="font-size: 16px;">Olá <strong>{customer_name}</strong>,</p>
                
                <div style="background: {info['bg_color']}; border-left: 4px solid {info['color']}; padding: 15px; margin: 20px 0; border-radius: 5px;">
                    <p style="margin: 0; font-size: 16px;">{info['message']}</p>
                </div>

                <div style="background: #f8f9fa; padding: 15px; margin: 20px 0; border-radius: 5px;">
                    <p style="margin: 5px 0;"><strong>Número do Pedido:</strong> #{order.order_number}</p>
                    <p style="margin: 5px 0;"><strong>Status do Pagamento:</strong> {payment_status.upper()}</p>
                    <p style="margin: 5px 0;"><strong>Valor Total:</strong> {order.total_amount:.2f} MZN</p>
                </div>

                {'<div style="text-align: center; margin: 30px 0;"><a href="https://chivacomputer.co.mz/meus-pedidos" style="display: inline-block; background: ' + info["color"] + '; color: white; padding: 15px 40px; text-decoration: none; border-radius: 50px; font-weight: bold;">Acompanhar Pedido</a></div>' if payment_status != 'failed' else '<div style="text-align: center; margin: 30px 0;"><a href="https://chivacomputer.co.mz/carrinho" style="display: inline-block; background: ' + info["color"] + '; color: white; padding: 15px 40px; text-decoration: none; border-radius: 50px; font-weight: bold;">Tentar Novamente</a></div>'}

                <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">

                <p style="font-size: 14px; color: #666; text-align: center;">
                    Dúvidas? Entre em contato: <a href="mailto:suporte@chivacomputer.co.mz" style="color: #667eea;">suporte@chivacomputer.co.mz</a>
                </p>
            </div>

            <div style="background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 10px 10px;">
                <p style="margin: 0; font-size: 14px; color: #666;">
                    <strong>Chiva Computer</strong><br>
                    📧 contato@chivacomputer.co.mz
                </p>
            </div>

        </body>
        </html>
        """

        return self._send_email(
            to_email=customer_email,
            to_name=customer_name,
            subject=subject,
            html_content=html_content
        )

    def send_shipping_update(
        self,
        order,
        tracking_number: Optional[str],
        customer_email: str,
        customer_name: str
    ) -> bool:
        """
        Email de atualização de envio
        """
        if not settings.SEND_SHIPPING_UPDATES:
            return False

        subject = f"📦 Seu pedido foi enviado - #{order.order_number}"

        tracking_html = ""
        if tracking_number:
            tracking_html = f"""
            <div style="background: #e8f4f8; border-left: 4px solid #17a2b8; padding: 15px; margin: 20px 0; border-radius: 5px;">
                <h3 style="margin: 0 0 10px 0; color: #17a2b8;">🚚 Código de Rastreamento</h3>
                <p style="margin: 0; font-size: 18px; font-weight: bold; color: #17a2b8;">{tracking_number}</p>
            </div>
            """

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="margin: 0; font-size: 28px;">📦 Pedido Enviado!</h1>
                <p style="margin: 10px 0 0 0; font-size: 16px;">Seu pedido está a caminho</p>
            </div>

            <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none;">
                
                <p style="font-size: 16px;">Olá <strong>{customer_name}</strong>,</p>
                
                <p>Ótimas notícias! Seu pedido foi enviado e está a caminho do endereço de entrega.</p>

                {tracking_html}

                <div style="background: #f8f9fa; padding: 15px; margin: 20px 0; border-radius: 5px;">
                    <p style="margin: 5px 0;"><strong>Número do Pedido:</strong> #{order.order_number}</p>
                    <p style="margin: 5px 0;"><strong>Método de Envio:</strong> {order.get_shipping_method_display()}</p>
                </div>

                <div style="text-align: center; margin: 30px 0;">
                    <a href="https://chivacomputer.co.mz/meus-pedidos" 
                       style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 50px; font-weight: bold;">
                        Acompanhar Entrega
                    </a>
                </div>

                <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">

                <p style="font-size: 14px; color: #666; text-align: center;">
                    Dúvidas? Entre em contato: <a href="mailto:suporte@chivacomputer.co.mz" style="color: #667eea;">suporte@chivacomputer.co.mz</a>
                </p>
            </div>

            <div style="background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 10px 10px;">
                <p style="margin: 0; font-size: 14px; color: #666;">
                    <strong>Chiva Computer</strong>
                </p>
            </div>

        </body>
        </html>
        """

        return self._send_email(
            to_email=customer_email,
            to_name=customer_name,
            subject=subject,
            html_content=html_content
        )

    def send_cart_recovery_email(
        self,
        cart,
        customer_email: str,
        customer_name: str,
        recovery_url: str
    ) -> bool:
        """
        Email de recuperação de carrinho abandonado
        """
        if not settings.SEND_CART_RECOVERY:
            return False

        items_count = cart.items.count()
        total = cart.total

        subject = f"🛒 Você esqueceu algo no carrinho - Chiva Computer"

        # Listar alguns produtos
        items_html = ""
        for item in cart.items.all()[:3]:  # Máximo 3 produtos
            items_html += f"""
            <div style="display: flex; align-items: center; margin: 10px 0; padding: 10px; background: #f8f9fa; border-radius: 5px;">
                <div style="flex: 1;">
                    <p style="margin: 0; font-weight: bold;">{item.product.name}</p>
                    <p style="margin: 5px 0 0 0; font-size: 14px; color: #666;">
                        Quantidade: {item.quantity} | Preço: {item.price:.2f} MZN
                    </p>
                </div>
            </div>
            """

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="margin: 0; font-size: 28px;">🛒 Seu carrinho te espera!</h1>
                <p style="margin: 10px 0 0 0; font-size: 16px;">Não perca seus produtos favoritos</p>
            </div>

            <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none;">
                
                <p style="font-size: 16px;">Olá <strong>{customer_name}</strong>,</p>
                
                <p>Notamos que você deixou {items_count} {'item' if items_count == 1 else 'itens'} no seu carrinho. Ainda está interessado?</p>

                <div style="margin: 20px 0;">
                    {items_html}
                </div>

                <div style="background: #f8f9fa; padding: 15px; text-align: center; border-radius: 5px; margin: 20px 0;">
                    <p style="margin: 0; font-size: 14px; color: #666;">Total do Carrinho</p>
                    <p style="margin: 5px 0 0 0; font-size: 24px; font-weight: bold; color: #667eea;">
                        {total:.2f} MZN
                    </p>
                </div>

                <div style="text-align: center; margin: 30px 0;">
                    <a href="{recovery_url}" 
                       style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 50px; font-weight: bold; font-size: 16px;">
                        🛍️ Finalizar Compra Agora
                    </a>
                </div>

                <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px;">
                    <p style="margin: 0; font-size: 14px;">
                        ⚠️ <strong>Atenção:</strong> Os itens no seu carrinho têm estoque limitado. Complete sua compra antes que acabem!
                    </p>
                </div>

                <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">

                <p style="font-size: 14px; color: #666; text-align: center;">
                    Dúvidas? Entre em contato: <a href="mailto:suporte@chivacomputer.co.mz" style="color: #667eea;">suporte@chivacomputer.co.mz</a>
                </p>
            </div>

            <div style="background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 10px 10px;">
                <p style="margin: 0; font-size: 14px; color: #666;">
                    <strong>Chiva Computer</strong>
                </p>
            </div>

        </body>
        </html>
        """

        return self._send_email(
            to_email=customer_email,
            to_name=customer_name,
            subject=subject,
            html_content=html_content
        )

    # ========================================
    # EMAILS PARA ADMIN
    # ========================================

    def send_new_order_notification_to_admin(self, order) -> bool:
        """
        Notificar admin sobre nova venda
        """
        if not settings.SEND_ADMIN_NOTIFICATIONS:
            return False

        subject = f"🔔 Nova Venda #{order.order_number} - {order.total_amount:.2f} MZN"

        # Listar items
        items_html = ""
        for item in order.items.all():
            items_html += f"""
            <tr>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;">{item.product_name}</td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">{item.quantity}</td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">{item.subtotal:.2f} MZN</td>
            </tr>
            """

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            
            <h2 style="color: #28a745;">🎉 Nova Venda Recebida!</h2>
            
            <p><strong>Pedido:</strong> #{order.order_number}</p>
            <p><strong>Data:</strong> {order.created_at.strftime('%d/%m/%Y às %H:%M')}</p>
            <p><strong>Cliente:</strong> {order.shipping_address.get('name', 'N/A')}</p>
            <p><strong>Email:</strong> {order.shipping_address.get('email', 'N/A')}</p>
            <p><strong>Telefone:</strong> {order.shipping_address.get('phone', 'N/A')}</p>
            
            <h3>Endereço de Entrega:</h3>
            <p>
                {order.shipping_address.get('address', 'N/A')}<br>
                {order.shipping_address.get('city', 'N/A')}, {order.shipping_address.get('province', 'N/A')}
            </p>

            <h3>Itens do Pedido:</h3>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <thead>
                    <tr style="background: #f8f9fa;">
                        <th style="padding: 8px; text-align: left; border-bottom: 2px solid #28a745;">Produto</th>
                        <th style="padding: 8px; text-align: center; border-bottom: 2px solid #28a745;">Qtd</th>
                        <th style="padding: 8px; text-align: right; border-bottom: 2px solid #28a745;">Total</th>
                    </tr>
                </thead>
                <tbody>
                    {items_html}
                </tbody>
            </table>

            <p style="font-size: 18px; font-weight: bold; color: #28a745;">
                Total: {order.total_amount:.2f} MZN
            </p>

            <hr>
            <p style="font-size: 12px; color: #666;">
                Este é um email automático do sistema Chiva Computer.
            </p>

        </body>
        </html>
        """

        return self._send_email(
            to_email=self.admin_email,
            to_name="Admin Chiva",
            subject=subject,
            html_content=html_content
        )


# Singleton instance
_email_service = None

def get_email_service() -> EmailService:
    """
    Retorna a instância singleton do EmailService
    """
    global _email_service
    if _email_service is None:
        _email_service = EmailService()
    return _email_service
