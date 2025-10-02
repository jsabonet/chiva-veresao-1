# 🚨 PaySuite M-Pesa Integration Debugging Request

## 📋 **Problem Summary**
We have a Django + React e-commerce application integrating with PaySuite (Mozambican payment gateway) for M-Pesa/Emola mobile payments. Despite sending correct parameters, mobile payments are not processing as direct push notifications to users' phones - instead, users are always redirected to PaySuite's checkout page where they must re-enter their phone number.

## 🏗️ **System Architecture**
- **Backend:** Django 5.x + Django REST Framework
- **Frontend:** React + TypeScript + Vite
- **Payment Gateway:** PaySuite (https://paysuite.tech)
- **Payment Methods:** M-Pesa, Emola (mobile money in Mozambique)
- **Environment:** Development (sandbox)

## 🎯 **Expected vs Actual Behavior**

### ✅ **Expected Behavior:**
1. User selects M-Pesa/Emola payment method
2. User enters phone number in modal (+258844720861)
3. System sends payment request with phone number to PaySuite API
4. PaySuite sends USSD push notification directly to user's phone
5. User confirms payment on phone without additional web interaction

### ❌ **Actual Behavior:**
1. User selects M-Pesa/Emola and enters phone number ✅
2. System sends correct payload to PaySuite API ✅  
3. PaySuite returns `checkout_url` instead of processing direct payment ❌
4. User gets redirected to PaySuite checkout page ❌
5. User must re-enter phone number on PaySuite's website ❌

## 📊 **Technical Evidence**

### **Request Payload (Working):**
```json
{
  "amount": 1352000.0,
  "reference": "ORD000018", 
  "method": "mpesa",
  "description": "Order 18 payment",
  "callback_url": "http://127.0.0.1:8000/api/cart/payments/webhook/",
  "msisdn": "+258844720861",
  "direct": true
}
```

### **PaySuite API Response:**
```json
{
  "status": "success",
  "data": {
    "id": "a4e1c6f8-0e10-4671-8f5d-a37ea944a8ef",
    "amount": "1352000.00", 
    "reference": "ORD000018",
    "checkout_url": "https://paysuite.tech/checkout/a4e1c6f8-0e10-4671-8f5d-a37ea944a8ef"
  }
}
```

### **API Call Details:**
- **URL:** `https://paysuite.tech/api/v1/payments`
- **Method:** POST
- **Status:** 201 Created ✅
- **Authorization:** Bearer token present ✅
- **Content-Type:** application/json ✅

## 🔍 **Key Questions**

1. **Is the `direct: true` parameter correct for PaySuite API?**
   - We've tried various combinations: `direct`, `auto_complete`, `immediate`, `push_payment`
   - None prevent the `checkout_url` from being returned
   - **INSIGHT:** Parameter name might be incorrect or field doesn't exist

2. **Is the `msisdn` field format correct?**
   - Currently using: `+258844720861` (international format)
   - Should it be: `258844720861`, `844720861`, or other format?
   - **INSIGHT:** Invalid phone format might cause fallback to checkout

3. **Does PaySuite sandbox environment support direct mobile payments?**
   - Maybe sandbox always returns checkout_url for testing?
   - Do we need production API keys for direct payments?
   - **INSIGHT:** Sandbox might not support push notifications by design

4. **Are we missing required parameters for direct payments?**
   - Additional authentication?
   - Special headers?
   - Account configuration flags?
   - **INSIGHT:** Mobile money push might require account activation/configuration

## 💻 **Relevant Code**

### **Backend (Django) - Payment Initiation:**
```python
# cart/views.py
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def initiate_payment(request):
    # ... cart validation ...
    
    # Extract phone number
    phone = request.data.get('phone')  # "+258844720861"
    method = request.data.get('method', 'mpesa')  # "mpesa"
    
    # Prepare PaySuite payload
    payment_creation_data = {
        'amount': float(cart.total),  # 1352000.0
        'method': method,
        'reference': f"ORD{order.id:06d}",  # "ORD000018"
        'description': f"Order {order.id} payment",
        'return_url': request.build_absolute_uri(f'/order/{order.id}/confirmation'),
        'callback_url': request.build_absolute_uri('/api/cart/payments/webhook/'),
        'msisdn': phone,  # "+258844720861"
        'direct_payment': True  # Our flag
    }
    
    # Remove return_url for direct payments
    if method in ['mpesa', 'emola'] and phone:
        payment_creation_data.pop('return_url', None)
    
    # Call PaySuite
    api_resp = client.create_payment(**payment_creation_data)
```

### **PaySuite Client:**
```python
# cart/payments/paysuite.py
def create_payment(self, *, amount, method=None, reference: str, 
                   callback_url: str = None, msisdn: str = None, 
                   direct_payment: bool = False, **kwargs) -> dict:
    
    url = f"{self.base_url}/v1/payments"  # https://paysuite.tech/api/v1/payments
    payload = {
        'amount': float(amount),
        'reference': reference,
        'method': method,
        'callback_url': callback_url,
        'msisdn': msisdn
    }
    
    if direct_payment:
        payload['direct'] = True
        payload.pop('return_url', None)
    
    resp = self.session.post(url, data=json.dumps(payload), timeout=15)
    return resp.json()
```

## 🌍 **PaySuite Context**
- **Company:** PaySuite (Mozambican fintech)
- **Payment Methods:** M-Pesa, Emola (local mobile money)
- **Market:** Mozambique mobile payments
- **Documentation:** Limited public documentation available
- **API Base:** https://paysuite.tech/api

## 🆘 **What We Need Help With**

1. **PaySuite API expertise:** Correct parameters for direct mobile payments
2. **Mobile money integration patterns:** How other systems handle M-Pesa/Emola direct payments
3. **Debugging approach:** What else should we try/test?
4. **Alternative solutions:** Workarounds if direct payments aren't supported in sandbox

## 📝 **Additional Context**
- We have valid PaySuite API credentials
- Authentication is working (201 responses)
- Webhook endpoint is configured
- Phone number format follows Mozambican standards (+258...)
- Same issue occurs with both M-Pesa and Emola methods

## 🔧 **Already Tried**
- Different parameter names: `direct`, `auto_complete`, `immediate`, `push_payment`
- Different phone formats: with/without country code, with/without +
- Removing `return_url` for direct payments
- Various payload combinations
- Testing with different phone numbers

## 🔬 **Research Findings**
Based on investigation:

1. **⚠️ Sandbox Limitation:** No public evidence that PaySuite sandbox supports direct push (without redirect)
2. **🏗️ Design Decision:** `checkout_url` behavior might be intentional in test environment
3. **🔧 Configuration Required:** Direct payments may need account activation/special setup
4. **📛 Parameter Unknown:** The `direct` parameter might not exist or have different name
5. **📱 Phone Validation:** Invalid phone format could trigger checkout fallback

## 🚨 **CRITICAL ERROR IDENTIFIED**
User gets redirected to PaySuite checkout, but when trying to complete payment:

**Error:** `Invalid amount,input :1716000.00`  
**HTTP:** `POST https://paysuite.tech/checkout/28d9ceaf-11bc-4cab-9ef6-f8038254ab89 400 (Bad Request)`
**Method:** E-Mola  
**Context:** Error occurs on PaySuite's own checkout page, not our API

**ROOT CAUSE DISCOVERED:**
- **Amount format is incorrect:** PaySuite rejects `1716000.00`
- **Expected format:** PaySuite likely expects amounts in MZN (17160.00) not centavos (1716000.00)
- **Our system:** Storing amounts in centavos but PaySuite expects MZN

**Implications:**
- Our payment creation API works (gets 201 response) ✅
- Amount conversion needed: divide by 100 (centavos → MZN) ✅
- PaySuite checkout validates amount format more strictly than creation API ✅

## 🎯 **Next Steps to Try**
1. **Contact PaySuite support** for sandbox direct payment capabilities
2. **Test different phone formats:** `258844720861`, `844720861`, `+258 84 472 0861`
3. **Try without any "direct" parameters** - just `msisdn`
4. **Check account settings** for mobile money activation
5. **Test in production environment** if sandbox doesn't support push
6. **🆘 URGENT: Check PaySuite account configuration** - E-Mola method may not be properly activated
7. **🔍 Validate payload data** sent to PaySuite for missing/invalid fields

## 🚨 **Critical Issues to Address**
1. **Account Configuration:** E-Mola method returns 400 Bad Request on checkout
2. **Method Activation:** Verify M-Pesa/E-Mola are properly configured in PaySuite dashboard
3. **Webhook Configuration:** Ensure callback URLs are properly configured
4. **Amount Validation:** Check if amount format/limits are causing issues

---

**URGENT Question:** The PaySuite checkout page itself returns 400 Bad Request for E-Mola payments. This suggests either:
1. **Account issue:** E-Mola method not properly activated/configured in PaySuite dashboard
2. **Data issue:** Missing or invalid required fields in payment creation
3. **Environment issue:** Sandbox limitations for E-Mola method

What PaySuite account configurations are required for E-Mola payments to work in sandbox?