const http = require('http');

const data = JSON.stringify({
  user_id: 'mock',
  title: 'Test',
  url: 'https://example.com',
  description: 'Test bookmark'
});

const req = http.request('http://localhost:3000/api/bookmarks', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
}, (res) => {
  let responseData = '';
  res.on('data', chunk => responseData += chunk);
  res.on('end', () => console.log('Response:', res.statusCode, responseData));
});

req.on('error', (e) => console.error(e));
req.write(data);
req.end();
