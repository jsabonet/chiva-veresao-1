"""
PaySuite Testing Script - Test different phone formats and parameters
"""
import os
import sys
import django

# Setup Django
sys.path.append('/'.join(__file__.split('/')[:-1]))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'chiva_backend.settings')
django.setup()

import requests
import json
from datetime import datetime

def test_paysuite_configurations():
    """Test different PaySuite configurations"""
    
    base_url = "http://127.0.0.1:8000/api/cart/payments/initiate/"
    headers = {
        "Authorization": "Bearer fake.eyJzdWIiOiJ0ZXN0LXVpZCJ9.fake",
        "Content-Type": "application/json"
    }
    
    # Different phone formats to test
    phone_formats = [
        "+258844720861",      # International with +
        "258844720861",       # International without +
        "844720861",          # Local format
        "+258 84 472 0861",   # With spaces
        "258 84 472 0861",    # Local with spaces
    ]
    
    # Different test modes
    test_modes = [
        "clean",         # No special flags
        "direct_v1",     # direct: true
        "direct_v2",     # push: true  
        "direct_v3",     # mobile_payment: true
    ]
    
    results = []
    
    for phone in phone_formats:
        for mode in test_modes:
            print(f"\n🧪 Testing: Phone={phone}, Mode={mode}")
            
            # Set environment variable for test mode
            os.environ['PAYSUITE_TEST_MODE'] = mode
            
            data = {
                "method": "mpesa",
                "phone": phone
            }
            
            try:
                response = requests.post(base_url, headers=headers, json=data, timeout=10)
                
                result = {
                    'phone_format': phone,
                    'test_mode': mode,
                    'status_code': response.status_code,
                    'timestamp': datetime.now().isoformat()
                }
                
                if response.status_code == 200:
                    response_data = response.json()
                    result['has_checkout_url'] = 'checkout_url' in str(response_data)
                    result['is_direct'] = response_data.get('payment', {}).get('is_direct', False)
                    result['payment_id'] = response_data.get('payment', {}).get('id', 'N/A')
                    print(f"✅ SUCCESS - Direct: {result['is_direct']}, Checkout: {result['has_checkout_url']}")
                else:
                    result['error'] = response.text[:200]
                    print(f"❌ FAILED - {response.status_code}: {response.text[:100]}")
                    
                results.append(result)
                
            except Exception as e:
                result = {
                    'phone_format': phone,
                    'test_mode': mode,
                    'error': str(e),
                    'timestamp': datetime.now().isoformat()
                }
                results.append(result)
                print(f"💥 EXCEPTION: {e}")
    
    # Save results
    with open('paysuite_test_results.json', 'w') as f:
        json.dump(results, f, indent=2)
    
    # Summary
    print(f"\n📊 SUMMARY:")
    print(f"Total tests: {len(results)}")
    successful = [r for r in results if r.get('status_code') == 200]
    print(f"Successful: {len(successful)}")
    direct_payments = [r for r in successful if r.get('is_direct', False)]
    print(f"Direct payments: {len(direct_payments)}")
    
    if direct_payments:
        print(f"🎉 DIRECT PAYMENT CONFIGS THAT WORKED:")
        for r in direct_payments:
            print(f"  - Phone: {r['phone_format']}, Mode: {r['test_mode']}")
    else:
        print(f"⚠️  No direct payments achieved - all returned checkout_url")
    
    return results

if __name__ == "__main__":
    print("🚀 Starting PaySuite Configuration Tests...")
    results = test_paysuite_configurations()
    print(f"\n✅ Results saved to: paysuite_test_results.json")