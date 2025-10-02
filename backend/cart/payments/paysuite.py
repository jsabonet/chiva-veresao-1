import requests
import os
import hmac
import hashlib
import json

# Default base URL per docs: https://paysuite.tech/api
PAYSUITE_BASE_URL = os.getenv('PAYSUITE_BASE_URL', 'https://paysuite.tech/api')
PAYSUITE_API_KEY = os.getenv('PAYSUITE_API_KEY')
# Prefer dedicated webhook secret; keep backward compatibility with legacy var name
PAYSUITE_WEBHOOK_SECRET = os.getenv('PAYSUITE_WEBHOOK_SECRET') or os.getenv('PAYSUITE_API_SECRET')


class PaysuiteClient:
    """Minimal Paysuite client for initiating payments and verifying callbacks.

    Notes:
    - This is a small wrapper; adapt to Paysuite's actual API when you have their docs.
    - Expects JSON responses.
    """

    def __init__(self, base_url=None, api_key=None, api_secret=None, webhook_secret=None):
        self.base_url = base_url or PAYSUITE_BASE_URL
        self.api_key = api_key or PAYSUITE_API_KEY
        # api_secret kept for compatibility; webhook_secret preferred for signatures
        self.api_secret = api_secret or None
        self.webhook_secret = webhook_secret or PAYSUITE_WEBHOOK_SECRET
        self.session = requests.Session()
        if self.api_key:
            self.session.headers.update({'Authorization': f'Bearer {self.api_key}'})
        self.session.headers.update({'Content-Type': 'application/json'})

    def create_payment(self, *, amount, method=None, reference: str, description: str | None = None,
                       return_url: str | None = None, callback_url: str | None = None, 
                       msisdn: str | None = None, direct_payment: bool = False, **kwargs) -> dict:
        """Create a payment request on Paysuite and return the response dict.

        Docs expect fields: amount (numeric, MZN), optional method (credit_card|mpesa|emola),
        reference (required), optional description, optional return_url, optional callback_url.
        Response format: { status: 'success'|'error', data?: {...}, message?: str }
        """
        url = f"{self.base_url}/v1/payments"
        payload: dict = {
            'amount': float(amount),  # ensure numeric type
            'reference': reference,
        }
        if method:
            payload['method'] = method
        if description:
            payload['description'] = description
        if return_url:
            payload['return_url'] = return_url
        if callback_url:
            payload['callback_url'] = callback_url
        if msisdn:
            payload['msisdn'] = msisdn
            
        # For direct payments, add specific flags - but test different approaches
        if direct_payment:
            # Test mode determines which flags to send
            test_mode = os.getenv('PAYSUITE_TEST_MODE', 'clean')
            
            if test_mode == 'direct_v1':
                payload['direct'] = True
            elif test_mode == 'direct_v2':
                payload['push'] = True
            elif test_mode == 'direct_v3':
                payload['mobile_payment'] = True
            elif test_mode == 'clean':
                # Don't add any special flags, just send msisdn
                pass
            else:
                # Default: original approach
                payload['direct'] = True
                
            # Remove return_url for mobile payments to avoid redirects
            payload.pop('return_url', None)
            
        # Add any additional fields from kwargs (card data, bank data, etc.)
        for key, value in kwargs.items():
            if value is not None:
                payload[key] = value

        print(f"🌐 PAYSUITE CLIENT - URL: {url}")
        print(f"🌐 PAYSUITE CLIENT - PAYLOAD: {json.dumps(payload, indent=2)}")
        print(f"🌐 PAYSUITE CLIENT - HEADERS: {dict(self.session.headers)}")
        
        resp = self.session.post(url, data=json.dumps(payload), timeout=15)
        
        print(f"🌐 PAYSUITE CLIENT - STATUS: {resp.status_code}")
        print(f"🌐 PAYSUITE CLIENT - RESPONSE: {resp.text}")
        
        resp.raise_for_status()
        return resp.json()

    def verify_signature(self, payload_body: bytes, signature_header: str) -> bool:
        """Verify HMAC signature using webhook secret.
        - Assumes signature is HMAC-SHA256 of raw body with secret, hex-encoded.
        - Also accepts header formats like: "t=...,v1=<hexdigest>" and extracts v1.
        """
        secret = self.webhook_secret or self.api_secret
        if not secret or not signature_header:
            return False

        # Extract possible v1 signature if header is in the form "t=...,v1=..."
        sig_value = signature_header
        if 'v1=' in signature_header:
            try:
                parts = dict(
                    p.split('=', 1) for p in signature_header.split(',') if '=' in p
                )
                sig_value = parts.get('v1', sig_value)
            except Exception:
                # Fallback to raw header if parsing fails
                sig_value = signature_header

        computed = hmac.new(secret.encode('utf-8'), payload_body, hashlib.sha256).hexdigest()
        return hmac.compare_digest(computed, sig_value)
