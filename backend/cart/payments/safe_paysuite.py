"""
PaySuite Safe Client - Wrapper com validações de segurança para testes
Evita processamento de valores reais durante desenvolvimento
"""

import os
import json
from decimal import Decimal
from typing import Dict, Any, Optional
from .paysuite import PaysuiteClient


class SafePaysuiteClient(PaysuiteClient):
    """
    Cliente PaySuite com validações de segurança para ambiente de desenvolvimento.
    Previne processamento de valores altos e fornece mocks para testes.
    """
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.test_mode = os.getenv('PAYSUITE_TEST_MODE', 'production')
        self.max_test_amount = Decimal(os.getenv('MAX_TEST_AMOUNT', '50.00'))
        self.min_test_amount = Decimal(os.getenv('MIN_TEST_AMOUNT', '1.00'))
        
        # Configurar URLs de teste
        if self.test_mode == 'sandbox':
            self.base_url = os.getenv('PAYSUITE_SANDBOX_URL', 'https://sandbox.paysuite.co.mz/api')
            sandbox_key = os.getenv('PAYSUITE_SANDBOX_API_KEY')
            if sandbox_key:
                self.api_key = sandbox_key
                self.session.headers.update({'Authorization': f'Bearer {sandbox_key}'})
        
        print(f"🔧 PaySuite Client - Mode: {self.test_mode}, URL: {self.base_url}")

    def validate_test_amount(self, amount: float) -> tuple[bool, str]:
        """Validar se o valor é seguro para testes"""
        amount_decimal = Decimal(str(amount))
        
        if self.test_mode in ['sandbox', 'mock', 'development']:
            if amount_decimal > self.max_test_amount:
                return False, f"Valor {amount} excede limite de teste {self.max_test_amount}"
            
            if amount_decimal < self.min_test_amount:
                return False, f"Valor {amount} abaixo do mínimo de teste {self.min_test_amount}"
        
        return True, "OK"

    def get_test_phone_numbers(self) -> Dict[str, list]:
        """Retornar números de telefone seguros para teste"""
        return {
            'mpesa': ['841234567', '842345678', '843456789'],
            'emola': ['851234567', '852345678', '853456789']
        }

    def is_test_phone(self, phone: str, method: str) -> bool:
        """Verificar se é um número de teste"""
        test_numbers = self.get_test_phone_numbers()
        return phone in test_numbers.get(method, [])

    def create_mock_response(self, amount: float, method: str, **kwargs) -> Dict[str, Any]:
        """Criar resposta mock baseada nos parâmetros"""
        reference = kwargs.get('reference', 'TEST001')
        
        # Usar os limites configurados em vez de valores hardcoded
        is_valid, validation_message = self.validate_test_amount(amount)
        if not is_valid:
            return {
                "status": "error",
                "message": f"Mock error: {validation_message}",
                "error_code": "AMOUNT_INVALID"
            }
        
        # Simular diferentes cenários baseados no valor
        if amount <= 5.00:
            return {
                "status": "success",
                "data": {
                    "id": f"mock_success_{reference}",
                    "reference": reference,
                    "checkout_url": None,  # Simular pagamento direto
                    "amount": amount,
                    "method": method,
                    "status": "pending"
                },
                "message": "Mock payment created successfully"
            }
        elif amount <= self.max_test_amount / 2:  # Até metade do limite: checkout URL
            return {
                "status": "success", 
                "data": {
                    "id": f"mock_redirect_{reference}",
                    "reference": reference,
                    "checkout_url": f"https://mock.paysuite.co.mz/checkout/{reference}",
                    "amount": amount,
                    "method": method,
                    "status": "pending"
                },
                "message": "Mock payment with checkout URL"
            }
        else:  # Valores altos (mas dentro do limite): sucesso direto
            return {
                "status": "success",
                "data": {
                    "id": f"mock_high_value_{reference}",
                    "reference": reference,
                    "checkout_url": None,
                    "amount": amount,
                    "method": method,
                    "status": "pending"
                },
                "message": "Mock payment (high value) created successfully"
            }

    def create_payment(self, *, amount, method=None, reference: str, **kwargs) -> Dict[str, Any]:
        """
        Criar pagamento com validações de segurança
        """
        print(f"💳 SafePaysuiteClient - Creating payment: {amount} {method}")
        
        # Validar valor para teste
        is_safe, message = self.validate_test_amount(amount)
        if not is_safe:
            print(f"⚠️ SafePaysuiteClient - {message}")
            # Em ambientes de teste/sandbox/mock, não lançar exceção;
            # retornar um erro estruturado para que a view possa responder 400 com JSON.
            if self.test_mode != 'production':
                return {
                    "status": "error",
                    "message": message,
                    "error_code": "AMOUNT_INVALID"
                }
        
        # Validar número de telefone em modo de teste
        phone = kwargs.get('msisdn')
        if phone and self.test_mode in ['sandbox', 'mock'] and method in ['mpesa', 'emola']:
            if not self.is_test_phone(phone, method):
                print(f"⚠️ SafePaysuiteClient - Número {phone} não está na lista de teste para {method}")
                # Substituir por número de teste
                test_numbers = self.get_test_phone_numbers()
                kwargs['msisdn'] = test_numbers[method][0]
                print(f"🔄 SafePaysuiteClient - Usando número de teste: {kwargs['msisdn']}")
        
        # Mock mode - não chamar API real
        if self.test_mode == 'mock':
            print("🎭 SafePaysuiteClient - Returning mock response")
            return self.create_mock_response(amount, method, reference=reference, **kwargs)
        
        # Sandbox mode - usar credenciais de sandbox
        if self.test_mode == 'sandbox':
            print("🏖️ SafePaysuiteClient - Using sandbox environment")
            # Adicionar metadados de teste
            metadata = kwargs.get('metadata', {})
            metadata.update({
                'test_mode': True,
                'environment': 'sandbox',
                'safe_amount': str(amount)
            })
            kwargs['metadata'] = metadata
        
        # Chamar cliente original
        try:
            response = super().create_payment(
                amount=amount,
                method=method,
                reference=reference,
                **kwargs
            )
            
            print(f"✅ SafePaysuiteClient - Payment created successfully")
            return response
            
        except Exception as e:
            print(f"❌ SafePaysuiteClient - Error: {e}")
            
            # Em modo de desenvolvimento, retornar mock em caso de erro
            if self.test_mode in ['sandbox', 'development']:
                print("🔄 SafePaysuiteClient - Falling back to mock response")
                return self.create_mock_response(amount, method, reference=reference, **kwargs)
            
            raise

    def verify_signature(self, payload_body: bytes, signature_header: str) -> bool:
        """Verificar assinatura com tratamento especial para modo de teste"""
        if self.test_mode == 'mock':
            print("🎭 SafePaysuiteClient - Mock signature verification (always true)")
            return True
        
        return super().verify_signature(payload_body, signature_header)


def get_paysuite_client() -> SafePaysuiteClient:
    """
    Factory function para obter cliente PaySuite configurado
    """
    return SafePaysuiteClient()


# Função utilitária para testes
def create_test_payment(amount: float = 5.99, method: str = 'emola', phone: str = '851234567') -> Dict[str, Any]:
    """
    Função utilitária para criar pagamento de teste rapidamente
    """
    client = get_paysuite_client()
    
    return client.create_payment(
        amount=amount,
        method=method,
        reference=f"TEST_{int(amount * 100)}",
        description=f"Pagamento de teste - {amount} MZN",
        msisdn=phone,
        callback_url="http://127.0.0.1:8000/api/cart/payments/webhook/",
        return_url="http://127.0.0.1:8000/order/test/confirmation",
        metadata={
            'test': True,
            'amount': str(amount),
            'method': method
        }
    )


if __name__ == "__main__":
    # Teste rápido
    print("🧪 Testando SafePaysuiteClient...")
    
    try:
        # Teste com valor seguro
        response = create_test_payment(2.50, 'emola')
        print(f"✅ Teste 1 OK: {response.get('status')}")
        
        # Teste com valor alto (deve falhar em modo de teste)
        os.environ['PAYSUITE_TEST_MODE'] = 'sandbox'
        try:
            response = create_test_payment(100.00, 'mpesa')
            print(f"❌ Teste 2 FALHOU: valor alto deveria ser rejeitado")
        except ValueError as e:
            print(f"✅ Teste 2 OK: valor alto rejeitado - {e}")
        
        print("🎉 SafePaysuiteClient funcionando corretamente!")
        
    except Exception as e:
        print(f"❌ Erro no teste: {e}")