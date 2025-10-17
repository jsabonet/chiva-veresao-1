#!/usr/bin/env python
import requests
import json
import os

# Get API key from environment
api_key = os.getenv('PAYSUITE_API_KEY', 'sandbox_xKD2v3Dj9FGh8JbN1QpZ')
payment_id = '1dfed9e7-a5f7-40db-b7ee-759834899908'

url = f'https://paysuite-proxy.jsabonete09.workers.dev/v1/payments/{payment_id}'
headers = {'Authorization': f'Bearer {api_key}'}

print(f"Querying PaySuite API for payment {payment_id}...")
print(f"URL: {url}")
print()

resp = requests.get(url, headers=headers)
print(f"Status Code: {resp.status_code}")
print(f"Response:")
print(json.dumps(resp.json(), indent=2))
