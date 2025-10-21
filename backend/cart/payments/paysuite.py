import logging
import requests
import os
import hmac
import hashlib
import json
import time
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

# Default base URL per docs: https://paysuite.tech/api
PAYSUITE_BASE_URL = os.getenv('PAYSUITE_BASE_URL', 'https://paysuite.tech/api')
PAYSUITE_API_KEY = os.getenv('PAYSUITE_API_KEY')
# Prefer dedicated webhook secret; keep backward compatibility with legacy var name
PAYSUITE_WEBHOOK_SECRET = os.getenv('PAYSUITE_WEBHOOK_SECRET') or os.getenv('PAYSUITE_API_SECRET')

# Simple in-memory cache for payment status queries (avoid rate limits)
_status_cache = {}
_CACHE_TTL = 30  # Cache status queries for 30 seconds (reduces from 20 req/min to 2 req/min)


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
        # Configure a conservative retry strategy for network/connectivity errors.
        # Note: we don't retry POST by default because it may not be idempotent.
        try:
            retries = Retry(
                total=int(os.getenv('PAYSUITE_RETRY_TOTAL', '2')),
                backoff_factor=float(os.getenv('PAYSUITE_RETRY_BACKOFF', '0.5')),
                status_forcelist=[502, 503, 504],
                allowed_methods=frozenset(['GET', 'HEAD', 'OPTIONS'])
            )
            adapter = HTTPAdapter(max_retries=retries)
            self.session.mount('https://', adapter)
            self.session.mount('http://', adapter)
        except Exception:
            # If urllib3/requests versions differ or Retry not available, skip mounting retries.
            pass
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
        
        timeout = float(os.getenv('PAYSUITE_TIMEOUT', '15'))
        try:
            resp = self.session.post(url, data=json.dumps(payload), timeout=timeout)
            print(f"🌐 PAYSUITE RESPONSE - STATUS: {resp.status_code}")
            print(f"🌐 PAYSUITE RESPONSE - HEADERS: {dict(resp.headers)}")
            print(f"🌐 PAYSUITE RESPONSE - BODY: {resp.text[:500]}")
            logging.debug("🌐 PAYSUITE CLIENT - STATUS: %s", resp.status_code)
            logging.debug("🌐 PAYSUITE CLIENT - RESPONSE: %s", resp.text)
            resp.raise_for_status()
            
            # Tentar parsear JSON
            if resp.text.strip():
                return resp.json()
            else:
                logging.error("PaySuite returned empty response")
                return {'status': 'error', 'message': 'Empty response from PaySuite', 'http_status': resp.status_code}
        except requests.exceptions.ConnectTimeout as e:
            logging.error("Failed to initiate payment (connect timeout): %s", e)
            raise
        except requests.exceptions.ReadTimeout as e:
            logging.error("Failed to initiate payment (read timeout): %s", e)
            raise
        except requests.exceptions.ConnectionError as e:
            logging.error("Failed to initiate payment (connection error): %s", e)
            raise
        except requests.exceptions.HTTPError as e:
            # Non-2xx response from Paysuite
            logging.error("Paysuite returned HTTP error: %s - response: %s", e, getattr(e.response, 'text', None))
            raise
        except requests.exceptions.RequestException as e:
            # Catch-all for other requests-related errors
            logging.error("Failed to initiate payment: %s", e)
            raise

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

    def get_payment_status(self, payment_id: str) -> dict:
        """Query PaySuite API to get payment status.
        
        This is a fallback when webhooks don't arrive. Polls the PaySuite API
        to check the current status of a payment.
        
        Uses caching to avoid rate limits: only queries API if cache is stale (>30s).
        Uses proxy because direct connection to paysuite.tech is blocked by server firewall.
        
        Args:
            payment_id: The PaySuite payment ID (reference from raw_response.data.id)
            
        Returns:
            dict with structure: { status: 'success'|'error', data: { id, status, ... } }
        """
        # Check cache first
        cache_key = f"status_{payment_id}"
        now = time.time()
        if cache_key in _status_cache:
            cached_data, cached_time = _status_cache[cache_key]
            if now - cached_time < _CACHE_TTL:
                logging.debug(f"🔍 Using cached status for payment {payment_id} (age: {now - cached_time:.1f}s)")
                return cached_data
        
        # Use the proxy with cache to avoid rate limits
        # The 10s cache reduces requests from 20/min to 6/min
        url = f"{self.base_url}/v1/payments/{payment_id}"
        
        print(f"🔍 [PAYSUITE] Polling PaySuite status for payment {payment_id}")
        print(f"🔍 [PAYSUITE] URL: {url}")
        logging.info(f"🔍 Polling PaySuite status for payment {payment_id} (via proxy with cache)")
        
        try:
            # Use existing session (already configured with proxy)
            print(f"🔍 [PAYSUITE] Sending GET request...")
            resp = self.session.get(url)
            print(f"🔍 [PAYSUITE] Response status: {resp.status_code}")
            print(f"🔍 [PAYSUITE] Response body: {resp.text[:500]}")
            logging.debug(f"🔍 PaySuite status response: {resp.status_code} - {resp.text[:200]}")
            
            # Handle error responses before raise_for_status
            if resp.status_code >= 400:
                # Try to parse error response
                try:
                    error_data = resp.json()
                    error_msg = error_data.get('message') or error_data.get('error') or f'HTTP {resp.status_code}'
                except:
                    error_msg = f'HTTP {resp.status_code}: {resp.text[:100]}'
                
                logging.error(f"PaySuite API error {resp.status_code}: {error_msg}")
                
                # Special handling for rate limit
                if resp.status_code == 429:
                    logging.warning(f"⚠️ Rate limit hit for payment {payment_id} - will retry on next poll")
                    # Return cached data if available, even if stale
                    if cache_key in _status_cache:
                        cached_data, _ = _status_cache[cache_key]
                        logging.info(f"📦 Returning stale cache for payment {payment_id} due to rate limit")
                        return cached_data
                
                return {
                    'status': 'error',
                    'message': error_msg,
                    'code': resp.status_code
                }
            
            result = resp.json()
            print(f"🔍 [PAYSUITE] Parsed JSON: {json.dumps(result, indent=2)[:500]}")
            
            # Cache the result
            _status_cache[cache_key] = (result, now)
            
            return result
        except requests.exceptions.HTTPError as e:
                logging.warning(f"⚠️ Rate limit hit for payment {payment_id} - will retry on next poll")
                # Return cached data if available, even if stale
                if cache_key in _status_cache:
                    cached_data, _ = _status_cache[cache_key]
                    logging.info(f"📦 Returning stale cache for payment {payment_id} due to rate limit")
                    return cached_data
                
                return {
                    'status': 'error',
                    'message': 'Rate limit exceeded',
                    'code': 429
                }
        
        except requests.exceptions.RequestException as e:
            logging.error(f"Failed to get payment status from PaySuite: {e}")
            # Return error structure compatible with create_payment
            return {
                'status': 'error',
                'message': f'Failed to query payment status: {str(e)}'
            }
