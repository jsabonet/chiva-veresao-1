#!/bin/bash
# Deploy script to fix coupons API in production

echo "=========================================="
echo "DEPLOY: Coupon System Fix"
echo "=========================================="

cd /home/chiva/chiva-veresao-1

echo ""
echo "1. Pulling latest code..."
git pull origin main

echo ""
echo "2. Checking backend URLs..."
cd backend
grep -n "admin/coupons" cart/urls.py

echo ""
echo "3. Applying migrations..."
python manage.py migrate

echo ""
echo "4. Collecting static files..."
python manage.py collectstatic --noinput

echo ""
echo "5. Restarting Gunicorn..."
sudo systemctl restart gunicorn

echo ""
echo "6. Checking Gunicorn status..."
sudo systemctl status gunicorn --no-pager -l

echo ""
echo "7. Checking Nginx logs for errors..."
sudo tail -n 20 /var/log/nginx/error.log

echo ""
echo "=========================================="
echo "Deploy completed!"
echo "=========================================="
echo ""
echo "Test the API:"
echo "curl -X GET https://chivacomputer.co.mz/api/cart/admin/coupons/ -H 'Authorization: Bearer YOUR_TOKEN'"
