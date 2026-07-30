const autocannon = require('autocannon');
const os = require('os');
const fs = require('fs');
const path = require('path');

function getCpuUsage() {
  const cpus = os.cpus();
  let user = 0, nice = 0, sys = 0, idle = 0, irq = 0;
  for (const cpu of cpus) {
    user += cpu.times.user;
    nice += cpu.times.nice;
    sys += cpu.times.sys;
    idle += cpu.times.idle;
    irq += cpu.times.irq;
  }
  const total = user + nice + sys + idle + irq;
  return { idle, total };
}

async function runLoadTest(targetUrl, connections = 100, duration = 60) {
  console.log(`====================================================`);
  console.log(`Starting Baseline Load Test Suite`);
  console.log(`Target URL: ${targetUrl}`);
  console.log(`Concurrent Users (VUs): ${connections}`);
  console.log(`Duration: ${duration} seconds`);
  console.log(`====================================================\n`);

  const cpuSamples = [];
  const memSamples = [];
  let initialCpu = getCpuUsage();

  const sampleInterval = setInterval(() => {
    const currentCpu = getCpuUsage();
    const idleDiff = currentCpu.idle - initialCpu.idle;
    const totalDiff = currentCpu.total - initialCpu.total;
    const cpuPercent = totalDiff > 0 ? (100 * (1 - idleDiff / totalDiff)) : 0;
    initialCpu = currentCpu;

    const freeMemMb = os.freemem() / (1024 * 1024);
    const totalMemMb = os.totalmem() / (1024 * 1024);
    const usedMemMb = totalMemMb - freeMemMb;
    const memPercent = (usedMemMb / totalMemMb) * 100;

    cpuSamples.push(cpuPercent);
    memSamples.push(usedMemMb);
  }, 1000);

  return new Promise((resolve, reject) => {
    const instance = autocannon({
      url: targetUrl,
      connections: connections,
      duration: duration,
      pipelining: 1,
      timeout: 10,
    }, (err, result) => {
      clearInterval(sampleInterval);
      if (err) return reject(err);

      const avgCpu = cpuSamples.length ? (cpuSamples.reduce((a, b) => a + b, 0) / cpuSamples.length) : 0;
      const maxCpu = cpuSamples.length ? Math.max(...cpuSamples) : 0;
      const avgMem = memSamples.length ? (memSamples.reduce((a, b) => a + b, 0) / memSamples.length) : 0;
      const maxMem = memSamples.length ? Math.max(...memSamples) : 0;

      const summary = {
        targetUrl,
        duration,
        connections,
        totalRequests: result.requests.total,
        rpsAvg: result.requests.average,
        rpsMax: result.requests.max,
        latency: {
          min: result.latency.min,
          avg: result.latency.average,
          max: result.latency.max,
          p50: result.latency.p50,
          p90: result.latency.p90,
          p95: result.latency.p95 || result.latency.p97_5 || result.latency.p99,
          p99: result.latency.p99
        },
        throughputBytesPerSec: result.throughput.average,
        throughputMbPerSec: (result.throughput.average / (1024 * 1024)).toFixed(2),
        totalBytes: result.throughput.total,
        errors: result.errors,
        timeouts: result.timeouts,
        non2xx: result.non2xx,
        statusCodes: result.statusCodeStats,
        errorRatePercent: (((result.errors + result.timeouts + result.non2xx) / (result.requests.total || 1)) * 100).toFixed(2),
        cpu: {
          avgPercent: avgCpu.toFixed(1),
          maxPercent: maxCpu.toFixed(1)
        },
        memory: {
          avgMb: avgMem.toFixed(1),
          maxMb: maxMem.toFixed(1)
        }
      };

      console.log("\n================ LOAD TEST RESULTS ================");
      console.log(`Total Requests:         ${summary.totalRequests}`);
      console.log(`Requests / Sec (RPS):   ${summary.rpsAvg.toFixed(2)}`);
      console.log(`Throughput:             ${summary.throughputMbPerSec} MB/s`);
      console.log(`Error Rate:             ${summary.errorRatePercent}%`);
      console.log(`Latency Min:            ${summary.latency.min} ms`);
      console.log(`Latency Avg:            ${summary.latency.avg.toFixed(2)} ms`);
      console.log(`Latency p95:            ${summary.latency.p95} ms`);
      console.log(`Latency Max:            ${summary.latency.max} ms`);
      console.log(`CPU Utilization (Avg):  ${summary.cpu.avgPercent}% (Max: ${summary.cpu.maxPercent}%)`);
      console.log(`RAM Usage (Avg):        ${summary.memory.avgMb} MB (Max: ${summary.memory.maxMb} MB)`);
      console.log("===================================================\n");

      fs.writeFileSync(path.join(__dirname, 'load-test-results.json'), JSON.stringify(summary, null, 2));
      resolve(summary);
    });

    autocannon.track(instance, { renderProgressBar: true });
  });
}

const targetUrl = process.argv[2] || 'http://localhost:3000/api/health';
const connections = parseInt(process.argv[3] || '100', 10);
const duration = parseInt(process.argv[4] || '60', 10);

runLoadTest(targetUrl, connections, duration)
  .then(() => process.exit(0))
  .catch(err => {
    console.error("Test failed:", err);
    process.exit(1);
  });
