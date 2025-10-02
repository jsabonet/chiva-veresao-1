"""
PaySuite Configuration and Testing Utilities
"""
import os
from typing import Dict, Any, Optional

class PaySuiteConfig:
    """Configuration manager for PaySuite integration"""
    
    # Different possible field names for direct payments based on PaySuite documentation
    DIRECT_PAYMENT_FIELDS = {
        'direct': True,
        'auto_complete': True,
        'immediate': True,
        'push_payment': True,
        'mobile_push': True,
    }
    
    # Different possible field names for mobile numbers
    MOBILE_FIELD_NAMES = [
        'msisdn',
        'phone',
        'mobile',
        'phone_number',
        'mobile_number'
    ]
    
    @classmethod
    def get_payment_payload(cls, base_payload: Dict[str, Any], mobile_number: Optional[str] = None) -> Dict[str, Any]:
        """
        Generate PaySuite payload with different field combinations for testing
        """
        payload = base_payload.copy()
        
        if mobile_number:
            # Try primary field name first
            payload['msisdn'] = mobile_number
            
            # Add experimental direct payment flags
            # We can test different combinations
            test_mode = os.getenv('PAYSUITE_TEST_MODE', 'standard')
            
            if test_mode == 'direct_v1':
                payload['direct'] = True
                payload.pop('return_url', None)
            elif test_mode == 'direct_v2':
                payload['auto_complete'] = True
                payload['immediate'] = True
            elif test_mode == 'direct_v3':
                payload['push_payment'] = True
                payload['mobile_push'] = True
            elif test_mode == 'mobile_only':
                # Only send mobile number, no other flags
                pass
            else:
                # Standard mode - current implementation
                payload['direct'] = True
                payload.pop('return_url', None)
        
        return payload

# Environment variables for testing different configurations
PAYSUITE_TEST_CONFIGS = {
    'standard': 'Current implementation with direct=true',
    'direct_v1': 'direct=true, no return_url',
    'direct_v2': 'auto_complete=true, immediate=true',
    'direct_v3': 'push_payment=true, mobile_push=true',
    'mobile_only': 'Only msisdn field, no additional flags'
}