import { performance } from 'perf_hooks';

const BASE_URL = 'http://localhost:5000/api';

async function runBenchmark() {
  console.log('====================================================');
  printMessage(' RefundShield Pre-Payment API Benchmark Runner');
  console.log('====================================================');

  try {
    // 1. Authenticate with server
    console.log('Authenticating as admin...');
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin', password: 'admin123' })
    });

    if (!loginRes.ok) {
      throw new Error(`Login failed with status ${loginRes.status}`);
    }

    const { token } = await loginRes.json();
    console.log('Authenticated successfully! Token acquired.\n');

    // 2. Perform checkout requests
    const totalRequests = 50;
    const latencies = [];
    console.log(`Running ${totalRequests} sequential pre-payment checkout requests...`);

    for (let i = 1; i <= totalRequests; i++) {
      const start = performance.now();
      const res = await fetch(`${BASE_URL}/sandbox/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          customerId: 'cust_NET1_001',
          amount: 85000,
          itemTitle: 'MacBook Pro 16'
        })
      });
      const end = performance.now();
      
      if (!res.ok) {
        console.warn(`Request #${i} failed: Status ${res.status}`);
        continue;
      }

      const duration = end - start;
      latencies.push(duration);
      
      if (i % 10 === 0) {
        console.log(`Completed ${i}/${totalRequests} requests...`);
      }
    }

    if (latencies.length === 0) {
      console.error('No requests succeeded. Benchmark failed.');
      return;
    }

    // 3. Compute Metrics
    latencies.sort((a, b) => a - b);
    const sum = latencies.reduce((a, b) => a + b, 0);
    const average = sum / latencies.length;
    const minVal = latencies[0];
    const maxVal = latencies[latencies.length - 1];
    
    const p95Idx = Math.floor(latencies.length * 0.95);
    const p95 = latencies[p95Idx] || latencies[latencies.length - 1];

    console.log('\n================ BENCHMARK RESULTS ================');
    console.log(`Total Requests:      ${latencies.length}`);
    console.log(`Minimum Latency:     ${minVal.toFixed(2)} ms`);
    console.log(`Maximum Latency:     ${maxVal.toFixed(2)} ms`);
    console.log(`Average Latency:     ${average.toFixed(2)} ms`);
    console.log(`P95 Latency:         ${p95.toFixed(2)} ms`);
    console.log('===================================================\n');

  } catch (err) {
    console.error(`Benchmark failed with error: ${err.message}`);
  }
}

function printMessage(msg) {
  console.log(msg);
}

runBenchmark();
