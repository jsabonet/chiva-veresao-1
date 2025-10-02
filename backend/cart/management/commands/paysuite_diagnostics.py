"""
Django management command to run PaySuite diagnostics
"""
from django.core.management.base import BaseCommand
from cart.utils.paysuite_diagnostics import run_account_diagnostics
import json

class Command(BaseCommand):
    help = 'Run PaySuite account and configuration diagnostics'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('🚀 Starting PaySuite Diagnostics...'))
        
        try:
            results = run_account_diagnostics()
            
            # Save results to file
            with open('paysuite_diagnostics.json', 'w') as f:
                json.dump(results, f, indent=2)
            
            self.stdout.write(self.style.SUCCESS('✅ Diagnostics completed!'))
            self.stdout.write(f'📄 Results saved to: paysuite_diagnostics.json')
            
            # Summary
            payment_tests = results.get('payment_tests', {})
            successful_tests = [name for name, result in payment_tests.items() 
                              if result.get('success', False)]
            
            if successful_tests:
                self.stdout.write(self.style.SUCCESS(f'✅ Working methods: {", ".join(successful_tests)}'))
            else:
                self.stdout.write(self.style.WARNING('⚠️  No payment methods working - check account configuration'))
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'❌ Diagnostics failed: {e}'))