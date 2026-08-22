const autocannon = require('autocannon');

async function run() {
  const url = process.env.TARGET_URL || 'http://localhost:3000';
  console.log(`Starting load test against ${url}...`);

  const instance = autocannon({
    url: `${url}/api/v1/users`,
    connections: 10, // virtual users
    pipelining: 1,
    duration: 10, // seconds
    method: 'GET',
  });

  autocannon.track(instance, { renderProgressBar: true });

  instance.on('done', (result) => {
    console.log('\n--- Load Test Results ---');
    console.log(`Total Requests: ${result.requests.total}`);
    console.log(`Average Latency: ${result.latency.average} ms`);
    console.log(`Errors: ${result.errors}`);
    console.log(`Timeouts: ${result.timeouts}`);
    console.log('-------------------------');
  });
}

run();
