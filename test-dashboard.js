const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
};

const req = http.request(options, (res) => {
  let cookie = '';
  if (res.headers['set-cookie']) {
    cookie = res.headers['set-cookie'][0].split(';')[0];
  }
  
  console.log(`Login Status: ${res.statusCode}`);
  
  if (!cookie) {
    console.error("No cookie received!");
    return;
  }
  
  console.log(`Got cookie: ${cookie}`);
  
  // Now request dashboard
  const req2 = http.request({
    hostname: 'localhost',
    port: 3000,
    path: '/dashboard',
    method: 'GET',
    headers: {
      'Cookie': cookie
    }
  }, (res2) => {
    console.log(`Dashboard Status: ${res2.statusCode}`);
    console.log(`Dashboard Location Header: ${res2.headers['location']}`);
  });
  
  req2.end();
});

req.write(JSON.stringify({
  email: 'employee1.engineering@enterprise.com',
  password: 'Welcome@123',
}));
req.end();
