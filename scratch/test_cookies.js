const fetch = require('node-fetch');

async function run() {
  const loginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'hella@infosys.com', password: 'Welcome@123', deviceId: 'test-device' })
  });
  console.log('Cookies returned:', loginRes.headers.raw()['set-cookie']);
}
run();
