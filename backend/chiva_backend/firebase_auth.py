"""
Firebase Authentication for Django REST Framework
Validates Firebase ID tokens and creates/gets Django users
"""
import firebase_admin
from firebase_admin import auth, credentials
from django.contrib.auth.models import User
from rest_framework import authentication, exceptions
from django.conf import settings
from decouple import config
import os
from pathlib import Path
from dotenv import load_dotenv

# Ensure .env in backend/ is loaded so os.getenv() and decouple can read vars during import
BASE_DIR = Path(__file__).resolve().parent.parent
env_path = BASE_DIR / '.env'
if env_path.exists():
    load_dotenv(env_path)

PROJECT_ID = config('FIREBASE_PROJECT_ID', default='chiva-computer')

def _init_firebase():
    """Initialize Firebase Admin in a resilient way.
    Priority:
      1. SERVICE_ACCOUNT_JSON path from env (absolute or relative)
      2. Raw JSON in FIREBASE_SERVICE_ACCOUNT_JSON env
      3. Fallback initialize without credentials (only token verification using public certs)
    
    Environment variables:
      - FIREBASE_SERVICE_ACCOUNT_JSON_PATH: Path to service account JSON file
      - FIREBASE_SERVICE_ACCOUNT_JSON: Raw service account JSON
      - FIREBASE_PROJECT_ID: Firebase project ID
      - DEV_FIREBASE_ACCEPT_UNVERIFIED: Set to 1 to bypass token verification in dev
      - ENABLE_TOKEN_PAYLOAD_DEBUG: Set to 1 to enable token debug logging
    """
    if firebase_admin._apps:
        return

    service_account_path = os.getenv('FIREBASE_SERVICE_ACCOUNT_JSON_PATH')
    raw_json = os.getenv('FIREBASE_SERVICE_ACCOUNT_JSON')

    try:
        if service_account_path and os.path.exists(service_account_path):
            cred = credentials.Certificate(service_account_path)
            firebase_admin.initialize_app(cred, {'projectId': PROJECT_ID})
            print('[Firebase] Initialized with service account file')
            return
        if raw_json:
            import json
            cred = credentials.Certificate(json.loads(raw_json))
            firebase_admin.initialize_app(cred, {'projectId': PROJECT_ID})
            print('[Firebase] Initialized with raw JSON service account')
            return
        # Fallback: initialize without explicit credentials (will use public certs for verify_id_token)
        firebase_admin.initialize_app(options={'projectId': PROJECT_ID})
        print('[Firebase] Initialized without service account (public cert mode)')
    except Exception as e:
        # Last resort: log and leave firebase uninitialized (auth will gracefully fail returning None)
        print(f'[Firebase] Initialization failed: {e}')

_init_firebase()


class FirebaseAuthentication(authentication.BaseAuthentication):
    """
    Custom authentication class for Firebase ID tokens
    """
    
    def authenticate(self, request):
        """
        Authenticate the request using Firebase ID token
        """
        auth_header = authentication.get_authorization_header(request)
        
        if not auth_header:
            return None
        
        try:
            # Expected format: "Bearer <token>"
            auth_header_decoded = auth_header.decode('utf-8')
            if not auth_header_decoded.startswith('Bearer '):
                return None
                
            token = auth_header_decoded.split(' ')[1]
            if not token.strip():
                return None
            
        except (UnicodeDecodeError, IndexError):
            # Return None instead of raising exception for malformed headers
            # This allows other authentication classes to handle the request
            return None
        
        return self.authenticate_credentials(token)
    
    def authenticate_credentials(self, token):
        """
        Validate Firebase token and get/create Django user
        """
        try:
            print('[FirebaseAuth][DEBUG] Processing token (first 25 chars):', token[:25])
            
            # Verifica se o bypass está ativo (leitura via python-decouple para garantir .env)
            try:
                dev_bypass = config('DEV_FIREBASE_ACCEPT_UNVERIFIED', default='0', cast=bool)
            except Exception:
                # Fallback to env if decouple misconfigured
                dev_bypass = os.getenv('DEV_FIREBASE_ACCEPT_UNVERIFIED', '0').lower() in ['1', 'true']

            # Debug prints for both decouple and raw env so logs are informative
            try:
                raw_dev = config('DEV_FIREBASE_ACCEPT_UNVERIFIED', default=None)
            except Exception:
                raw_dev = os.getenv('DEV_FIREBASE_ACCEPT_UNVERIFIED')

            try:
                token_debug_flag = config('ENABLE_TOKEN_PAYLOAD_DEBUG', default='0', cast=bool)
            except Exception:
                token_debug_flag = os.getenv('ENABLE_TOKEN_PAYLOAD_DEBUG', '0').lower() in ['1', 'true']

            print('[FirebaseAuth][DEBUG] DEV_FIREBASE_ACCEPT_UNVERIFIED (decouple) =', raw_dev)
            print('[FirebaseAuth][DEBUG] DEV_FIREBASE_ACCEPT_UNVERIFIED (effective bool) =', dev_bypass)
            print('[FirebaseAuth][DEBUG] ENABLE_TOKEN_PAYLOAD_DEBUG =', token_debug_flag)

            if dev_bypass:
                print('[FirebaseAuth][DEBUG] Starting unverified decode')
                import base64, json
                try:
                    # Divide o token e pega o payload
                    parts = token.split('.')
                    if len(parts) != 3:
                        print('[FirebaseAuth][ERROR] Malformed JWT - need 3 parts')
                        return None
                        
                    # Decodifica payload com padding correto
                    payload_b64 = parts[1]
                    missing_padding = len(payload_b64) % 4
                    if missing_padding:
                        payload_b64 += '=' * (4 - missing_padding)
                        
                    # Converte para JSON
                    try:
                        payload_bytes = base64.urlsafe_b64decode(payload_b64)
                        decoded_token = json.loads(payload_bytes.decode('utf-8'))
                        print('[FirebaseAuth][DEV BYPASS] Successfully decoded payload')
                        print('[FirebaseAuth][DEV BYPASS] Available fields:', list(decoded_token.keys()))
                    except Exception as e:
                        print('[FirebaseAuth][DEV BYPASS] JSON decode failed:', str(e))
                        return None
                    
                    # Procura UID nos campos possíveis
                    firebase_uid = None
                    for field in ['sub', 'user_id', 'uid']:
                        if field in decoded_token:
                            firebase_uid = decoded_token[field]
                            print(f'[FirebaseAuth][DEV BYPASS] Found UID in {field}:', firebase_uid)
                            break
                    
                    if not firebase_uid:
                        print('[FirebaseAuth][DEV BYPASS] No UID field found in token')
                        return None
                    
                    # Cria/obtém usuário e retorna
                    user = self.get_or_create_user(
                        firebase_uid=firebase_uid,
                        email=decoded_token.get('email', ''),
                        name=decoded_token.get('name', '')
                    )
                    return user, decoded_token
                    
                except Exception as e:
                    print('[FirebaseAuth][DEV BYPASS] Error:', str(e))
                    return None
                    
            else:
                # Modo normal - verifica token
                try:
                    decoded_token = auth.verify_id_token(token)
                    firebase_uid = decoded_token.get('uid')
                    if not firebase_uid:
                        print('[FirebaseAuth][ERROR] No UID in verified token')
                        return None
                        
                    user = self.get_or_create_user(
                        firebase_uid=firebase_uid,
                        email=decoded_token.get('email', ''),
                        name=decoded_token.get('name', '')
                    )
                    return user, decoded_token
                        
                except Exception as e:
                    print('[FirebaseAuth][ERROR] Token verification failed:', str(e))
                    return None
            
            # Extract user information from token
            email = decoded_token.get('email', '')
            name = decoded_token.get('name', '')
            
            # Get or create Django user based on Firebase UID
            user = self.get_or_create_user(firebase_uid, email, name)
            
            return (user, decoded_token)
            
        except (auth.InvalidIdTokenError, auth.ExpiredIdTokenError) as e:
            print('[FirebaseAuth][WARN] Invalid/Expired token:', e)
            return None
        except Exception as e:
            print('[FirebaseAuth][ERROR] Unexpected verification error:', e)
            return None
    
    def get_or_create_user(self, firebase_uid, email, name):
        """
        Get or create a Django user based on Firebase UID
        Also syncs admin status based on Firebase custom claims or admin email list
        """
        try:
            # Check if email is in admin list
            admin_emails = config('FIREBASE_ADMIN_EMAILS', default='').split(',')
            is_admin_email = email and email.strip().lower() in [e.strip().lower() for e in admin_emails if e.strip()]
            
            # Try to get custom claims from Firebase
            try:
                user_record = auth.get_user(firebase_uid)
                custom_claims = user_record.custom_claims or {}
                is_admin_claim = custom_claims.get('admin', False)
            except Exception as e:
                print(f"[FirebaseAuth] Failed to get custom claims: {e}")
                is_admin_claim = False
            
            # Determine admin status
            is_admin = is_admin_email or is_admin_claim
            
            try:
                # Try to find existing user
                user = User.objects.get(username=firebase_uid)
                
                # Update email if changed
                if user.email != email and email:
                    user.email = email
                
                # Update admin status
                if is_admin != user.is_staff:
                    user.is_staff = is_admin
                    user.is_superuser = is_admin
                
                if user.is_modified:
                    user.save()
                    
            except User.DoesNotExist:
                # Create new user
                user = User.objects.create_user(
                    username=firebase_uid,
                    email=email,
                    first_name=name.split(' ')[0] if name else '',
                    last_name=' '.join(name.split(' ')[1:]) if name and len(name.split(' ')) > 1 else '',
                    is_staff=is_admin,
                    is_superuser=is_admin
                )
            
            print(f"[FirebaseAuth] User {email} admin status: {is_admin} (email_match={is_admin_email}, claim={is_admin_claim})")
            return user
            
        except Exception as e:
            print(f"[FirebaseAuth] Error in get_or_create_user: {e}")
            raise