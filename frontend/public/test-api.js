// Simple test to check API_BASE_URL resolution
console.log('=== API URL TEST ===');

// Test how API_BASE_URL is resolved
const API_BASE_URL = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL
  ? import.meta.env.VITE_API_BASE_URL
  : (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}${window.location.port ? ':'+window.location.port : ''}/api` : 'http://127.0.0.1:8000/api');

console.log('Detected API_BASE_URL:', API_BASE_URL);
console.log('import.meta.env:', typeof import.meta !== 'undefined' ? import.meta.env : 'not available');
console.log('window.location:', typeof window !== 'undefined' ? {
  protocol: window.location.protocol,
  hostname: window.location.hostname,
  port: window.location.port
} : 'not available');

// Test direct fetch
async function testDirectFetch() {
  try {
    console.log('Testing fetch to:', API_BASE_URL + '/products/');
    const response = await fetch(API_BASE_URL + '/products/');
    console.log('Response status:', response.status);
    console.log('Response headers:', [...response.headers.entries()]);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Success! Data:', data);
      if (data && data.results) {
        console.log('Number of products:', data.results.length);
      }
    } else {
      console.error('HTTP error:', response.status, await response.text());
    }
  } catch (error) {
    console.error('Fetch error:', error);
  }
}

// Run test after DOM loads
if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    testDirectFetch();
  });
} else {
  testDirectFetch();
}