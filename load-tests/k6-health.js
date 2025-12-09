/**
 * k6 Load Test - Health Endpoints
 * 
 * Safe load test that does NOT call AI APIs (no cost).
 * Use this to establish baseline performance metrics.
 * 
 * Install k6: https://k6.io/docs/get-started/installation/
 * 
 * IMPORTANT: Services must be running before executing this test!
 * 
 * Default ports:
 * - Python Worker API: http://localhost:8001
 * - Node Worker: http://localhost:3001
 * 
 * For LOCAL testing:
 *   1. Start Python: cd python-worker && python main.py (or python api_server.py)
 *   2. Start Node: cd node-worker && npm run dev
 *   3. Run: k6 run k6-health.js
 * 
 * For DEPLOYED services:
 *   k6 run -e PYTHON_URL=https://your-python-worker.onrender.com \
 *          -e NODE_URL=https://your-node-worker.onrender.com \
 *          k6-health.js
 * 
 * Quick test (recommended first):
 *   k6 run --vus 2 --duration 10s k6-health.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const healthLatency = new Trend('health_latency');

// Configuration - update these URLs for your deployment
// NOTE: Python API runs on port 8001, NOT 8000
const BASE_URL_PYTHON = __ENV.PYTHON_URL || 'http://localhost:8001';
const BASE_URL_NODE = __ENV.NODE_URL || 'http://localhost:3001';

// Test configuration with graceful defaults
export const options = {
    vus: 2,
    duration: '30s',

    thresholds: {
        http_req_duration: ['p(95)<2000'],   // 95% under 2s (generous for free tier cold starts)
        http_req_failed: ['rate<0.5'],        // Allow up to 50% failures for connectivity issues
        errors: ['rate<0.5'],
    },
};

// Check if a service is available
function checkService(url, name) {
    try {
        const res = http.get(`${url}/health`, {
            tags: { name: `${name}-health` },
            timeout: '10s',
        });

        healthLatency.add(res.timings.duration);

        const isOk = check(res, {
            [`${name} health status is 200`]: (r) => r.status === 200,
            [`${name} health response is JSON`]: (r) => {
                const contentType = r.headers['Content-Type'] || '';
                return contentType.includes('application/json');
            },
        });

        errorRate.add(!isOk);
        return isOk;
    } catch (e) {
        console.log(`⚠️ ${name} service not reachable at ${url}: ${e.message}`);
        errorRate.add(true);
        return false;
    }
}

export default function () {
    // Test Python Worker Health (port 8001)
    checkService(BASE_URL_PYTHON, 'python');

    // Test Node Worker Health (port 3001)
    checkService(BASE_URL_NODE, 'node');

    // Small delay between iterations
    sleep(0.5);
}

export function handleSummary(data) {
    const output = [];

    output.push('\n📊 Load Test Results Summary\n');
    output.push('='.repeat(50));

    const reqDuration = data.metrics.http_req_duration;
    const reqFailed = data.metrics.http_req_failed;
    const totalRequests = data.metrics.http_reqs?.values?.count || 0;

    output.push(`\nTest Configuration:`);
    output.push(`  Python URL: ${BASE_URL_PYTHON} (port 8001)`);
    output.push(`  Node URL: ${BASE_URL_NODE} (port 3001)`);

    output.push(`\nResults:`);
    output.push(`  Total Requests: ${totalRequests}`);
    output.push(`  Request Rate: ${(data.metrics.http_reqs?.values?.rate || 0).toFixed(2)} req/s`);

    if (reqDuration?.values) {
        output.push(`\nLatency:`);
        output.push(`  Average: ${(reqDuration.values.avg || 0).toFixed(2)}ms`);
        output.push(`  p50: ${(reqDuration.values['p(50)'] || 0).toFixed(2)}ms`);
        output.push(`  p95: ${(reqDuration.values['p(95)'] || 0).toFixed(2)}ms`);
        output.push(`  p99: ${(reqDuration.values['p(99)'] || 0).toFixed(2)}ms`);
    }

    const errorRateVal = reqFailed?.values?.rate || 0;
    output.push(`\nError Rate: ${(errorRateVal * 100).toFixed(2)}%`);

    output.push('\n' + '='.repeat(50));

    if (totalRequests === 0) {
        output.push('\n⚠️  No successful requests! Make sure services are running:');
        output.push('    1. Python: cd python-worker && python main.py');
        output.push('       (API runs on port 8001, NOT 8000)');
        output.push('    2. Node: cd node-worker && npm run dev');
        output.push('       (runs on port 3001)\n');
    } else if (errorRateVal > 0.5) {
        output.push('\n⚠️  High error rate detected. Check service connectivity.\n');
    } else {
        output.push('\n✅ Load test completed successfully!\n');
    }

    console.log(output.join('\n'));

    return {};
}
