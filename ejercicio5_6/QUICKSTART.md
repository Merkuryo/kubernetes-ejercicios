# Knative Serving Quick Start Guide

## Overview

Knative Serving brings serverless capabilities to Kubernetes, enabling:
- **Scale-to-Zero**: Automatically scale pods to zero when idle
- **Automatic Scaling**: Scale based on demand (RPS, concurrency, latency)
- **Versioning & Traffic Splitting**: Blue-green and canary deployments
- **Fast Startup**: Cold start ready in milliseconds

## 1. Quick Setup (5 minutes)

### Create Cluster

```bash
# Create k3d cluster WITHOUT Traefik
k3d cluster create \
  --port 8082:30080@agent:0 \
  -p 8081:80@loadbalancer \
  --agents 2 \
  --k3s-arg "--disable=traefik@server:0"
```

### Install Knative (One Command)

```bash
# Run automated setup
bash deploy.sh
```

Or manually:

```bash
# Install CRDs
kubectl apply -f https://github.com/knative/serving/releases/download/knative-v1.13.0/serving-crds.yaml

# Install core
kubectl apply -f https://github.com/knative/serving/releases/download/knative-v1.13.0/serving-core.yaml

# Install networking (Kourier)
kubectl apply -f https://github.com/knative/net-kourier/releases/download/knative-v1.13.0/kourier.yaml

# Configure Kourier
kubectl patch configmap/config-network \
  --namespace knative-serving \
  --type merge \
  --patch '{"data":{"ingress.class":"kourier.ingress.networking.knative.dev"}}'

# Configure DNS (sslip.io)
kubectl apply -f https://github.com/knative/serving/releases/download/knative-v1.13.0/serving-default-domain.yaml
```

### Verify

```bash
kubectl get pods -n knative-serving
kubectl get pods -n kourier-system
```

## 2. Deploy First Service (30 seconds)

### Create Service

```yaml
# hello.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: hello
spec:
  template:
    spec:
      containers:
      - image: gcr.io/knative-samples/helloworld-go
        env:
        - name: TARGET
          value: "Knative"
```

### Deploy & Test

```bash
# Deploy
kubectl apply -f hello.yaml

# Get URL
kubectl get ksvc hello

# Test (get IP from URL)
curl -H "Host: hello.default.192.168.X.X.sslip.io" http://localhost:8081
```

## 3. Watch Scale-to-Zero

```bash
# Terminal 1: Watch pods
watch -n 1 kubectl get pods

# Terminal 2: Make requests
curl -H "Host: hello.default.192.168.X.X.sslip.io" http://localhost:8081

# Results:
# - Pod appears immediately
# - Pod disappears after 60 seconds of idle
# - Next request triggers cold start (notice delay)
```

## 4. Configure Autoscaling

### Min/Max Replicas

```yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: always-up
spec:
  template:
    metadata:
      annotations:
        autoscaling.knative.dev/minScale: "1"   # Min 1 pod
        autoscaling.knative.dev/maxScale: "10"  # Max 10 pods
    spec:
      containers:
      - image: gcr.io/knative-samples/helloworld-go
```

### RPS-Based Scaling

```yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: high-traffic
spec:
  template:
    metadata:
      annotations:
        autoscaling.knative.dev/metric: "rps"      # Requests per second
        autoscaling.knative.dev/target: "100"      # Scale at 100 RPS
        autoscaling.knative.dev/minScale: "2"
        autoscaling.knative.dev/maxScale: "50"
    spec:
      containers:
      - image: gcr.io/knative-samples/helloworld-go
```

## 5. Traffic Splitting (Canary)

### Deploy v1 first

```bash
# hello-v1.yaml already deployed
```

### Deploy v2 and split traffic

```yaml
# Update with traffic split
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: hello
spec:
  template:
    metadata:
      name: hello-v2
    spec:
      containers:
      - image: gcr.io/knative-samples/helloworld-go
        env:
        - name: TARGET
          value: "Version 2"
  traffic:
  # 90% to v1
  - revisionName: hello-00001
    percent: 90
  # 10% to v2
  - revisionName: hello-00002
    percent: 10
```

### Test traffic split

```bash
# Apply updated service
kubectl apply -f hello.yaml

# Test 100 requests
for i in {1..100}; do
  curl -s -H "Host: hello.default.X.X.sslip.io" http://localhost:8081
done

# Monitor revisions
kubectl get revisions
kubectl get routes hello -o jsonpath='{.status.traffic}'
```

## 6. Common Commands

### Knative Service Management

```bash
# List services
kubectl get ksvc

# Describe service
kubectl describe ksvc hello

# View service details
kubectl get ksvc hello -o yaml

# Delete service
kubectl delete ksvc hello
```

### View Revisions

```bash
# List all revisions
kubectl get revision

# Describe revision
kubectl describe revision hello-00001

# View revision status
kubectl get revision hello-00001 -o jsonpath='{.status}'
```

### Monitoring

```bash
# Controller logs
kubectl logs -n knative-serving -l app=controller -f

# Autoscaler logs
kubectl logs -n knative-serving -l app=autoscaler -f

# Activator logs (cold starts)
kubectl logs -n knative-serving -l app=activator -f

# Pod logs
kubectl logs -n default deployment/hello-00001
```

### Advanced Debugging

```bash
# Check service configuration
kubectl get configmap -n knative-serving

# View autoscaling metrics
kubectl get pod -n knative-serving -l app=autoscaler -o jsonpath='{.items[0].spec.containers[0].env}'

# Check network policy
kubectl get networkpolicy -n knative-serving

# View Kourier service
kubectl get svc -n kourier-system
kubectl describe svc kourier -n kourier-system
```

## 7. Troubleshooting

### Service Not Ready

```bash
# Check service status
kubectl describe ksvc hello

# Check configuration
kubectl get configuration hello

# Check routes
kubectl get route hello

# Check revisions
kubectl get revision
```

### Pods Not Scaling Down

```bash
# Check autoscaler logs
kubectl logs -n knative-serving -l app=autoscaler

# Manually trigger scale-down
kubectl patch ksvc hello \
  --type merge \
  --patch '{"spec":{"template":{"metadata":{"annotations":{"autoscaling.knative.dev/scaleDownDelay":"10s"}}}}}'
```

### DNS Resolution Issues

```bash
# Check DNS configuration
kubectl get cm config-domain -n knative-serving

# Verify sslip.io endpoint
nslookup 192.168.X.X.sslip.io

# Test with port-forward alternative
kubectl port-forward svc/kourier 8080:80 -n kourier-system
curl -H "Host: hello.default.sslip.io" http://localhost:8080
```

### Cold Start Slow

```bash
# Increase container startup timeout
kubectl patch ksvc hello \
  --type merge \
  --patch '{"spec":{"template":{"spec":{"timeoutSeconds":600}}}}'

# Keep minimum replicas warm
kubectl patch ksvc hello \
  --type merge \
  --patch '{"spec":{"template":{"metadata":{"annotations":{"autoscaling.knative.dev/minScale":"1"}}}}}'
```

## 8. Example: Complete Production Setup

```yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: production-service
  namespace: production
spec:
  template:
    metadata:
      annotations:
        # Autoscaling policy
        autoscaling.knative.dev/minScale: "2"           # Min 2 pods
        autoscaling.knative.dev/maxScale: "100"         # Max 100 pods
        autoscaling.knative.dev/metric: "rps"           # Scale by RPS
        autoscaling.knative.dev/target: "1000"          # 1000 requests/sec per pod
        # Performance tuning
        autoscaling.knative.dev/scaleDownDelay: "60s"   # Wait 60s before scale down
    spec:
      containers:
      - name: app
        image: myregistry/myapp:1.0
        ports:
        - containerPort: 8080
        env:
        - name: PORT
          value: "8080"
        - name: LOG_LEVEL
          value: "info"
        resources:
          requests:
            cpu: "100m"
            memory: "256Mi"
          limits:
            cpu: "1"
            memory: "1Gi"
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 0
          periodSeconds: 3
      timeoutSeconds: 300
  # Canary deployment: 95% current, 5% new
  traffic:
  - latestRevision: false
    revisionName: production-service-00001
    percent: 95
    tag: stable
  - latestRevision: true
    percent: 5
    tag: canary
```

## 9. Testing & Load Generation

### Simple Load Test

```bash
# Using curl loop
SERVICE_IP="192.168.X.X"
for i in {1..1000}; do
  curl -H "Host: hello.default.${SERVICE_IP}.sslip.io" \
       http://localhost:8081 &
done

# Watch pods scale up
watch -n 1 kubectl get pods
```

### With Apache Bench

```bash
SERVICE_IP="192.168.X.X"

# 1000 requests, 50 concurrent
ab -n 1000 -c 50 \
   -H "Host: hello.default.${SERVICE_IP}.sslip.io" \
   http://localhost:8081/
```

## 10. Cleanup

```bash
# Delete all services
kubectl delete ksvc --all

# Delete Knative
kubectl delete namespace knative-serving
kubectl delete namespace kourier-system

# Delete k3d cluster
k3d cluster delete
```

## Key Takeaways

✅ **Serverless on Kubernetes** - Full control + serverless benefits
✅ **Scale-to-Zero** - Save costs during idle time
✅ **Automatic Scaling** - Handle traffic spikes automatically
✅ **Traffic Splitting** - Safe canary and blue-green deployments
✅ **Runtime Contract** - Portable apps across platforms
✅ **Fast Cold Starts** - Sub-second startup capability

## Next Steps

1. Deploy your own application following the runtime contract
2. Implement traffic splitting for canary deployments
3. Configure autoscaling based on metrics
4. Explore Knative Eventing for event-driven workloads
5. Compare with OpenFaaS or other serverless platforms
