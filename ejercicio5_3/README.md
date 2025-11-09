# Ejercicio 5.3: Log App, the Service Mesh Edition

## Overview

This exercise demonstrates Istio Ambient Mode with a practical example: a log application that uses a greeter microservice. The key learning objective is understanding how to integrate your own applications with Istio's service mesh and implement canary deployments using HTTPRoute traffic splitting.

**Learning Goals:**
- Deploy applications to a service mesh namespace
- Use Istio's Gateway API (HTTPRoute) for traffic routing
- Implement canary deployments with traffic splitting (75% v1 / 25% v2)
- Visualize service mesh traffic patterns in Kiali
- Understand inter-service communication in a mesh

## Architecture

```
┌────────────────────────────────────────────────────────┐
│                   Kubernetes Cluster                     │
├────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─────────────────────────────────────────────┐       │
│  │  Istio Ambient Mode (default namespace)     │       │
│  ├─────────────────────────────────────────────┤       │
│  │                                              │       │
│  │  ┌──────────────┐         ┌──────────────┐ │       │
│  │  │   Log App    │         │  Greeter     │ │       │
│  │  │  Deployment  │         │  (Traffic)   │ │       │
│  │  └──────────────┘         └──────────────┘ │       │
│  │         │                       │           │       │
│  │    ┌────▼────┐           ┌─────▼──┬─────┐  │       │
│  │    │ log-svc │           │  v1    │ v2  │  │       │
│  │    └────┬────┘           └────┬───┴──┬──┘  │       │
│  │         │                     │      │     │       │
│  │    ┌────▼──────────┐      ┌───▼──────▼─┐  │       │
│  │    │ log-gateway   │      │ greeter-svc│  │       │
│  │    │ + HTTPRoute   │      │  HTTPRoute │  │       │
│  │    └────┬──────────┘      │ (75%/25%)  │  │       │
│  │         │                 └────────────┘  │       │
│  └─────────┼─────────────────────────────────┘       │
│            │                                          │
│  ┌─────────▼────────────────────────────────────┐    │
│  │  Istio Ambient Mode Data Plane               │    │
│  ├──────────────────────────────────────────────┤    │
│  │  • ztunnel: L4 proxy (mTLS, authorization)   │    │
│  │  • Service routing and load balancing        │    │
│  │  • Transparent traffic interception          │    │
│  └──────────────────────────────────────────────┘    │
│                                                       │
└───────────────────────────────────────────────────────┘

Traffic Flow:
1. User requests log app via Gateway
2. Log app pod makes HTTP request to greeter-svc
3. ztunnel intercepts and routes request
4. Traffic split: 75% → greeter-svc-v1, 25% → greeter-svc-v2
5. Greeter responds with greeting (English v1 or Spanish v2)
6. Log app displays greeting in its output
7. Kiali visualizes all traffic relationships
```

## Components

### Log Application
- **Purpose:** Main application that displays logs and greetings
- **Technology:** Node.js + Express.js
- **Functionality:**
  - Serves web UI showing logs and current greeting
  - Calls greeter service to fetch greetings
  - Logs all retrieved greetings with timestamp
  - Auto-refreshing logs display
  
**Endpoints:**
- `GET /` - Main UI (HTML with logs and greeting)
- `GET /logs` - Get logs as JSON
- `GET /health` - Health check

### Greeter Service
- **Purpose:** Microservice that provides greetings in different languages
- **Versions:**
  - **v1:** English greetings (Hello, World! | Hi there! | Welcome! | Good to see you!)
  - **v2:** Spanish greetings (¡Hola, Mundo! | ¡Hola! | ¡Bienvenido! | ¡Qué gusto verte!)
- **Technology:** Node.js + Express.js

**Endpoints:**
- `GET /greeting` - Returns random greeting with version info
- `GET /health` - Health check
- `GET /version` - Returns service version

### Istio Components
- **Gateway (log-gateway):** Kubernetes Gateway that accepts HTTP traffic
- **HTTPRoute (log):** Routes all traffic from gateway to log service
- **HTTPRoute (greeter):** Splits traffic to greeter services (75% v1, 25% v2)
- **Services:**
  - `log-svc` - ClusterIP for log app
  - `greeter-svc` - Main greeter service (acts as load balancer target)
  - `greeter-svc-v1` - v1 specific service
  - `greeter-svc-v2` - v2 specific service

## Deployment

### Prerequisites
1. Kubernetes cluster running (k3d or other)
2. Istio Ambient Mode installed (from ejercicio5_2)
3. kubectl configured and working
4. Default namespace with Ambient Mode enabled

### Installation

**Option 1: Automated Deployment**
```bash
chmod +x deploy.sh
./deploy.sh
```

**Option 2: Manual Deployment**
```bash
# Deploy greeter service (v1 and v2)
kubectl apply -f manifests/greeter.yaml

# Deploy greeter HTTPRoute (traffic splitting)
kubectl apply -f manifests/greeter-httproute.yaml

# Deploy log app
kubectl apply -f manifests/log-app.yaml

# Deploy log gateway
kubectl apply -f manifests/gateway.yaml

# Wait for all deployments
kubectl rollout status deployment/greeter-dep-v1
kubectl rollout status deployment/greeter-dep-v2
kubectl rollout status deployment/log-app-dep
```

### Verify Deployment
```bash
# Check all pods are running
kubectl get pods -l "app in (greeter,log)"

# Check all services
kubectl get svc -l "app in (greeter,log)"

# Check gateway and routes
kubectl get gateway,httproute
```

## Usage

### Access Log App UI
```bash
# Port-forward to log service
kubectl port-forward svc/log-svc 8080:80

# Open in browser
open http://localhost:8080
```

The UI shows:
- Current greeting from greeter service
- Auto-refreshing log entries
- Timestamp of each greeting retrieval

### Monitor Traffic in Kiali

```bash
# Port-forward to Kiali
kubectl port-forward -n istio-system svc/kiali 20000:20000

# Open in browser
open http://localhost:20000

# Login
# Username: admin
# Password: admin
```

Navigate to:
1. **Graph** view
2. Select **default** namespace
3. Display options: Show Traffic Animation
4. Observe traffic split between greeter-v1 and greeter-v2

### Testing Traffic Distribution

```bash
# Get log app pod
LOG_POD=$(kubectl get pod -l app=log -o jsonpath='{.items[0].metadata.name}')

# Generate 20 requests to greeter service
for i in {1..20}; do
  kubectl exec $LOG_POD -- curl -s http://greeter-svc/greeting
  echo ""
done

# You should see approximately:
# - 75% English greetings (v1)
# - 25% Spanish greetings (v2)
```

### Check Service Versions

```bash
# Test v1 directly
kubectl run -it --rm debug --image=curlimages/curl --restart=Never -- \
  curl http://greeter-svc-v1/greeting

# Test v2 directly
kubectl run -it --rm debug --image=curlimages/curl --restart=Never -- \
  curl http://greeter-svc-v2/greeting

# Test load-balanced service
kubectl run -it --rm debug --image=curlimages/curl --restart=Never -- \
  curl http://greeter-svc/greeting
```

### View Logs

```bash
# Get log app pod
LOG_POD=$(kubectl get pod -l app=log -o jsonpath='{.items[0].metadata.name}')

# View logs
kubectl logs $LOG_POD -f

# Or check the log file directly
kubectl exec $LOG_POD -- tail -20 /tmp/logs/log.txt
```

## Manifest Files Explained

### greeter.yaml
- **greeter-dep-v1:** Deployment with 1 replica, VERSION=v1 environment variable
- **greeter-dep-v2:** Deployment with 1 replica, VERSION=v2 environment variable
- **greeter-code:** ConfigMap containing greeter application code
- **greeter-svc-v1:** ClusterIP service targeting v1 pods (label: version=v1)
- **greeter-svc-v2:** ClusterIP service targeting v2 pods (label: version=v2)
- **greeter-svc:** ClusterIP service targeting all greeter pods (label: app=greeter)

### log-app.yaml
- **log-app-dep:** Single replica deployment running log application
- **log-app-code:** ConfigMap with app code and dependencies
- **log-svc:** ClusterIP service exposing log app on port 80

### gateway.yaml
- **log-gateway:** Kubernetes Gateway accepting HTTP on port 80
- **log (HTTPRoute):** Routes all traffic from gateway to log-svc

### greeter-httproute.yaml
- **greeter (HTTPRoute):** Traffic splitting policy:
  - 75% of requests → greeter-svc-v1
  - 25% of requests → greeter-svc-v2

## Traffic Splitting Mechanism

### How HTTPRoute Works

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: greeter
spec:
  parentRefs:
  - name: greeter-svc
  rules:
  - backendRefs:
    - name: greeter-svc-v1
      weight: 75        # 75% of traffic
    - name: greeter-svc-v2
      weight: 25        # 25% of traffic
```

The weights are **normalized** - in this case, 75 + 25 = 100, so:
- Each request has 75/100 probability of going to v1
- Each request has 25/100 probability of going to v2

### Observed Behavior

With sufficient traffic (100+ requests), you should observe:
- ~75 requests go to greeter v1 (English greetings)
- ~25 requests go to greeter v2 (Spanish greetings)
- Small statistical variation is normal

### In Kiali

The traffic visualization shows:
- Triangle node for greeter-svc (aggregate)
- Two service boxes for greeter-svc-v1 and greeter-svc-v2
- Arrows showing traffic flow with percentages
- Animation of request flow

## Key Concepts

### Canary Deployment
A deployment strategy where a new version (canary) receives a small percentage of traffic while the stable version (v1) receives most traffic. Useful for:
- Testing new versions in production
- Detecting issues before full rollout
- Gradually increasing traffic to new version
- Quick rollback by adjusting weights

### Service Mesh Benefits Here
1. **Traffic Management:** HTTPRoute enables sophisticated routing without app-level code
2. **Observability:** Kiali visualizes all service interactions automatically
3. **Security:** Automatic mTLS encryption between services (transparent)
4. **No Sidecar Overhead:** Ambient mode uses shared ztunnel per node (50-60% less resources)

### Gateway API vs VirtualService
This exercise uses **Kubernetes Gateway API** (HTTPRoute) because:
- Standard Kubernetes resource (CRD-based but standardized)
- Simpler syntax for basic traffic management
- Sufficient for 75/25 canary split
- Better alignment with Kubernetes ecosystem

**When to use VirtualService instead:**
- Need advanced features (fault injection, retries)
- Using Argo Rollouts
- Requires sub-match routing rules

## Cleanup

### Remove All Resources
```bash
chmod +x cleanup.sh
./cleanup.sh
```

### Manual Cleanup
```bash
# Remove all Exercise 5.3 resources
kubectl delete httproute log greeter -n default --ignore-not-found
kubectl delete gateway log-gateway -n default --ignore-not-found
kubectl delete deployment greeter-dep-v1 greeter-dep-v2 log-app-dep -n default --ignore-not-found
kubectl delete service greeter-svc greeter-svc-v1 greeter-svc-v2 log-svc -n default --ignore-not-found
kubectl delete configmap greeter-code log-app-code -n default --ignore-not-found
```

## Troubleshooting

### Pods not starting
```bash
kubectl describe pod <pod-name>
kubectl logs <pod-name>

# Check if ambient mode is enabled
kubectl get ns default -o jsonpath='{.metadata.labels.istio\.io/dataplane-mode}'
# Should output: ambient
```

### Greeter service not responding
```bash
# Check if greeter pods are ready
kubectl get pods -l app=greeter

# Test directly inside a pod
kubectl run -it --rm debug --image=curlimages/curl --restart=Never -- \
  curl http://greeter-svc/greeting

# Check iptables and connectivity
kubectl get endpoints greeter-svc
```

### Traffic not splitting correctly
```bash
# Verify HTTPRoute is applied
kubectl get httproute greeter -o yaml

# Generate more traffic to get statistical average
# Run 200+ requests to see proper 75/25 split
for i in {1..100}; do
  kubectl exec <log-pod> -- curl -s http://greeter-svc/greeting > /dev/null
done
```

### Can't access log app UI
```bash
# Verify port-forward is working
kubectl port-forward svc/log-svc 8080:80

# Try accessing the service from inside cluster
kubectl run -it --rm debug --image=curlimages/curl --restart=Never -- \
  curl http://log-svc/

# Check if gateway is correctly configured
kubectl get gateway log-gateway -o yaml
```

## Advanced Topics

### Modifying Traffic Weights

To change the traffic split (e.g., 50/50 for full rollout):

```bash
kubectl patch httproute greeter --type merge -p '
{
  "spec": {
    "rules": [{
      "backendRefs": [
        {"name": "greeter-svc-v1", "port": 80, "weight": 50},
        {"name": "greeter-svc-v2", "port": 80, "weight": 50}
      ]
    }]
  }
}
'
```

Or edit directly:
```bash
kubectl edit httproute greeter
```

### Adding More Versions

To add greeter v3:

1. Create deployment with VERSION=v3 environment variable
2. Create greeter-svc-v3 service
3. Update HTTPRoute weights (e.g., 50/30/20)

### Using VirtualService Instead

If you need fault injection or advanced features:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: greeter
spec:
  hosts:
  - greeter-svc
  http:
  - fault:
      delay:
        percentage:
          value: 10
        fixedDelay: 1s
    route:
    - destination:
        host: greeter-svc-v1
      weight: 75
    - destination:
        host: greeter-svc-v2
      weight: 25
```

### Circuit Breaking

Add to greeter.yaml:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: greeter
spec:
  host: greeter-svc
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        http1MaxPendingRequests: 50
        maxRequestsPerConnection: 2
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 30s
```

## Files Structure

```
ejercicio5_3/
├── README.md                      # This file
├── deploy.sh                       # Automated deployment script
├── cleanup.sh                      # Cleanup script
├── manifests/
│   ├── greeter.yaml               # Greeter v1/v2 deployments & services
│   ├── greeter-httproute.yaml     # Greeter traffic splitting
│   ├── log-app.yaml               # Log app deployment & service
│   └── gateway.yaml               # Log gateway and HTTPRoute
├── log-app/
│   ├── app.js                     # Log app source code
│   └── package.json               # Dependencies
└── greeter/
    ├── app.js                     # Greeter app source code
    └── package.json               # Dependencies
```

## Learning Path

### Series 5: Extending and Automating Kubernetes

**5.1 - DIY CRD & Custom Controller**
- How to extend Kubernetes with custom resources
- Build a controller that reconciles desired state
- Pattern: Watch → Compare → Act

**5.2 - Getting Started with Istio Ambient Mode**
- Service mesh architecture
- Ambient mode advantages (no sidecars)
- Automatic mTLS and observability

**5.3 - Log App, the Service Mesh Edition** ← You are here
- Integrate real applications with service mesh
- Canary deployments via traffic splitting
- Visualize service communication

**Progression:**
- 5.1: Learn to extend Kubernetes
- 5.2: Learn service mesh concepts
- 5.3: Combine both: apps in service mesh with intelligent routing

## Key Takeaways

1. **Service Mesh is Infrastructure, Not Code**
   - Routing logic moves from app code to infrastructure
   - Applications stay simple; mesh handles complexity

2. **Canary Deployments are Powerful**
   - Low-risk way to roll out new versions
   - Istio makes it effortless with traffic splitting
   - Easy to adjust percentages or rollback

3. **Observability is Automatic**
   - Kiali visualizes traffic without instrumentation
   - No code changes needed to see service interactions
   - Helps debug and understand system behavior

4. **Namespace-level Policies**
   - Label namespace with `istio.io/dataplane-mode=ambient`
   - All pods in namespace get mesh benefits
   - Opt-in per namespace, no sidecar injection needed

5. **Gateway API is Evolving**
   - Kubernetes-standard traffic management
   - Use HTTPRoute for basic routing
   - Fall back to VirtualService for advanced features

## References

- [Kubernetes Gateway API](https://gateway-api.sigs.k8s.io/)
- [Istio Traffic Management](https://istio.io/latest/docs/tasks/traffic-management/)
- [Istio HTTPRoute Documentation](https://istio.io/latest/docs/reference/config/networking/gateway-api-support/)
- [Kiali Observability](https://kiali.io/)
- [Canary Deployments Pattern](https://martinfowler.com/bliki/CanaryRelease.html)

## Conclusion

This exercise demonstrates how modern service meshes like Istio automate operational concerns that previously required manual coding. By using HTTPRoute traffic splitting, we implement canary deployments without any application code changes. The service mesh takes care of routing, security (mTLS), and observability transparently.

The progression from Exercise 5.1 (extending Kubernetes with CRDs) to 5.2 (understanding service meshes) to 5.3 (applying both in real scenarios) shows the complete picture of how to build modern, enterprise-grade Kubernetes systems.
