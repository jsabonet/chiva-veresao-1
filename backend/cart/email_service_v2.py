"""
Serviço de Email usando Brevo (Sendinblue) - TOTALMENTE GRATUITO
300 emails/dia sem custo
"""

import logging
import os
from pathlib import Path
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
        
        # Diretório dos templates
        self.templates_dir = Path(__file__).parent / 'email_templates'

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

    def _load_template(self, template_name: str) -> str:
        """
        Carrega template HTML do arquivo
        """
        template_path = self.templates_dir / template_name
        try:
            with open(template_path, 'r', encoding='utf-8') as f:
                return f.read()
        except FileNotFoundError:
            logger.error(f"Template não encontrado: {template_path}")
            return ""
        except Exception as e:
            logger.error(f"Erro ao carregar template {template_name}: {e}")
            return ""

    def _render_template(self, template_html: str, context: Dict[str, str]) -> str:
        """
        Substitui variáveis {{VAR_NAME}} no template pelos valores do context
        """
        rendered = template_html
        for key, value in context.items():
            placeholder = f"{{{{{key}}}}}"  # {{KEY}}
            rendered = rendered.replace(placeholder, str(value))
        return rendered

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
        
        # Carregar template
        template = self._load_template('order_confirmation.html')
        if not template:
            return False
        
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

        # Context com todas as variáveis do template
        context = {
            'CUSTOMER_NAME': customer_name,
            'ORDER_NUMBER': order.order_number,
            'ORDER_DATE': order.created_at.strftime('%d/%m/%Y às %H:%M'),
            'ORDER_STATUS': order.get_status_display(),
            'ORDER_ITEMS': items_html,
            'SUBTOTAL': f"{order.total_amount:.2f}",
            'SHIPPING_COST': f"{order.shipping_cost:.2f}",
            'TOTAL_AMOUNT': f"{order.total_amount + order.shipping_cost:.2f}",
            'SHIPPING_ADDRESS': f"{order.shipping_address}, {order.shipping_city}",
            'PAYMENT_METHOD': order.payment_method.upper() if order.payment_method else 'N/A',
        }

        html_content = self._render_template(template, context)
        return self._send_email(customer_email, customer_name, subject, html_content)


    def send_payment_status_update(
        self,
        order,
        customer_email: str,
        customer_name: str,
        payment_status: str
    ) -> bool:
        """
        Email de atualização de status de pagamento
        """
        if not settings.SEND_PAYMENT_STATUS:
            return False

        # Carregar template
        template = self._load_template('payment_status.html')
        if not template:
            return False

        # Configurações por status
        status_config = {
            'approved': {
                'emoji': '✅',
                'title': 'Pagamento Aprovado!',
                'message': 'Ótimas notícias! Seu pagamento foi confirmado e seu pedido está sendo processado.',
                'header_color': 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                'bg_color': '#d1fae5',
                'cta_text': 'Acompanhar Pedido',
                'cta_url': 'https://chivacomputer.co.mz/meus-pedidos'
            },
            'pending': {
                'emoji': '⏳',
                'title': 'Pagamento Pendente',
                'message': 'Estamos aguardando a confirmação do seu pagamento. Isso pode levar alguns minutos.',
                'header_color': 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                'bg_color': '#fef3c7',
                'cta_text': 'Verificar Status',
                'cta_url': 'https://chivacomputer.co.mz/meus-pedidos'
            },
            'failed': {
                'emoji': '❌',
                'title': 'Pagamento Não Aprovado',
                'message': 'Infelizmente seu pagamento não foi aprovado. Por favor, tente novamente ou use outro método de pagamento.',
                'header_color': 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                'bg_color': '#fee2e2',
                'cta_text': 'Tentar Novamente',
                'cta_url': 'https://chivacomputer.co.mz/checkout'
            }
        }

        config = status_config.get(payment_status, status_config['pending'])
        subject = f"{config['emoji']} {config['title']} - Pedido #{order.order_number}"

        context = {
            'CUSTOMER_NAME': customer_name,
            'STATUS_EMOJI': config['emoji'],
            'STATUS_TITLE': config['title'],
            'STATUS_MESSAGE': config['message'],
            'HEADER_COLOR': config['header_color'],
            'BG_COLOR': config['bg_color'],
            'ORDER_NUMBER': order.order_number,
            'PAYMENT_STATUS': payment_status.upper(),
            'TOTAL_AMOUNT': f"{order.total_amount:.2f}",
            'CTA_TEXT': config['cta_text'],
            'CTA_URL': config['cta_url']
        }

        html_content = self._render_template(template, context)
        return self._send_email(customer_email, customer_name, subject, html_content)


    def send_shipping_update(
        self,
        order,
        customer_email: str,
        customer_name: str,
        tracking_number: Optional[str] = None
    ) -> bool:
        """
        Email de atualização de envio
        """
        if not settings.SEND_SHIPPING_UPDATE:
            return False

        subject = f"📦 Pedido #{order.order_number} Enviado - Chiva Computer"
        
        # Carregar template
        template = self._load_template('shipping_update.html')
        if not template:
            return False

        # Seção de rastreamento (se disponível)
        tracking_section = ""
        if tracking_number:
            tracking_section = f"""
            <table width="100%" cellpadding="15" cellspacing="0" style="background: #d1fae5; border-left: 4px solid #10b981; border-radius: 5px; margin: 25px 0;">
                <tr>
                    <td style="text-align: center;">
                        <p style="margin: 0 0 10px 0; font-size: 14px; color: #065f46;">
                            <strong>Código de Rastreamento:</strong>
                        </p>
                        <p style="margin: 0; font-size: 24px; font-weight: bold; color: #10b981; letter-spacing: 2px;">
                            {tracking_number}
                        </p>
                    </td>
                </tr>
            </table>
            """

        context = {
            'CUSTOMER_NAME': customer_name,
            'ORDER_NUMBER': order.order_number,
            'SHIPPING_METHOD': order.shipping_method or 'Entrega Padrão',
            'TRACKING_SECTION': tracking_section
        }

        html_content = self._render_template(template, context)
        return self._send_email(customer_email, customer_name, subject, html_content)


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

        subject = f"🛒 {customer_name}, seu carrinho te espera na Chiva Computer!"
        
        # Carregar template
        template = self._load_template('cart_recovery.html')
        if not template:
            return False

        # Buscar items do carrinho
        cart_items = cart.items.all()
        items_count = cart_items.count()
        items_text = "item" if items_count == 1 else "itens"
        
        items_html = ""
        for item in cart_items:
            items_html += f"""
            <table width="100%" cellpadding="10" cellspacing="0" style="background: #f8f9fa; border-radius: 5px; margin: 10px 0;">
                <tr>
                    <td style="width: 70%;">
                        <strong>{item.product.name}</strong>
                        {f'<br><span style="color: #666; font-size: 14px;">Cor: {item.color.name}</span>' if item.color else ''}
                    </td>
                    <td style="text-align: center; color: #666;">
                        x{item.quantity}
                    </td>
                    <td style="text-align: right; font-weight: bold;">
                        {item.product.price * item.quantity:.2f} MZN
                    </td>
                </tr>
            </table>
            """

        context = {
            'CUSTOMER_NAME': customer_name,
            'ITEMS_COUNT': str(items_count),
            'ITEMS_TEXT': items_text,
            'CART_ITEMS': items_html,
            'CART_TOTAL': f"{cart.get_total():.2f}",
            'RECOVERY_URL': recovery_url
        }

        html_content = self._render_template(template, context)
        return self._send_email(customer_email, customer_name, subject, html_content)


    # ========================================
    # EMAILS PARA ADMIN
    # ========================================

    def send_new_order_notification_to_admin(self, order) -> bool:
        """
        Email de notificação de nova venda para o admin
        """
        if not settings.SEND_ADMIN_NEW_ORDER or not self.admin_email:
            return False

        subject = f"🎉 Nova Venda #{order.order_number} - Chiva Computer"
        
        # Carregar template
        template = self._load_template('admin_new_order.html')
        if not template:
            return False

        # Items do pedido
        order_items = order.items.all()
        items_html = ""
        for item in order_items:
            items_html += f"""
            <tr style="background: #ffffff;">
                <td style="padding: 10px; border-bottom: 1px solid #dee2e6;">
                    {item.product_name}
                    {f'<br><small style="color: #666;">Cor: {item.color_name}</small>' if item.color_name else ''}
                </td>
                <td style="text-align: center; padding: 10px; border-bottom: 1px solid #dee2e6;">
                    {item.quantity}
                </td>
                <td style="text-align: right; padding: 10px; border-bottom: 1px solid #dee2e6; font-weight: bold;">
                    {item.subtotal:.2f} MZN
                </td>
            </tr>
            """

        # Seção de ação necessária (se houver)
        action_section = ""
        if order.status == 'pending_payment':
            action_section = """
            <table width="100%" cellpadding="15" cellspacing="0" style="background: #fff3cd; border-left: 4px solid #ffc107; border-radius: 5px; margin: 25px 0;">
                <tr>
                    <td>
                        <p style="margin: 0; font-size: 14px; color: #856404;">
                            ⚠️ <strong>Ação Necessária:</strong> Aguardando confirmação de pagamento
                        </p>
                    </td>
                </tr>
            </table>
            """

        context = {
            'ORDER_NUMBER': order.order_number,
            'ORDER_DATE': order.created_at.strftime('%d/%m/%Y às %H:%M'),
            'CUSTOMER_NAME': order.customer_name or 'Não informado',
            'CUSTOMER_EMAIL': order.customer_email or 'Não informado',
            'CUSTOMER_PHONE': order.customer_phone or 'Não informado',
            'SHIPPING_ADDRESS': order.shipping_address or 'Não informado',
            'SHIPPING_CITY': order.shipping_city or '',
            'SHIPPING_PROVINCE': order.shipping_province or '',
            'ORDER_ITEMS': items_html,
            'TOTAL_AMOUNT': f"{order.total_amount:.2f}",
            'ACTION_SECTION': action_section
        }

        html_content = self._render_template(template, context)
        return self._send_email(self.admin_email, "Admin Chiva", subject, html_content)


# Instância global do serviço
_email_service = None

def get_email_service() -> EmailService:
    """
    Retorna instância singleton do EmailService
    """
    global _email_service
    if _email_service is None:
        _email_service = EmailService()
    return _email_service
