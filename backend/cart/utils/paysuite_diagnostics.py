"""
PaySuite Account Configuration Checker
"""
import requests
import os
from typing import Dict, Any

class PaySuiteAccountChecker:
    """Check PaySuite account configuration and available methods"""
    
    def __init__(self):
        self.base_url = os.getenv('PAYSUITE_BASE_URL', 'https://paysuite.tech/api')
        self.api_key = os.getenv('PAYSUITE_API_KEY')
        self.session = requests.Session()
        if self.api_key:
            self.session.headers.update({'Authorization': f'Bearer {self.api_key}'})
        self.session.headers.update({'Content-Type': 'application/json'})
    
    def check_account_status(self) -> Dict[str, Any]:
        """Check account status and available methods"""
        try:
            # Try to get account info or available methods
            endpoints_to_try = [
                '/v1/account',
                '/v1/methods',
                '/v1/config',
                '/v1/settings'
            ]
            
            results = {}
            
            for endpoint in endpoints_to_try:
                try:
                    url = f"{self.base_url}{endpoint}"
                    resp = self.session.get(url, timeout=10)
                    results[endpoint] = {
                        'status_code': resp.status_code,
                        'response': resp.text[:500] if resp.text else None
                    }
                except Exception as e:
                    results[endpoint] = {'error': str(e)}
            
            return {
                'api_key_configured': bool(self.api_key),
                'base_url': self.base_url,
                'endpoints_tested': results
            }
            
        except Exception as e:
            return {'error': str(e)}
    
    def test_minimal_payment_creation(self) -> Dict[str, Any]:
        """Test minimal payment creation to check account setup"""
        try:
            url = f"{self.base_url}/v1/payments"
            
            # Test data
            test_payloads = [
                {
                    'name': 'mpesa_minimal',
                    'payload': {
                        'amount': 100.0,
                        'method': 'mpesa',
                        'reference': 'TEST001',
                        'description': 'Account test'
                    }
                },
                {
                    'name': 'emola_minimal', 
                    'payload': {
                        'amount': 100.0,
                        'method': 'emola',
                        'reference': 'TEST002',
                        'description': 'Account test'
                    }
                }
            ]
            
            results = {}
            
            for test in test_payloads:
                try:
                    resp = self.session.post(url, json=test['payload'], timeout=10)
                    results[test['name']] = {
                        'status_code': resp.status_code,
                        'success': resp.status_code in [200, 201],
                        'response': resp.json() if resp.text else None
                    }
                except Exception as e:
                    results[test['name']] = {'error': str(e)}
            
            return results
            
        except Exception as e:
            return {'error': str(e)}

def run_account_diagnostics():
    """Run comprehensive account diagnostics"""
    checker = PaySuiteAccountChecker()
    
    print("🔍 RUNNING PAYSUITE ACCOUNT DIAGNOSTICS...")
    print("=" * 50)
    
    # Check account status
    print("\n1. 📊 Account Status Check:")
    account_status = checker.check_account_status()
    
    print(f"   API Key Configured: {account_status.get('api_key_configured', False)}")
    print(f"   Base URL: {account_status.get('base_url', 'Not set')}")
    
    if 'endpoints_tested' in account_status:
        for endpoint, result in account_status['endpoints_tested'].items():
            status_code = result.get('status_code', 'Error')
            print(f"   {endpoint}: HTTP {status_code}")
    
    # Test payment creation
    print("\n2. 💳 Payment Creation Test:")
    payment_tests = checker.test_minimal_payment_creation()
    
    for test_name, result in payment_tests.items():
        success = result.get('success', False)
        status_code = result.get('status_code', 'Error')
        status_icon = "✅" if success else "❌"
        print(f"   {status_icon} {test_name}: HTTP {status_code}")
        
        if not success and 'response' in result:
            response = result['response']
            if isinstance(response, dict) and 'message' in response:
                print(f"      Error: {response['message']}")
    
    print("\n" + "=" * 50)
    return {
        'account_status': account_status,
        'payment_tests': payment_tests
    }

if __name__ == "__main__":
    run_account_diagnostics()