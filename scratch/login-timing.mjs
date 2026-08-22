const start = Date.now();
const res = await fetch('http://localhost:3000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'hella@infosys.com', password: 'Welcome@123', fingerprint: { hash: 'test-fp-123' }, typingMetrics: {} }),
});
const elapsed = Date.now() - start;
const data = await res.json();
console.log(`Status: ${res.status} | Time: ${elapsed}ms`);
console.log('requiresMfa:', data.requiresMfa, '| risk:', JSON.stringify(data.risk));
console.log('error:', data.error || 'none');
