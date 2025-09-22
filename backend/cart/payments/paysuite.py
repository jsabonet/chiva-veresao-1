import requests
import os
import hmac
import hashlib
import json

PAYSUITE_BASE_URL = os.getenv('PAYSUITE_BASE_URL', 'https://api.paysuite.co.mz')
PAYSUITE_API_KEY = os.getenv('PAYSUITE_API_KEY')
PAYSUITE_API_SECRET = os.getenv('PAYSUITE_API_SECRET')


class PaysuiteClient:
    """Minimal Paysuite client for initiating payments and verifying callbacks.

    Notes:
    - This is a small wrapper; adapt to Paysuite's actual API when you have their docs.
    - Expects JSON responses.
    """

    def __init__(self, base_url=None, api_key=None, api_secret=None):
        self.base_url = base_url or PAYSUITE_BASE_URL
        self.api_key = api_key or PAYSUITE_API_KEY
        self.api_secret = api_secret or PAYSUITE_API_SECRET
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
        """Verify HMAC signature (if Paysuite uses HMAC with API secret).
        - This implementation assumes signature is HMAC-SHA256 of body with api secret.
        - Adjust as needed to match Paysuite docs.
        """
        if not self.api_secret or not signature_header:
            return False
        computed = hmac.new(self.api_secret.encode('utf-8'), payload_body, hashlib.sha256).hexdigest()
        return hmac.compare_digest(computed, signature_header)
