"""
Phone number validation utilities for PaySuite integration
"""
import re

def validate_mozambique_phone(phone: str) -> dict:
    """
    Validate and format Mozambican phone numbers for PaySuite
    Returns: dict with 'valid', 'formatted', 'carrier', 'error'
    """
    if not phone:
        return {'valid': False, 'error': 'Phone number is required'}
    
    # Remove all non-digits
    digits_only = re.sub(r'\D', '', phone)
    
    # Mozambican phone number patterns
    patterns = {
        'mcel': ['82', '83'],  # M-Pesa operator
        'vodacom': ['84', '85'],  # Emola operator  
        'movitel': ['86', '87']
    }
    
    # Validate length and format
    if len(digits_only) == 12 and digits_only.startswith('258'):
        # International format: 258XXXXXXXXX
        national = digits_only[3:]
        country_code = '258'
    elif len(digits_only) == 9:
        # National format: XXXXXXXXX
        national = digits_only
        country_code = '258'
    else:
        return {'valid': False, 'error': f'Invalid phone length: {len(digits_only)} digits'}
    
    # Check if it's a valid Mozambican mobile number
    if len(national) != 9 or not national.startswith(('82', '83', '84', '85', '86', '87')):
        return {'valid': False, 'error': 'Not a valid Mozambican mobile number'}
    
    # Determine carrier
    prefix = national[:2]
    carrier = None
    for carrier_name, prefixes in patterns.items():
        if prefix in prefixes:
            carrier = carrier_name
            break
    
    # Format options for PaySuite testing
    formats = {
        'international_plus': f'+{country_code}{national}',
        'international': f'{country_code}{national}',
        'national': national,
        'formatted': f'+{country_code} {national[:2]} {national[2:5]} {national[5:]}'
    }
    
    return {
        'valid': True,
        'carrier': carrier,
        'national': national,
        'country_code': country_code,
        'formats': formats,
        'recommended': formats['international']  # Without + for PaySuite
    }

def get_payment_method_from_phone(phone: str) -> str:
    """
    Determine payment method based on phone carrier
    """
    validation = validate_mozambique_phone(phone)
    if not validation['valid']:
        return 'mpesa'  # Default
    
    carrier = validation.get('carrier', 'mcel')
    
    # Map carriers to payment methods
    method_map = {
        'mcel': 'mpesa',      # MCEL uses M-Pesa
        'vodacom': 'emola',   # Vodacom uses Emola
        'movitel': 'mpesa'    # Movitel also uses M-Pesa-like system
    }
    
    return method_map.get(carrier, 'mpesa')