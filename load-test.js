const autocannon = require('autocannon');

const url = process.argv[2] || 'http://localhost:3000/api/health';
console.log(`Starting load test on ${url}...`);
console.log(`- 100 virtual users`);
console.log(`- Running continuously for 1 minute\n`);

const instance = autocannon({
  url: url,
  connections: 100, // 100 virtual users
  duration: 60 // 1 minute
}, (err, result) => {
  if (err) {
    console.error('Error running load test:', err);
    process.exit(1);
  }
  
  console.log('______________');
  console.log('What you will see');
  console.log('Requests per second (RPS)');
  console.log('Example:');
  console.log(`${Math.round(result.requests.average)} req/sec`);
  console.log('Meaning your API is handling about this many requests every second.');
  console.log('______________');
  console.log('Response Time');
  console.log('Example:');
  console.log(`Average: ${Math.round(result.latency.average)}ms`);
  console.log(`Min: ${result.latency.min}ms`);
  console.log(`Max: ${result.latency.max}ms`);
  console.log('Meaning:');
  console.log(`• Fastest response = ${result.latency.min}ms`);
  console.log(`• Average = ${Math.round(result.latency.average)}ms`);
  console.log(`• Slowest = ${result.latency.max >= 1000 ? (result.latency.max / 1000).toFixed(1) + 's' : result.latency.max + 'ms'}`);
  process.exit(0);
});

autocannon.track(instance, { renderProgressBar: true });
