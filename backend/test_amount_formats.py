"""
PaySuite Amount Format Testing
"""
import requests
import os
import json

def test_amount_formats():
    """Test different amount formats with PaySuite"""
    
    base_url = os.getenv('PAYSUITE_BASE_URL', 'https://paysuite.tech/api')
    api_key = os.getenv('PAYSUITE_API_KEY')
    
    if not api_key:
        print("❌ PAYSUITE_API_KEY not configured")
        return
    
    headers = {
        'Authorization': f'Bearer {api_key}',
        'Content-Type': 'application/json'
    }
    
    # Test different amount formats
    test_cases = [
        {
            'name': 'original_format',
            'amount': 1716000.00,  # As stored in database
            'description': 'Original format (centavos)'
        },
        {
            'name': 'meticais_format', 
            'amount': 17160.00,     # Divided by 100
            'description': 'Meticais format (MZN)'
        },
        {
            'name': 'integer_format',
            'amount': 17160,        # Integer only
            'description': 'Integer format'
        },
        {
            'name': 'small_amount',
            'amount': 100.00,       # Small test amount
            'description': 'Small amount test'
        }
    ]
    
    results = []
    
    for i, test_case in enumerate(test_cases, 1):
        payload = {
            'amount': test_case['amount'],
            'method': 'mpesa',
            'reference': f'AMTTEST{i:03d}',
            'description': test_case['description'],
            'callback_url': 'http://127.0.0.1:8000/api/cart/payments/webhook/'
        }
        
        try:
            print(f"\n🧪 Testing {test_case['name']}: {test_case['amount']}")
            
            response = requests.post(
                f'{base_url}/v1/payments',
                headers=headers,
                json=payload,
                timeout=10
            )
            
            result = {
                'test_name': test_case['name'],
                'amount': test_case['amount'],
                'status_code': response.status_code,
                'success': response.status_code in [200, 201],
                'response': response.json() if response.text else None
            }
            
            if result['success']:
                print(f"✅ SUCCESS: {response.status_code}")
                # Check if checkout_url is returned
                checkout_url = result['response'].get('data', {}).get('checkout_url')
                if checkout_url:
                    print(f"🔗 Checkout URL: {checkout_url}")
            else:
                print(f"❌ FAILED: {response.status_code}")
                if response.text:
                    error_data = response.json() if response.text else {}
                    print(f"   Error: {error_data.get('message', response.text[:100])}")
            
            results.append(result)
            
        except Exception as e:
            print(f"💥 EXCEPTION: {e}")
            results.append({
                'test_name': test_case['name'],
                'amount': test_case['amount'],
                'error': str(e)
            })
    
    # Save results
    with open('amount_format_test_results.json', 'w') as f:
        json.dump(results, f, indent=2)
    
    # Summary
    print(f"\n📊 AMOUNT FORMAT TEST SUMMARY:")
    print("=" * 40)
    
    successful = [r for r in results if r.get('success', False)]
    print(f"Successful: {len(successful)}/{len(results)}")
    
    if successful:
        print(f"\n✅ WORKING AMOUNT FORMATS:")
        for result in successful:
            print(f"  - {result['test_name']}: {result['amount']}")
    
    print(f"\n📄 Results saved to: amount_format_test_results.json")
    return results

if __name__ == "__main__":
    test_amount_formats()