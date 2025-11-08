# Exercise 3.3: Gateway API

## Overview

This exercise replaces the Ingress controller with the modern **Gateway API**, a next-generation solution for external traffic routing in Kubernetes. The Gateway API provides a more flexible and powerful approach to managing traffic compared to traditional Ingress resources.

## Key Differences: Ingress vs Gateway API

### Ingress (Exercise 3.2)
- Single unified resource handling both infrastructure and routing
- Limited routing capabilities
- Less flexible for complex scenarios
- Tightly coupled to specific implementations

### Gateway API (Exercise 3.3)
- **Separation of Concerns**: Three key resources
  - **GatewayClass**: Defines the load balancer type (provided by infrastructure vendors like GCP)
  - **Gateway**: Specifies where/how the load balancer listens (IP, port, protocol)
  - **HTTPRoute**: Defines routing rules (path-based, header-based, etc.)
- More flexible and expressive routing
- Better suited for complex microservices architectures
- Growing standard across multiple Kubernetes distributions

## Architecture

```
External Traffic (HTTP)
         ↓
    Gateway (35.241.39.147:80)
         ↓
   ┌─────┴─────┐
   ↓           ↓
HTTPRoute Rules:
   /logoutput → logoutput-svc (ClusterIP:80)
   /pingpong  → pingpong-svc (ClusterIP:80)
   /          → pingpong-svc (default)
```

## Setup Steps

### 1. Enable Gateway API on GKE Cluster

```bash
gcloud container clusters update dwk-cluster \
  --location=europe-north1-b \
  --gateway-api=standard
```

This provisions the necessary GCP infrastructure to support the Gateway API.

### 2. Service Type Change: NodePort → ClusterIP

Unlike Ingress which requires NodePort services, **Gateway API manages external traffic entirely**, so services use:

**Before (Ingress):**
```yaml
kind: Service
spec:
  type: NodePort
```

**After (Gateway API):**
```yaml
kind: Service
spec:
  type: ClusterIP
```

The Gateway API handles load balancing at the edge; services only need internal cluster communication.

### 3. Define GatewayClass

The `GatewayClass` specifies which load balancer implementation to use. GCP provides several options; we use `gke-l7-global-external-managed` (global L7 load balancer):

```yaml
apiVersion: gateway.networking.k8s.io/v1beta1
kind: GatewayClass
metadata:
  name: gke-l7-global-external-managed
```

This is typically pre-created by GCP and doesn't need to be defined manually.

### 4. Create Gateway Resource

The Gateway defines **where** and **how** the load balancer listens:

```yaml
apiVersion: gateway.networking.k8s.io/v1beta1
kind: Gateway
metadata:
  name: my-gateway
spec:
  gatewayClassName: gke-l7-global-external-managed
  listeners:
  - name: http
    protocol: HTTP
    port: 80
    allowedRoutes:
      kinds:
      - kind: HTTPRoute
```

This tells GCP to:
- Create an external load balancer
- Listen on HTTP port 80
- Accept HTTPRoute resources as routing rules

### 5. Create HTTPRoute Resources

HTTPRoute resources define the **routing rules**:

```yaml
apiVersion: gateway.networking.k8s.io/v1beta1
kind: HTTPRoute
metadata:
  name: my-route
spec:
  parentRefs:
  - name: my-gateway          # Links to the Gateway
  rules:
  - matches:
    - path:
        type: PathPrefix
        value: /logoutput      # Match /logoutput prefix
    backendRefs:
    - name: logoutput-svc      # Route to this service
      port: 80
  - matches:
    - path:
        type: PathPrefix
        value: /pingpong
    backendRefs:
    - name: pingpong-svc
      port: 80
  - matches:
    - path:
        type: PathPrefix
        value: /                # Default route
    backendRefs:
    - name: pingpong-svc
      port: 80
```

## Deployment

```bash
# Apply all manifests
kubectl apply -f /path/to/ejercicio3_3/manifests/

# Monitor Gateway provisioning
kubectl get gateway my-gateway -w

# Once ADDRESS is assigned, the gateway is ready
kubectl get gateway my-gateway
# NAME         CLASS                            ADDRESS         PROGRAMMED
# my-gateway   gke-l7-global-external-managed   35.241.39.147   True
```

## Testing

Once the Gateway obtains an external IP address:

```bash
# Test /logoutput path
curl http://35.241.39.147/logoutput

# Test /pingpong path
curl http://35.241.39.147/pingpong

# Test default route (/)
curl http://35.241.39.147/
```

## GCP Infrastructure

The Gateway API creates actual GCP infrastructure:

```bash
# View URL maps
gcloud compute url-maps list --project=dwk-gke-477617

# View global forwarding rules (contains external IP)
gcloud compute forwarding-rules list --global --project=dwk-gke-477617

# View backend services
gcloud compute backend-services list --global --project=dwk-gke-477617
```

## Manifest Files

### logoutput.yaml
- **Service**: ClusterIP type (port 80 → 3000)
- **Deployment**: nginx:alpine (1 replica, 32Mi requests, 128Mi limits)
- **Health Check**: HTTP GET / with 10s initial delay

### pingpong.yaml
- **Service**: ClusterIP type (port 80 → 3000)
- **Deployment**: nginx:alpine (2 replicas, 32Mi requests, 128Mi limits)
- **Health Check**: HTTP GET / with 10s initial delay

### gateway.yaml
- **GatewayClass**: gke-l7-global-external-managed (GCP L7 global)
- **Listeners**: HTTP on port 80
- **AllowedRoutes**: HTTPRoute resources

### httproute.yaml
- **Rules**: Three path-based rules
  - /logoutput → logoutput-svc
  - /pingpong → pingpong-svc
  - / (default) → pingpong-svc

## Important Notes

1. **IP Assignment Delay**: The external IP may take 5-10 minutes to be assigned and fully programmed.

2. **Health Checks**: Services must respond to health checks at their configured endpoint (typically `/`).

3. **No NodePort Required**: Unlike Ingress, Gateway API services don't need NodePort type. They use ClusterIP entirely.

4. **Global vs Regional**: The `gke-l7-global-external-managed` class creates a global load balancer with global IP. Regional options are also available.

5. **Load Balancer Pricing**: GCP charges for load balancers, so clean up unused Gateways in production.

## Monitoring Gateway Status

```bash
# Watch Gateway creation and IP assignment
kubectl describe gateway my-gateway

# Check HTTPRoute binding
kubectl describe httproute my-route

# View all Gateway API resources
kubectl get gateway,httproute

# Check load balancer configuration in GCP
gcloud compute url-maps describe gkegw1-7wnv-default-my-gateway-...
```

## Troubleshooting

### Gateway stuck without IP
- Check if enough resources are available on nodes
- Verify GatewayClass is valid: `kubectl get gatewayclass`
- Check events: `kubectl describe gateway my-gateway`

### "No healthy upstream" error
- Verify pod health: `kubectl get pods`
- Check service endpoints: `kubectl get endpoints`
- Verify health check path: `curl http://POD-IP:3000/`

### Pods in Pending state
- Common on e2-micro nodes with limited memory
- Check events: `kubectl describe pod POD-NAME`
- Scale back resource requests if needed

## References

- [Kubernetes Gateway API Documentation](https://gateway-api.sigs.k8s.io/)
- [GCP Gateway API Support](https://cloud.google.com/kubernetes-engine/docs/concepts/gatewayapi)
- [HTTPRoute API](https://gateway-api.sigs.k8s.io/reference/spec/#gateway.networking.k8s.io/v1.HTTPRoute)
- [GCP Load Balancers](https://cloud.google.com/load-balancing)

## Learning Outcomes

✅ Understand Gateway API architecture (GatewayClass, Gateway, HTTPRoute)
✅ Replace Ingress with Gateway API in GKE
✅ Configure ClusterIP services for Gateway API
✅ Set up path-based routing with HTTPRoute
✅ Monitor and troubleshoot Gateway provisioning
✅ Understand GCP load balancer infrastructure
