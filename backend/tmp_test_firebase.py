from chiva_backend.firebase_auth import FirebaseAuthentication

# A fake JWT with payload {"sub":"test-uid","email":"test@example.com","name":"Test User"}
fake_token = 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjEyMyJ9.eyJzdWIiOiJ0ZXN0LXVpZCIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsIm5hbWUiOiJUZWFtIFVzZXIifQ.signature'
fa = FirebaseAuthentication()
res = fa.authenticate_credentials(fake_token)
print('Result:', res)
