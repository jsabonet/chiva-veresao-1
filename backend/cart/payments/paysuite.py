import requests
import os
import hmac
import hashlib
import json

PAYSUITE_BASE_URL = os.getenv('PAYSUITE_BASE_URL', 'https://api.paysuite.co.mz')
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

    def create_payment(self, amount, currency='MZN', method='mpesa', customer=None, metadata=None, callback_url=None):
        """Create a payment request on Paysuite and return the response dict.

        Returns dict with at least 'reference' and 'redirect_url' (if applicable).
        """
        url = f"{self.base_url}/v1/payments"
        payload = {
            'amount': str(amount),
            'currency': currency,
            'method': method,
            'customer': customer or {},
            'metadata': metadata or {},
            'callback_url': callback_url,
        }
        resp = self.session.post(url, data=json.dumps(payload), timeout=15)
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
