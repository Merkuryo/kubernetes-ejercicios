# Exercise 5.7: Deploy to Serverless - Ping-Pong on Knative

## Overview

This exercise converts the classic Ping-Pong application into a **serverless service** running on Knative Serving. The application is redesigned to follow the Knative Runtime Contract, making it portable across any serverless platform that implements the contract.

## What You'll Learn

- Converting traditional applications to serverless workloads
- Implementing the Knative Runtime Contract
- Building stateless, scalable services
- Handling PORT environment variable configuration
- Graceful shutdown for serverless environments
- Health checks for serverless platforms
- Autoscaling and cold starts

## Key Differences: Traditional vs Serverless

### Traditional Ping-Pong (Kubernetes Deployment)
- Pod always running (even when idle)
- State stored in PostgreSQL database
- Pod-to-pod communication via Service DNS
- Manual scaling configuration
- Long startup time acceptable
- Cost proportional to uptime

### Serverless Ping-Pong (Knative Service)
- Pod scales to zero when idle (cost savings)
- Stateless (in-memory counter per instance)
- Automatically managed by Knative
- Automatic scaling based on traffic
- Fast cold starts (<1 second)
- Cost proportional to requests

## The Knative Runtime Contract

### Requirements for Serverless Applications

**MUST HAVE:**

1. **Stateless**
   - No local persistence expectations
   - State can be distributed or ephemeral
   - Request can be handled by any instance
   - No session affinity required

2. **Configurable Port**
   - Read `PORT` environment variable
   - Default to 8080 if not set
   - Listen on all interfaces (`0.0.0.0`)
   - Allow configuration without code changes

3. **Graceful Shutdown**
   - Handle `SIGTERM` signal
   - Complete in-flight requests
   - Exit cleanly within timeout
   - Release resources properly

**SHOULD HAVE:**

4. **Health Endpoints**
   - `/health` - Liveness check
   - `/ready` - Readiness check
   - Return 200 OK when healthy
   - Return 500+ on errors

5. **Fast Startup**
   - Minimize cold start time
   - Quick dependency initialization
   - Avoid long startup processes

---

## Architecture: Ping-Pong Serverless

```
┌─────────────────────────────────────────────────────────┐
│                  Client Request                          │
│            GET /ping, /pong, /stats, etc                 │
└────────────────────┬────────────────────────────────────┘
                     │
        ┌────────────▼───────────┐
        │ Knative Ingress        │
        │ (Kourier)              │
        │ Routes by Host header   │
        └────────────┬───────────┘
                     │
        ┌────────────▼────────────┐
        │ Knative Activator       │
        │ - Handles cold starts   │
        │ - Buffers requests      │
        │ - Wakes pods from 0     │
        └────────────┬────────────┘
                     │
        ┌────────────▼─────────────┐
        │ Knative Autoscaler       │
        │ - Monitors RPS           │
        │ - Scales pods up/down    │
        │ - Scale-to-zero logic    │
        └────────────┬─────────────┘
                     │
        ┌────────────▼────────────────┐
        │ Ping-Pong Service Pod(s)    │
        │                             │
        │  Node.js Express App:       │
        │  - Listens on PORT (8080)   │
        │  - GET /ping → pong         │
        │  - GET /pong → ping         │
        │  - GET /health → 200 OK     │
        │  - GET /ready → 200 OK      │
        │  - GET /stats → metrics     │
        │  - Graceful SIGTERM handler │
        │                             │
        │  Request counter (ephemeral)│
        │  Scales: 1-10 pods          │
        └─────────────────────────────┘
```

---

## Application Design

### Stateless Counter Implementation

Traditional approach (stateful):
```javascript
// Bad for serverless - state lost on pod restart
let globalCounter = 0;

app.get('/ping', (req, res) => {
  globalCounter++;  // Shared across instances
  res.json({ count: globalCounter });
});
```

Serverless approach (stateless):
```javascript
// Good for serverless - each instance tracks its own
let requestCount = 0;

app.get('/ping', (req, res) => {
  requestCount++;  // Local to this instance
  res.json({
    count: requestCount,
    pod: process.env.HOSTNAME,  // Different each time
    instance: process.env.INSTANCE_ID
  });
});
```

### Port Configuration

```javascript
// Flexible PORT configuration
const PORT = process.env.PORT || 8080;

// Or with validation
const PORT = parseInt(process.env.PORT || '8080');
if (PORT < 1024 || PORT > 65535) {
  throw new Error('Invalid PORT value');
}
```

### Health Checks

```javascript
// Liveness probe (is app alive?)
app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// Readiness probe (can accept traffic?)
app.get('/ready', (req, res) => {
  // Check dependencies
  if (dependenciesReady) {
    res.json({ status: 'ready' });
  } else {
    res.status(503).json({ status: 'not ready' });
  }
});
```

### Graceful Shutdown

```javascript
// Handle SIGTERM for clean shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received');
  
  // Stop accepting new connections
  server.close(() => {
    console.log('Server closed');
    // Give time for in-flight requests to complete
    setTimeout(() => {
      process.exit(0);
    }, 10000);  // 10 second timeout
  });
});
```

---

## Building the Image

### Dockerfile for Serverless

```dockerfile
# Multi-stage build for optimal image size
FROM node:18-slim as builder
WORKDIR /build
COPY package*.json ./
RUN npm ci --only=production

# Runtime stage
FROM node:18-slim
RUN useradd -m -u 1000 appuser
WORKDIR /app
COPY --from=builder /build/node_modules ./node_modules
COPY index.js .
RUN chown -R appuser:appuser /app
USER appuser

EXPOSE 8080
HEALTHCHECK CMD node -e "require('http').get('http://localhost:8080/health', r => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"
CMD ["node", "index.js"]
```

### Build Image

```bash
docker build -t ping-pong-serverless:latest .
```

---

## Knative Service Configuration

### Simple Configuration

```yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: ping-pong-serverless
spec:
  template:
    spec:
      containers:
      - image: ping-pong-serverless:latest
        env:
        - name: PORT
          value: "8080"
```

### Production Configuration (in ksvc.yaml)

- Autoscaling: 1-10 pods
- Scaling metric: Requests per second (50 RPS per pod)
- Resource requests: 50m CPU, 128Mi memory
- Resource limits: 500m CPU, 512Mi memory
- Health probes: startup, liveness, readiness
- Graceful shutdown: 30 seconds
- Request timeout: 300 seconds (5 minutes)

---

## Deployment

### Prerequisites

```bash
# Knative Serving must be installed
k3d cluster create --port 8082:30080@agent:0 \
  -p 8081:80@loadbalancer \
  --agents 2 \
  --k3s-arg "--disable=traefik@server:0"

# Install Knative (or run from ejercicio5_6)
bash ../ejercicio5_6/deploy.sh
```

### Deploy Service

```bash
# Build image
docker build -t ping-pong-serverless:latest .

# Load into k3d
k3d image load ping-pong-serverless:latest -c knative-cluster

# Deploy Knative Service
kubectl apply -f manifests/ksvc.yaml

# Verify deployment
kubectl get ksvc ping-pong-serverless
```

Or use the automated script:

```bash
bash deploy.sh
```

---

## Testing

### Get Service URL

```bash
kubectl get ksvc ping-pong-serverless

# Expected output:
# NAME                      URL                                                    LATESTCREATED              LATESTREADY                READY   REASON
# ping-pong-serverless      http://ping-pong-serverless.default.192.168.X.X.sslip.io   ping-pong-v1               ping-pong-v1               True    
```

### Test Endpoints

```bash
SERVICE_IP="192.168.X.X"  # From URL above
HOST="ping-pong-serverless.default.${SERVICE_IP}.sslip.io"

# Test /ping endpoint
curl -H "Host: $HOST" http://localhost:8081/ping
# Response: {"response":"pong","count":1,"pod":"...","instance":"serverless"}

# Test /pong endpoint
curl -H "Host: $HOST" http://localhost:8081/pong
# Response: {"response":"ping","count":2,"pod":"...","instance":"serverless"}

# Health check
curl -H "Host: $HOST" http://localhost:8081/health
# Response: {"status":"healthy"}

# Statistics
curl -H "Host: $HOST" http://localhost:8081/stats
# Response: {"requestCount":3,"uptime":...,"memory":{...}}
```

### Load Generation

```bash
# Generate traffic to observe autoscaling
for i in {1..1000}; do
  curl -s -H "Host: ping-pong-serverless.default.192.168.X.X.sslip.io" \
       http://localhost:8081/ping > /dev/null &
done

# Watch pods scale up
watch -n 1 kubectl get pods

# Wait 60+ seconds
# Watch pods scale down to zero (then up again on next request)
```

---

## Monitoring Scale-to-Zero

### Observing Cold Starts

```bash
# Terminal 1: Watch pods
kubectl get pods -w

# Terminal 2: Make request (cold start)
time curl -H "Host: ..." http://localhost:8081/ping

# Notice:
# 1. Pod appears (activated from 0)
# 2. Request takes longer (cold start)
# 3. Pod stays up
# 4. After 60s of idle → pod disappears
# 5. Next request → pod appears again (cold start again)
```

### View Metrics

```bash
# Autoscaler decisions
kubectl logs -n knative-serving -l app=autoscaler -f

# Cold start handling
kubectl logs -n knative-serving -l app=activator -f

# Service logs
kubectl logs -l serving.knative.dev/service=ping-pong-serverless -f
```

---

## Comparison: Traditional vs Serverless

### Traditional Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ping-pong
spec:
  replicas: 3
  template:
    spec:
      containers:
      - image: ping-pong:latest
        ports:
        - containerPort: 3000  # Hard-coded port
```

**Issues:**
- ❌ Always 3 pods running (even if idle)
- ❌ Hard-coded port (3000)
- ❌ Manual scaling required
- ❌ Needs database for state
- ❌ No cold start handling

### Serverless Knative Service

```yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: ping-pong-serverless
spec:
  template:
    spec:
      containers:
      - image: ping-pong-serverless:latest
        env:
        - name: PORT
          value: "8080"
```

**Benefits:**
- ✅ Scales 0-10 pods automatically
- ✅ Configurable port via ENV
- ✅ Automatic scaling on traffic
- ✅ Stateless (no database needed)
- ✅ Built-in cold start handling

---

## Key Takeaways

### Serverless Advantages

1. **Cost Efficiency**
   - Pay only for requests processed
   - Scale to zero when idle
   - No waste on idle capacity

2. **Automatic Scaling**
   - No manual configuration needed
   - Handles traffic spikes automatically
   - Scales down automatically

3. **Portability**
   - Runtime contract standardization
   - Works on any serverless platform
   - Same app on Cloud Run, Knative, OpenFaaS

4. **Developer Experience**
   - Focus on code, not infrastructure
   - Automatic deployment and rollback
   - Built-in monitoring

### Trade-offs to Consider

1. **Cold Starts**
   - First request after idle takes longer
   - Sub-second for Node.js, varies by language
   - Solved by keeping minScale > 0

2. **Statelessness**
   - Can't store state locally
   - Must use external storage if needed
   - Requires different architecture mindset

3. **Request Limits**
   - Timeout: 300 seconds (varies by platform)
   - Memory: Limited (varies by platform)
   - Good for microservices, not batch jobs

---

## Cleanup

```bash
# Delete Knative Service
kubectl delete ksvc ping-pong-serverless

# Verify deletion
kubectl get ksvc

# Optional: Delete entire k3d cluster
k3d cluster delete knative-cluster
```

---

## Further Reading

- [Knative Runtime Contract](https://github.com/knative/specs/blob/main/specs/core/runtime-contract.md)
- [Google Cloud Run Implementation](https://cloud.google.com/run/docs)
- [Knative Serving Best Practices](https://knative.dev/docs/serving/best-practices/)
- [Serverless Application Development](https://knative.dev/docs/serving/samples/)
- [Cold Start Optimization](https://knative.dev/docs/serving/configuration/initial-scale/)

---

## Summary

By converting Ping-Pong to serverless, you've learned:
- ✅ Knative Runtime Contract implementation
- ✅ Stateless application design
- ✅ Port configuration flexibility
- ✅ Graceful shutdown handling
- ✅ Health checks for serverless
- ✅ Automatic scaling and cold starts
- ✅ Cost optimization through scale-to-zero
- ✅ Portability across serverless platforms

This pattern applies to any application - by following the runtime contract, your code is truly portable!
