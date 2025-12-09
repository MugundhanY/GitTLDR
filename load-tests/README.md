# Load Testing Guide for GitTLDR

## Quick Start

### Install k6
```bash
# Windows (via Chocolatey)
choco install k6

# macOS
brew install k6

# Linux
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

## Available Tests

### 1. Health Endpoint Test (SAFE - No AI API costs)
Tests health endpoints without calling AI services.

```bash
# Start with 2 users (sanity check)
k6 run --vus 2 --duration 30s k6-health.js

# Scale to 50 users
k6 run --vus 50 --duration 60s k6-health.js

# Full load test with 200 users
k6 run --vus 200 --duration 120s k6-health.js
```

### 2. Custom URL Configuration
```bash
# Test against deployed services
k6 run --vus 50 --duration 60s \
  -e PYTHON_URL=https://your-python-worker.railway.app \
  -e NODE_URL=https://your-node-worker.railway.app \
  k6-health.js
```

## Understanding Results

After running a test, you'll see metrics like:
- **http_reqs**: Total requests made
- **http_req_duration**: Response time (avg, p50, p95, p99)
- **http_req_failed**: Error rate percentage
- **vus**: Virtual users (concurrent connections)

## AI Endpoint Testing (CAUTION - Costs Money!)

⚠️ **WARNING**: Testing Q&A endpoints will call Gemini/DeepSeek APIs and incur costs.

If you must test AI endpoints:
1. Use a very low VU count (1-2)
2. Set a short duration (10-30s)
3. Monitor your API costs

For accurate load testing of AI endpoints, consider:
1. Creating a mock mode in your API
2. Using cached/precomputed responses
3. Testing with rate limiting enabled

## Interpreting Results for Resume

| Metric | Good | Excellent |
|--------|------|-----------|
| Requests/sec | 50+ | 200+ |
| p95 Latency | <500ms | <100ms |
| Error Rate | <5% | <1% |
| Concurrent Users | 50+ | 200+ |

