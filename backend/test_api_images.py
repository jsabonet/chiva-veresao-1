#!/usr/bin/env python

"""
Simple test script to verify the main_image_url field is present in API responses
"""

import requests
import json

def test_product_api():
    try:
        # Test the products list endpoint
        print("Testing products list endpoint...")
        response = requests.get('http://localhost:8000/api/products/')
        print(f"Response status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("Products list API response:")
            print(f"Response type: {type(data)}")
            print(f"Data length: {len(data) if isinstance(data, list) else 'Not a list'}")
            
            if isinstance(data, list) and len(data) > 0:
                first_product = data[0]
                print(f"First product keys: {list(first_product.keys())}")
                print(f"Has main_image_url: {'main_image_url' in first_product}")
                if 'main_image_url' in first_product:
                    print(f"main_image_url value: {first_product['main_image_url']}")
            elif isinstance(data, dict) and 'results' in data:
                results = data['results']
                print(f"Results length: {len(results)}")
                if len(results) > 0:
                    first_product = results[0]
                    print(f"First product keys: {list(first_product.keys())}")
                    print(f"Has main_image_url: {'main_image_url' in first_product}")
                    if 'main_image_url' in first_product:
                        print(f"main_image_url value: {first_product['main_image_url']}")
                    
                    # Now test the detail endpoint using slug
                    first_product_slug = first_product['slug']
                    print(f"\nTesting product detail endpoint for slug '{first_product_slug}'...")
                    detail_response = requests.get(f'http://localhost:8000/api/products/{first_product_slug}/')
                    print(f"Detail response status: {detail_response.status_code}")
                    
                    if detail_response.status_code == 200:
                        detail_data = detail_response.json()
                        print(f"Detail keys: {list(detail_data.keys())}")
                        print(f"Has main_image_url: {'main_image_url' in detail_data}")
                        if 'main_image_url' in detail_data:
                            print(f"main_image_url value: {detail_data['main_image_url']}")
                        if 'main_image' in detail_data:
                            print(f"main_image value: {detail_data['main_image']}")
                    else:
                        print(f"Failed to get product detail: {detail_response.status_code}")
                        print(f"Detail response content: {detail_response.text}")
                else:
                    print("No products in results")
            elif isinstance(data, dict):
                print(f"Got dict response keys: {list(data.keys())}")
            else:
                print("No products found or unexpected response format")
        else:
            print(f"Failed to get products: {response.status_code}")
            print(f"Response content: {response.text}")

    except Exception as e:
        print(f"Error testing API: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_product_api()