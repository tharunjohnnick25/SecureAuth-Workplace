const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3000/api';

async function runE2E() {
  console.log('--- E2E TEST: Verifying Core Workflows ---');
  
  // 1. Login
  console.log('1. Logging in as Tharun (Employee)...');
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'tharun@infosys.com', password: 'tharun26', deviceId: 'e2e-test' })
  });
  
  const loginData = await loginRes.json();
  if (loginRes.status !== 200) {
    console.error('Login Failed:', loginData);
    return;
  }
  console.log('Login Success. Requires MFA?', loginData.requiresMfa);
  
  // Extract cookies to maintain session for Next.js SSR
  const rawCookies = loginRes.headers.raw()['set-cookie'] || [];
  const cookieString = rawCookies.map(c => c.split(';')[0]).join('; ');
  
  const headers = {
    'Content-Type': 'application/json',
    'Cookie': cookieString
  };

  // 2. Create a Task
  console.log('\n2. Creating a Task...');
  const taskRes = await fetch(`${API_BASE}/tasks`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      title: 'E2E Validation Task',
      description: 'Testing if task creation works with the new live DB schema.',
      priority: 'high',
      due_date: new Date(Date.now() + 86400000).toISOString()
    })
  });
  
  if (taskRes.status === 201 || taskRes.status === 200) {
    console.log('Task Creation Success!');
  } else {
    console.error('Task Creation Failed:', await taskRes.text());
  }

  // 3. Create a Leave Request
  console.log('\n3. Creating a Leave Request...');
  const leaveRes = await fetch(`${API_BASE}/leaves`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      leave_type: 'sick',
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      reason: 'E2E Testing Leave',
    })
  });
  
  if (leaveRes.status === 201 || leaveRes.status === 200) {
    console.log('Leave Request Creation Success!');
  } else {
    console.error('Leave Request Creation Failed:', await leaveRes.text());
  }

  // 4. Create an Access Request (Resources)
  console.log('\n4. Creating an Access Request...');
  const accessRes = await fetch(`${API_BASE}/access-requests`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      resource_id: '11111111-1111-1111-1111-111111111111', // Dummy UUID for testing
      access_level: 'read',
      reason: 'E2E Testing Access',
    })
  });
  
  if (accessRes.status === 201 || accessRes.status === 200) {
    console.log('Access Request Creation Success!');
  } else {
    console.error('Access Request Creation Failed:', await accessRes.text());
  }

  console.log('\n--- E2E TEST COMPLETE ---');
}

runE2E();
