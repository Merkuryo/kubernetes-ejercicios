# Exercise 3.4: Rewritten Routing

## Overview

This exercise builds upon Exercise 3.3 by introducing **URL rewriting** via the Gateway API. Instead of forcing applications to respond at cluster-level paths like `/pingpong`, the HTTPRoute can rewrite incoming paths to `/` before sending them to the backend service. This allows applications to be decoupled from the cluster-level routing structure.

## Key Concept: Path Rewriting

### Problem
- Exercise 3.3 required the ping-pong app to handle `/pingpong` paths
- Applications should ideally respond on root `/` and not care about cluster routing
- We want separation of concerns: cluster routing ≠ application routing

### Solution: URLRewrite with ReplacePrefixMatch

The Gateway API's `URLRewrite` filter allows transforming request paths before they reach the backend:

**Before rewriting:**
```
GET /pingpong/health
```

**In the HTTPRoute with ReplacePrefixMatch:**
```
/pingpong → / (prefix rewritten)
```

**Sent to backend as:**
```
GET /health
```

## Architecture

```
External Request
       ↓
   Gateway (35.241.39.147:80)
       ↓
   HTTPRoute Rules:
   ┌────────────────────────────────┐
   │ /pingpong requests             │
   │ ↓ URLRewrite filter            │
   │ ReplacePrefixMatch: /pingpong → /
   │ ↓ Transformed to /             │
   │ → pingpong-svc (responds on /) │
   └────────────────────────────────┘
```

## Implementation: URLRewrite Filter

### HTTPRoute with ReplacePrefixMatch

```yaml
apiVersion: gateway.networking.k8s.io/v1beta1
kind: HTTPRoute
metadata:
  name: my-route
spec:
  parentRefs:
  - name: my-gateway
  rules:
  - matches:
    - path:
        type: PathPrefix
        value: /pingpong
    filters:                           # ← Add filters section
    - type: URLRewrite
      urlRewrite:
        path:
          type: ReplacePrefixMatch     # ← Rewrite prefix
          replacePrefixMatch: /        # ← Replace with /
    backendRefs:
    - name: pingpong-svc
      port: 80
```

### Filter Details

**filters**: Array of HTTP filters applied to matching requests
**type: URLRewrite**: Enables URL path transformation
**urlRewrite.path.type**: Specifies rewrite strategy
  - `ReplacePrefixMatch`: Replace the matched path prefix
  - `ReplaceFullPath`: Replace entire path (NOT supported in GKE yet)

**replacePrefixMatch**: The replacement value (in this case, just `/`)

## Why ReplacePrefixMatch and not ReplaceFullPath?

From the Kubernetes Gateway API:
- **ReplacePrefixMatch**: Replaces only the matched prefix part of the path
  - Supported in GKE ✅
  - Recommended for production use

- **ReplaceFullPath**: Replaces the entire path
  - More powerful but still experimental
  - NOT supported in GKE as of Nov 2025 ❌
  - Use ReplacePrefixMatch as workaround

## Changes from Exercise 3.3 to 3.4

### HTTPRoute Changes

**Exercise 3.3** (no rewriting):
```yaml
- matches:
  - path:
      type: PathPrefix
      value: /pingpong
  backendRefs:
  - name: pingpong-svc
    port: 80
```

**Exercise 3.4** (with rewriting):
```yaml
- matches:
  - path:
      type: PathPrefix
      value: /pingpong
  filters:
  - type: URLRewrite
    urlRewrite:
      path:
        type: ReplacePrefixMatch
        replacePrefixMatch: /
  backendRefs:
  - name: pingpong-svc
    port: 80
```

### Application Changes

**No changes needed!** The ping-pong application doesn't need to be modified. The rewriting happens at the Gateway level:
- External: requests arrive at `/pingpong`
- Rewritten to: `/` before backend receives it
- App responds on: `/` (which it already does)

## Deployment

```bash
# Apply the updated manifests
kubectl apply -f /path/to/ejercicio3_4/manifests/

# Verify HTTPRoute has the filter
kubectl describe httproute my-route

# Check Gateway is still active
kubectl get gateway my-gateway
```

## Testing

```bash
# Verify the path rewriting works
curl -v http://35.241.39.147/pingpong

# Should succeed and respond with ping-pong content
# Because /pingpong was rewritten to / for the backend

# Also test /logoutput (no rewriting needed)
curl http://35.241.39.147/logoutput

# And the default route
curl http://35.241.39.147/
```

## Manifest Files

### gateway.yaml
- Identical to Exercise 3.3
- GatewayClass: `gke-l7-global-external-managed`
- Listeners: HTTP on port 80

### logoutput.yaml
- Unchanged from Exercise 3.3
- Service: ClusterIP type
- Deployment: nginx:alpine

### pingpong.yaml
- Unchanged from Exercise 3.3
- Service: ClusterIP type
- Deployment: nginx:alpine (2 replicas)

### httproute.yaml (NEW: with URLRewrite)
- Route `/logoutput` → logoutput-svc (no filter)
- Route `/pingpong` → pingpong-svc (with ReplacePrefixMatch filter)
- Route `/` → pingpong-svc (default)

## Advanced URLRewrite Patterns

### Multiple Path Segments
```yaml
- matches:
  - path:
      type: PathPrefix
      value: /api/v1/pingpong
filters:
- type: URLRewrite
  urlRewrite:
    path:
      type: ReplacePrefixMatch
      replacePrefixMatch: /
# /api/v1/pingpong/status → /status
```

### Combined with other Filters
```yaml
filters:
- type: RequestHeaderModifier    # Modify headers
  requestHeaderModifier:
    set:
    - name: X-Gateway-Path
      value: "/pingpong"
- type: URLRewrite                # Rewrite path
  urlRewrite:
    path:
      type: ReplacePrefixMatch
      replacePrefixMatch: /
```

## Troubleshooting

### HTTPRoute shows errors
```bash
kubectl describe httproute my-route
# Check for:
# - ResolvedRefs: True
# - Accepted: True
```

### URLRewrite not working
- Verify GatewayClass supports URLRewrite filter
- Check filter syntax carefully (indentation matters in YAML)
- Ensure path types match (PathPrefix with ReplacePrefixMatch)

### Backend returns 404
- Verify backend app responds on `/` not on the full path
- Check pod logs: `kubectl logs POD_NAME`
- Test directly: `kubectl port-forward POD_NAME 8080:80`

## Key Learning Points

✅ URL rewriting enables application agnosticism from cluster routing
✅ Gateway API filters provide powerful traffic transformation
✅ ReplacePrefixMatch is the supported pattern in GKE
✅ Filters are applied in order before requests reach backends
✅ Decouples application routing from infrastructure routing

## Comparison: Gateway API vs Ingress

| Feature | Ingress | Gateway API |
|---------|---------|------------|
| Path rewriting | Limited/complex | Native filters ✅ |
| URL transformation | Not standard | URLRewrite filter ✅ |
| Header modification | Limited | RequestHeaderModifier ✅ |
| Traffic splitting | No | Yes (BackendWeights) |
| Flexibility | Vendor-specific | Standardized ✅ |

## References

- [Kubernetes Gateway API - URLRewrite](https://gateway-api.sigs.k8s.io/references/spec/#gateway.networking.k8s.io/v1.URLRewriteFilter)
- [GCP Gateway API Filters](https://cloud.google.com/kubernetes-engine/docs/concepts/gatewayapi#filters)
- [HTTPRoute Filters](https://gateway-api.sigs.k8s.io/references/spec/#gateway.networking.k8s.io/v1.HTTPRouteFilter)

## Learning Outcomes

✅ Understand URL rewriting in Gateway API
✅ Implement ReplacePrefixMatch filter in HTTPRoute
✅ Decouple application routing from cluster-level paths
✅ Deploy and test path rewriting on GKE
✅ Troubleshoot and verify filter behavior
