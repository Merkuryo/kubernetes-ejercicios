# Exercise 5.6: Trying Serverless - Knative Serving

## Overview

This exercise explores serverless computing on Kubernetes by setting up **Knative Serving**, a Kubernetes-native serverless platform. Knative enables you to build and run serverless applications on top of Kubernetes, providing automatic scaling, versioning, and traffic management.

## What You'll Learn

- What is serverless and how it differs from traditional container platforms
- How Knative brings serverless capabilities to Kubernetes
- Installing and configuring Knative Serving
- Deploying serverless applications (Knative Services)
- Implementing autoscaling (scale-to-zero)
- Traffic splitting and canary deployments at the serverless level
- The Knative runtime contract for application portability

## Understanding Serverless

### Why Serverless Matters

Serverless computing abstracts infrastructure management:
- **No infrastructure to manage** - Focus on code, not servers
- **Automatic scaling** - Scale to zero when idle, unlimited when needed
- **Pay for usage** - Only pay when functions execute
- **Faster deployment** - Deploy code directly without containers
- **Built-in observability** - Automatic logging and monitoring

### Common Serverless Platforms

| Platform | Host | Kubernetes Support |
|----------|------|-------------------|
| Google Cloud Run | Google Cloud | Built on Knative |
| AWS Lambda | AWS | No (managed service) |
| Azure Functions | Azure | No (managed service) |
| Knative | Open Source | Yes (on top of K8s) |
| OpenFaaS | Open Source | Yes |
| Kubeless | Open Source | Yes |
| Fission | Open Source | Yes |

### Kubernetes vs Serverless

> "Kubernetes is competing with serverless" doesn't make sense. Serverless runs **on top of** Kubernetes or alongside it.

Both can coexist:
- **Kubernetes**: Fine-grained control, stateful workloads, complex applications
- **Serverless (on K8s)**: Simple functions, event-driven, automatic scaling

---

## The Knative Ecosystem

### What is Knative?

Knative is an open-source Kubernetes extension providing serverless application framework:
- **Serving**: Deploy and manage serverless workloads
- **Eventing**: Event routing and delivery (not covered in this exercise)
- **Functions**: Framework for writing serverless functions (optional)

### Knative Serving Components

```
┌─────────────────────────────────────────────┐
│         Knative Serving (Serving)           │
├─────────────────────────────────────────────┤
│ • Controller: Manages services lifecycle    │
│ • Activator: Handles cold-start requests   │
│ • Autoscaler: Scale-to-zero logic          │
│ • Webhook: Validates service definitions   │
│ • Networking: Service ingress (Kourier)    │
└─────────────────────────────────────────────┘
        ↓
    Kubernetes Cluster (k3d)
```

### The Knative Runtime Contract

Every serverless platform needs a contract defining how applications must behave. Knative's contract:

**MUST HAVE:**
- Application must be **stateless**
- Must listen on a port specified by `PORT` environment variable
- Must handle `SIGTERM` gracefully

**SHOULD HAVE:**
- Configurable via environment variables
- Health checks (liveness/readiness)
- Low startup time (for fast cold starts)

**This contract is used by**:
- Google Cloud Run (implements Knative spec)
- Other platforms building serverless systems

---

## Prerequisites

### System Requirements

```bash
# Required tools
- k3d (Kubernetes in Docker)
- kubectl (Kubernetes CLI)
- curl (for testing)
- Docker (already running)

# Recommended specs
- 4+ GB RAM available
- 2+ CPU cores
- 10+ GB disk space
```

### Check Prerequisites

```bash
# Verify k3d installation
k3d version

# Verify kubectl installation
kubectl version --client

# Verify docker is running
docker ps
```

---

## Architecture: Knative Serving Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    End User Request                          │
│                    curl -H Host: ... http://localhost:8081   │
└──────────────────────────────┬──────────────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │  Load Balancer      │
                    │  (Port 8081→80)     │
                    └──────────┬──────────┘
                               │
        ┌──────────────────────▼──────────────────────┐
        │     Knative Ingress (Kourier)               │
        │  Routes requests to Knative Services        │
        └──────────────────────┬──────────────────────┘
                               │
        ┌──────────────────────▼──────────────────────┐
        │     Knative Activator                       │
        │  - Cold starts: Wakes pods from scale-to-0 │
        │  - Queueing: Buffers concurrent requests   │
        └──────────────────────┬──────────────────────┘
                               │
        ┌──────────────────────▼──────────────────────┐
        │     Knative Autoscaler                      │
        │  - Monitors metrics (requests/sec, latency) │
        │  - Scales pods up/down                      │
        │  - Scale-to-zero after idle timeout        │
        └──────────────────────┬──────────────────────┘
                               │
        ┌──────────────────────▼──────────────────────┐
        │     User Application Pod                    │
        │  - Stateless containerized app             │
        │  - Listens on PORT env variable            │
        │  - Processes request & returns response    │
        └─────────────────────────────────────────────┘
```

---

## Installation Steps

### Step 1: Create k3d Cluster (Without Traefik)

Knative needs its own networking layer, so disable Traefik:

```bash
# Create cluster with port mappings and no Traefik
k3d cluster create \
  --port 8082:30080@agent:0 \
  -p 8081:80@loadbalancer \
  --agents 2 \
  --k3s-arg "--disable=traefik@server:0"

# Wait for cluster to be ready
kubectl wait --for=condition=Ready nodes --all --timeout=300s

# Verify nodes are ready
kubectl get nodes
```

**Port Mapping Explanation:**
- `8082:30080@agent:0` - Maps host port 8082 to node port 30080 on agent 0
- `-p 8081:80@loadbalancer` - Maps host port 8081 to ingress port 80

### Step 2: Install Knative Serving

```bash
# Install Custom Resource Definitions (CRDs)
kubectl apply -f https://github.com/knative/serving/releases/download/knative-v1.13.0/serving-crds.yaml

# Install Knative Serving core components
kubectl apply -f https://github.com/knative/serving/releases/download/knative-v1.13.0/serving-core.yaml

# Install Knative networking layer (Kourier)
kubectl apply -f https://github.com/knative/net-kourier/releases/download/knative-v1.13.0/kourier.yaml

# Configure Knative to use Kourier as default
kubectl patch configmap/config-network \
  --namespace knative-serving \
  --type merge \
  --patch '{"data":{"ingress.class":"kourier.ingress.networking.knative.dev"}}'
```

### Step 3: Configure DNS (Magic DNS - sslip.io)

Magic DNS uses special domain `*.sslip.io` that automatically resolves to IP addresses encoded in the domain:

```bash
# Install Magic DNS
kubectl apply -f https://github.com/knative/serving/releases/download/knative-v1.13.0/serving-default-domain.yaml

# Verify DNS is configured
kubectl get cm config-domain -n knative-serving
```

### Step 4: Verify Installation

```bash
# Check Knative Serving namespace
kubectl get pods -n knative-serving

# Expected output (all READY 1/1):
# NAME                                      READY   STATUS    RESTARTS   AGE
# activator-67855958d-w2ws8                 1/1     Running   0          30s
# autoscaler-5ff4c5d679-54l28               1/1     Running   0          30s
# webhook-5446675b97-2ngh6                  1/1     Running   0          30s
# net-kourier-controller-58b6bf4fbc-g7dlp   1/1     Running   0          25s
# controller-6d8b579f9-p42dx                1/1     Running   0          30s

# Check Kourier networking
kubectl get pods -n kourier-system
kubectl get svc -n kourier-system
```

---

## Troubleshooting CrashLoopBackOff

If pods are stuck in `CrashLoopBackOff`, check logs:

```bash
# View pod logs
kubectl logs -n knative-serving webhook -f
kubectl logs -n knative-serving controller -f
kubectl logs -n kourier-system net-kourier-controller -f

# Common issues:
# 1. Insufficient resources (need --agents 2 or higher)
# 2. Port conflicts (ensure 8081, 8082 are available)
# 3. Docker resource constraints (increase Docker memory)

# Solution: Restart and wait for stabilization
kubectl rollout restart deployment webhook -n knative-serving
```

---

## Deploying Knative Services

### Example 1: Simple Hello World Service

Create file `hello-service.yaml`:

```yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: hello
  namespace: default
spec:
  template:
    metadata:
      name: hello-v1
    spec:
      containers:
      - image: gcr.io/knative-samples/helloworld-go
        ports:
        - containerPort: 8080
        env:
        - name: TARGET
          value: "Knative"
```

Deploy:

```bash
kubectl apply -f hello-service.yaml

# Get service URL
kubectl get ksvc

# Expected output:
# NAME    URL                                                      LATESTCREATED   LATESTREADY   READY   REASON
# hello   http://hello.default.192.168.240.3.sslip.io            hello-v1        hello-v1      True    
```

Test:

```bash
# Get the IP address from the URL (192.168.240.3 in example above)
SERVICE_IP=$(kubectl get ksvc hello -o jsonpath='{.status.url}' | grep -o '[0-9]\+\.[0-9]\+\.[0-9]\+\.[0-9]\+')

# Test the service
curl -H "Host: hello.default.${SERVICE_IP}.sslip.io" http://localhost:8081

# Response should be:
# Hello Knative!
```

### Example 2: Scale-to-Zero Demo

```bash
# Deploy service
kubectl apply -f hello-service.yaml

# Watch pods (in another terminal)
watch -n 1 kubectl get pods

# Make requests
curl -H "Host: hello.default.192.168.240.3.sslip.io" http://localhost:8081

# Watch pods scale up (appear)
# Wait 60 seconds without requests
# Watch pods scale down to zero (disappear)

# Make another request to see cold start
curl -H "Host: hello.default.192.168.240.3.sslip.io" http://localhost:8081
# Notice slight delay as pod starts
```

### Example 3: Autoscaling

Create file `autoscale-service.yaml`:

```yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: autoscale-example
spec:
  template:
    metadata:
      annotations:
        autoscaling.knative.dev/minScale: "1"    # Min 1 pod always running
        autoscaling.knative.dev/maxScale: "10"   # Max 10 pods
        autoscaling.knative.dev/target: "50"     # Scale at 50 requests/sec
    spec:
      containers:
      - image: gcr.io/knative-samples/helloworld-go
        env:
        - name: TARGET
          value: "Autoscale"
```

Deploy and test:

```bash
kubectl apply -f autoscale-service.yaml

# Monitor autoscaling (in one terminal)
watch -n 1 kubectl get ksvc,pods

# Generate load (in another terminal)
# Using Apache Bench or similar
ab -n 1000 -c 50 \
  -H "Host: autoscale-example.default.192.168.240.3.sslip.io" \
  http://localhost:8081/

# Watch pods scale up automatically
```

### Example 4: Traffic Splitting (Canary)

Create file `traffic-split.yaml`:

```yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: traffic-split
spec:
  template:
    metadata:
      name: traffic-split-v2
    spec:
      containers:
      - image: gcr.io/knative-samples/helloworld-go
        env:
        - name: TARGET
          value: "Version 2"
  traffic:
  - tag: v1
    revisionName: traffic-split-v1
    percent: 90
  - tag: v2
    revisionName: traffic-split-v2
    percent: 10
```

Deploy and test:

```bash
# First, deploy initial version
kubectl apply -f traffic-split.yaml

# Update the deployment (triggers new revision)
kubectl patch ksvc traffic-split --type merge -p \
  '{"spec":{"traffic":[{"revisionName":"traffic-split-v1","percent":90},{"revisionName":"traffic-split-v2","percent":10}]}}'

# Test traffic split
for i in {1..100}; do
  curl -s -H "Host: traffic-split.default.192.168.240.3.sslip.io" http://localhost:8081
done

# Monitor which version handles each request
```

---

## Key Knative Concepts

### Revisions

Every deployment creates a new **revision**:
- Immutable snapshot of code + configuration
- Automatically versioned (traffic-split-00001, etc.)
- Can route traffic between revisions

```bash
# View revisions
kubectl get revisions

# Route all traffic to specific revision
kubectl patch ksvc hello --type merge -p \
  '{"spec":{"traffic":[{"latestRevision":false,"revisionName":"hello-00001","percent":100}]}}'
```

### Configuration

Defines code + settings for deployment:

```yaml
apiVersion: serving.knative.dev/v1
kind: Configuration
metadata:
  name: myapp
spec:
  template:
    spec:
      containers:
      - image: gcr.io/my-app:latest
```

### Route

Routes traffic to one or more revisions:

```yaml
apiVersion: serving.knative.dev/v1
kind: Route
metadata:
  name: myapp
spec:
  traffic:
  - revisionName: myapp-00001
    percent: 100
```

### Service

Combines Configuration + Route (highest level abstraction):

```yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: myapp
spec:
  template: # Configuration
    spec:
      containers:
      - image: gcr.io/my-app:latest
  traffic: # Route
  - latestRevision: true
    percent: 100
```

---

## The Serverless Runtime Contract

### Application Requirements

To run on any serverless platform (including Knative):

**Stateless:**
- No local storage expectations
- No session affinity
- Requests can be handled by any pod instance

**Configurable:**
- All configuration via environment variables
- No hardcoded values
- PORT environment variable for listening port

**Graceful Shutdown:**
- Handle SIGTERM signal
- Complete in-flight requests
- Exit cleanly within timeout

**Example: Go Application**

```go
package main

import (
    "fmt"
    "os"
    "net/http"
)

func main() {
    target := os.Getenv("TARGET")
    if target == "" {
        target = "World"
    }
    
    http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
        fmt.Fprintf(w, "Hello %s!\n", target)
    })
    
    port := os.Getenv("PORT")
    if port == "" {
        port = "8080"
    }
    
    http.ListenAndServe(":"+port, nil)
}
```

This app is portable to:
- Google Cloud Run
- Any Knative cluster
- Any other serverless platform implementing the contract

---

## Monitoring & Debugging

### View Service Status

```bash
# List all Knative services
kubectl get ksvc

# Detailed service info
kubectl describe ksvc hello

# View recent revisions
kubectl get revision -A
```

### View Metrics

```bash
# Pod scaling activity
kubectl logs -n knative-serving -l app=autoscaler

# Request handling
kubectl logs -n knative-serving -l app=activator

# Service lifecycle
kubectl logs -n knative-serving -l app=controller
```

### Port Forwarding (Alternative Testing)

```bash
# If sslip.io doesn't work, use port-forward
kubectl port-forward svc/kourier 8080:80 -n kourier-system

# Then test with
curl -H "Host: hello.default.sslip.io" http://localhost:8080
```

---

## Cleanup

```bash
# Delete all Knative services
kubectl delete ksvc --all

# Delete Knative installation
kubectl delete -f https://github.com/knative/serving/releases/download/knative-v1.13.0/serving-core.yaml

# Delete k3d cluster
k3d cluster delete

# Verify deletion
k3d cluster list
```

---

## Summary

### What You've Learned

✅ Serverless computing on Kubernetes with Knative
✅ Installing and configuring Knative Serving
✅ Deploying serverless applications (Knative Services)
✅ Scale-to-zero autoscaling
✅ Traffic splitting for canary deployments
✅ The serverless runtime contract

### Key Takeaways

1. **Serverless ≠ No Kubernetes** - Runs on top of K8s for maximum flexibility
2. **Scale-to-Zero** - Pay only for what you use
3. **Revisions** - Immutable deployments enable safe traffic splitting
4. **Portability** - Runtime contract ensures apps work across platforms
5. **Automatic Management** - No infrastructure concerns, focus on code

### Next Steps

- Explore Knative Eventing for event-driven architectures
- Try other serverless platforms (OpenFaaS, Fission)
- Build production serverless applications
- Integrate with CI/CD pipelines
- Set up monitoring and alerting

---

## References

- [Knative Official Documentation](https://knative.dev/docs/)
- [Knative Serving](https://knative.dev/docs/serving/)
- [Knative Runtime Contract](https://github.com/knative/specs/blob/main/specs/core/runtime-contract.md)
- [Google Cloud Run (Knative-based)](https://cloud.google.com/run/docs)
- [Knative Samples](https://github.com/knative/samples)
- [sslip.io DNS Service](https://sslip.io/)
- [Kourier Ingress](https://github.com/knative-sandbox/net-kourier)
