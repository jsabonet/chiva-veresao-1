"""
Firebase Authentication for Django REST Framework
Validates Firebase ID tokens and creates/gets Django users
"""
import firebase_admin
from firebase_admin import auth, credentials
from django.contrib.auth.models import User
from rest_framework import authentication, exceptions, permissions
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
        print("\n[FirebaseAuth] Starting authentication...")
        auth_header = authentication.get_authorization_header(request)
        
        if not auth_header:
            print("[FirebaseAuth] No Authorization header found")
            return None
        
        try:
            # Expected format: "Bearer <token>"
            auth_header_decoded = auth_header.decode('utf-8')
            print(f"[FirebaseAuth] Auth header found: {auth_header_decoded[:20]}...")
            
            if not auth_header_decoded.startswith('Bearer '):
                print("[FirebaseAuth] Invalid header format - expected 'Bearer '")
                return None
                
            token = auth_header_decoded.split(' ')[1]
            if not token.strip():
                print("[FirebaseAuth] Empty token")
                return None
            
            print(f"[FirebaseAuth] Token extracted (first 20 chars): {token[:20]}...")
            
        except (UnicodeDecodeError, IndexError) as e:
            print(f"[FirebaseAuth] Error processing header: {str(e)}")
            return None
        
        return self.authenticate_credentials(token)
    
    def authenticate_credentials(self, token):
        """
        Validate Firebase token and get/create Django user
        """
        try:
            print("[FirebaseAuth] Starting token verification...")
            
            # Always enable debug for troubleshooting
            token_debug_flag = True
            try:
                dev_mode = config('DEV_FIREBASE_ACCEPT_UNVERIFIED', default='1', cast=bool)
                print(f"[FirebaseAuth] DEV_FIREBASE_ACCEPT_UNVERIFIED = {dev_mode}")
            except Exception:
                dev_mode = os.getenv('DEV_FIREBASE_ACCEPT_UNVERIFIED', '1').lower() in ['1', 'true']

            def _debug_print(*a, **kw):
                if token_debug_flag:
                    print(*a, **kw)

            _debug_print('[FirebaseAuth][DEBUG] Processing token (first 25 chars):', token[:25])
            
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

            _debug_print('[FirebaseAuth][DEBUG] DEV_FIREBASE_ACCEPT_UNVERIFIED (decouple) =', raw_dev)
            _debug_print('[FirebaseAuth][DEBUG] DEV_FIREBASE_ACCEPT_UNVERIFIED (effective bool) =', dev_bypass)
            _debug_print('[FirebaseAuth][DEBUG] ENABLE_TOKEN_PAYLOAD_DEBUG =', token_debug_flag)

            # If dev bypass is active but token debug is not requested, emit a concise informational line
            if dev_bypass and not token_debug_flag:
                print('[FirebaseAuth][DEV BYPASS] Using unverified token decode (details suppressed). Set ENABLE_TOKEN_PAYLOAD_DEBUG=1 to enable verbose output.)')

            if dev_bypass:
                _debug_print('[FirebaseAuth][DEBUG] Starting unverified decode')
                import base64, json
                try:
                    # Divide o token e pega o payload
                    parts = token.split('.')
                    if len(parts) != 3:
                        _debug_print('[FirebaseAuth][ERROR] Malformed JWT - need 3 parts')
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
                        _debug_print('[FirebaseAuth][DEV BYPASS] Successfully decoded payload')
                        _debug_print('[FirebaseAuth][DEV BYPASS] Available fields:', list(decoded_token.keys()))
                    except Exception as e:
                        _debug_print('[FirebaseAuth][DEV BYPASS] JSON decode failed:', str(e))
                        return None
                    
                    # Procura UID nos campos possíveis
                    firebase_uid = None
                    for field in ['sub', 'user_id', 'uid']:
                        if field in decoded_token:
                            firebase_uid = decoded_token[field]
                            _debug_print(f'[FirebaseAuth][DEV BYPASS] Found UID in {field}:', firebase_uid)
                            break
                    
                    if not firebase_uid:
                        _debug_print('[FirebaseAuth][DEV BYPASS] No UID field found in token')
                        return None
                    
                    # Cria/obtém usuário e retorna
                    user = self.get_or_create_user(
                        firebase_uid=firebase_uid,
                        email=decoded_token.get('email', ''),
                        name=decoded_token.get('name', '')
                    )
                    return user, decoded_token
                    
                except Exception as e:
                    _debug_print('[FirebaseAuth][DEV BYPASS] Error:', str(e))
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
        Get or create a Django user based on Firebase UID.
        Admin status is managed entirely by ExternalAuthUser.is_admin field.
        """
        try:
            # Check if email is in admin list
            admin_emails = config('FIREBASE_ADMIN_EMAILS', default='').split(',')
            is_admin_email = email and email.strip().lower() in [e.strip().lower() for e in admin_emails if e.strip()]
            
            # Try to get and sync custom claims from Firebase
            try:
                user_record = auth.get_user(firebase_uid)
                custom_claims = user_record.custom_claims or {}
                current_admin_claim = custom_claims.get('admin', False)
                
                # Check if claims need to be updated
                if is_admin_email != current_admin_claim:
                    new_claims = {**custom_claims, 'admin': is_admin_email}
                    auth.set_custom_claims(firebase_uid, new_claims)
                    print(f"[FirebaseAuth] Updated admin claim for {email} to {is_admin_email}")
                
                is_admin_claim = is_admin_email  # Use email-based admin status
                
            except Exception as e:
                # Only log ADC warning if we're not in dev bypass mode
                dev_bypass = os.getenv('DEV_FIREBASE_ACCEPT_UNVERIFIED', '0').lower() in ['1', 'true']
                if not dev_bypass:
                    print(f"[FirebaseAuth] Failed to sync claims: {e}")
                is_admin_claim = False
            
            # Check DEV_TREAT_ALL_AUTH_AS_ADMIN (now disabled by default)
            dev_treat_all_as_admin = config('DEV_TREAT_ALL_AUTH_AS_ADMIN', default='0', cast=bool)
            
            # Import local mirror model
            try:
                from customers.models import ExternalAuthUser, Role
                # Check if user is already admin in ExternalAuthUser
                existing_ext = ExternalAuthUser.objects.filter(firebase_uid=firebase_uid).first()
                is_already_admin = bool(existing_ext and existing_ext.is_admin)
            except Exception as e:
                print(f"[FirebaseAuth] Could not check ExternalAuthUser admin status: {e}")
                is_already_admin = False

            # Determine admin status (based on email OR existing admin status)
            is_admin = is_admin_email or is_already_admin

            # Debugging: log how admin was determined
            try:
                print(f"[FirebaseAuth][TRACE] uid={firebase_uid} email={email} is_admin_email={is_admin_email} is_admin_claim={is_admin_claim} is_already_admin={is_already_admin} dev_all_admin={dev_treat_all_as_admin} -> is_admin={is_admin}")
            except Exception:
                pass

            # ExternalAuthUser já foi importado acima

            try:
                # Try to find existing Django user
                user = User.objects.get(username=firebase_uid)
                # Update basic fields
                changed = False
                if user.email != email and email:
                    user.email = email
                    changed = True
                # Sync admin flags based on ExternalAuthUser status
                try:
                    ext_user = ExternalAuthUser.objects.filter(firebase_uid=firebase_uid).first()
                    if ext_user:
                        if user.is_staff != ext_user.is_admin:
                            user.is_staff = ext_user.is_admin
                            user.is_superuser = ext_user.is_admin
                            changed = True
                except Exception as e:
                    print(f"[FirebaseAuth] Error syncing admin flags: {e}")
                
                if changed:
                    user.save()
            except User.DoesNotExist:
                # Create new Django user (local mirror user will be created below)
                user = User.objects.create_user(
                    username=firebase_uid,
                    email=email,
                    first_name=name.split(' ')[0] if name else '',
                    last_name=' '.join(name.split(' ')[1:]) if name and len(name.split(' ')) > 1 else '',
                    is_staff=is_admin,
                    is_superuser=is_admin
                )

            # Create or update ExternalAuthUser mirror in PostgreSQL
            try:
                if ExternalAuthUser:
                    ext, created = ExternalAuthUser.objects.get_or_create(firebase_uid=firebase_uid)
                    ext.user = user
                    ext.email = email or ext.email
                    ext.display_name = name or ext.display_name
                    # providers and custom claims
                    try:
                        ext.providers = list(custom_claims.get('providers', ext.providers) or ext.providers)
                    except Exception:
                        pass
                        
                    # Admin status management:
                    # 1. For new users: Use email-based admin status
                    # 2. For existing users: Preserve current admin status, only update if they're in admin emails
                    if created:
                        ext.is_admin = bool(is_admin_email)
                    elif is_admin_email:  # If they're in admin emails list, make them admin
                        ext.is_admin = True
                    # else: preserve existing admin status
                        
                    from django.utils import timezone
                    ext.last_seen = timezone.now()
                    ext.save()
                    print(f"[FirebaseAuth][TRACE] ExternalAuthUser {'created' if created else 'updated'} firebase_uid={ext.firebase_uid} is_admin={ext.is_admin}")
                    # Optionally map admin role
                    if ext.is_admin:
                        # Ensure there is an 'admin' role and assign
                        role, _ = Role.objects.get_or_create(name='admin')
                        # Log before adding
                        try:
                            print(f"[FirebaseAuth][TRACE] Assigning role 'admin' to external user {ext.firebase_uid}")
                            ext.roles.add(role)
                        except Exception as e:
                            print(f"[FirebaseAuth][ERROR] Failed to assign admin role: {e}")
                    else:
                        # Remove admin role if present
                        try:
                            admin_role = Role.objects.filter(name='admin').first()
                            if admin_role and admin_role in ext.roles.all():
                                print(f"[FirebaseAuth][TRACE] Removing role 'admin' from external user {ext.firebase_uid}")
                                ext.roles.remove(admin_role)
                        except Exception as e:
                            print(f"[FirebaseAuth][ERROR] Failed to remove admin role: {e}")
            except Exception as e:
                print(f"[FirebaseAuth] Failed to sync ExternalAuthUser: {e}")

            # Only log admin status details if debug enabled
            if os.getenv('ENABLE_TOKEN_PAYLOAD_DEBUG', '0').lower() in ['1', 'true']:
                print(f"[FirebaseAuth] User {email} admin status: {is_admin} (email_match={is_admin_email}, claim={is_admin_claim})")
            elif is_admin:
                # For admins, just log a short confirmation
                print(f"[FirebaseAuth] Confirmed admin access for {email}")
            return user
            
        except Exception as e:
            print(f"[FirebaseAuth] Error in get_or_create_user: {e}")
            raise