# Exercise 2.10: Monitoring with Prometheus and Grafana

## Objectives

In this exercise, we have implemented monitoring for our Kubernetes cluster and applications using:

1. **Prometheus**: Collect metrics from the cluster and nodes
2. **Grafana**: Visualize the metrics and logs
3. **Loki**: Aggregate logs from all containers
4. **Promtail**: Automatically ship logs from containers to Loki

Additionally, we added request logging to the TODO backend to track all incoming requests and validate that TODOs don't exceed 140 characters.

## Setup

### 1. Install Helm

```bash
sudo snap install helm --classic
```

### 2. Add Helm Repositories

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo add stable https://charts.helm.sh/stable
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update
```

### 3. Install Prometheus Stack

```bash
kubectl create namespace prometheus
helm install prometheus-stack prometheus-community/kube-prometheus-stack --namespace prometheus
```

This installs:
- Prometheus: Metrics collection and storage
- Grafana: Visualization dashboard
- AlertManager: Alert management
- Node Exporter: Node-level metrics
- Kube State Metrics: Kubernetes object metrics
- Prometheus Operator: Kubernetes custom resources for Prometheus

### 4. Install Loki Stack

```bash
kubectl create namespace loki-stack
helm upgrade --install loki --namespace=loki-stack grafana/loki-stack --set loki.image.tag=2.9.3
```

This installs:
- Loki: Log aggregation system
- Promtail: Log shipper (runs as DaemonSet on every node)

## Backend Modifications

### Request Logging Middleware

Modified `ejercicio2_2/todo-backend/src/index.js` to add a request logging middleware that logs:
- Timestamp
- HTTP method
- Route/path
- Response status code
- Request body (payload)
- Duration in milliseconds

```javascript
// Request logging middleware
app.use((req, res, next) => {
  const startTime = Date.now();
  const originalJson = res.json;
  
  res.json = function(data) {
    const duration = Date.now() - startTime;
    const timestamp = new Date().toISOString();
    const method = req.method;
    const path = req.path;
    const status = res.statusCode;
    const body = JSON.stringify(req.body);
    
    console.log(`[${timestamp}] ${method} ${path} | Status: ${status} | Body: ${body} | Duration: ${duration}ms`);
    
    return originalJson.call(this, data);
  };
  
  next();
});
```

### 140-Character Validation

The backend already had validation to reject TODOs exceeding 140 characters:

```javascript
if (content.length > 140) {
  return res.status(400).json({ error: 'Content must not exceed 140 characters' });
}
```

## Testing

### Valid TODO (40 chars)

```bash
curl -X POST http://localhost:3002/todos \
  -H "Content-Type: application/json" \
  -d '{"content":"Learn Prometheus and Grafana"}'
```

Response (201):
```json
{"id":50,"content":"Learn Prometheus and Grafana","created":"2025-10-19T22:03:09.612Z"}
```

Backend log:
```
[2025-10-19T22:03:10.379Z] POST /todos | Status: 201 | Body: {"content":"Learn Prometheus and Grafana"} | Duration: 801ms
```

### Invalid TODO (exceeds 140 chars)

```bash
CONTENT=$(python3 -c "print('This is a very long todo that exceeds the 140 character limit. ' * 3)")
curl -X POST http://localhost:3002/todos \
  -H "Content-Type: application/json" \
  -d "{\"content\":\"$CONTENT\"}"
```

Response (400):
```json
{"error":"Content must not exceed 140 characters"}
```

Backend log:
```
[2025-10-19T22:03:16.549Z] POST /todos | Status: 400 | Body: {"content":"This is a very long todo that exceeds the 140 character limit. This is a very long todo that exceeds the 140 character limit. This is a very long todo that exceeds the 140 character limit. "} | Duration: 1ms
```

## Accessing Grafana

### Get Admin Password

```bash
kubectl -n prometheus get secrets prometheus-stack-grafana -o jsonpath="{.data.admin-password}" | base64 -d
# Output: prom-operator
```

### Port Forward to Grafana

```bash
kubectl -n prometheus port-forward svc/prometheus-stack-grafana 3000:80
```

Access: http://localhost:3000 with credentials `admin / prom-operator`

### Add Loki as Data Source

1. Open Grafana at http://localhost:3000
2. Click hamburger menu (top left) → Connections → Data Sources
3. Click "Add new data source"
4. Select "Loki"
5. Set URL to: `http://loki.loki-stack:3100`
6. Click "Save & Test"

### View Logs

1. In Grafana, click hamburger menu → Explore
2. Select "Loki" as the data source
3. Use query like `{namespace="project"}` to see logs from the project namespace
4. Filter by pod name: `{pod=~"todo-backend.*"}`
5. Search for specific log patterns: `{pod=~"todo-backend.*"} | "POST /todos"`

## Log Flow

```
Application (stdout) 
    → Promtail (DaemonSet)
    → Loki (StatefulSet)
    → Grafana (Visualize)
```

## Kubernetes Resources Created

### Namespaces
- `prometheus`: Monitoring stack
- `loki-stack`: Log aggregation

### Prometheus Namespace
- StatefulSet: prometheus, alertmanager
- Deployment: grafana, operator, kube-state-metrics
- DaemonSet: node-exporter
- Services, ConfigMaps, ServiceAccounts

### Loki Stack Namespace
- StatefulSet: loki
- DaemonSet: loki-promtail
- Services (loki, loki-headless, loki-memberlist)

## Docker Image Update

Rebuilt `todo-backend-app` image with the new logging middleware:

```bash
cd /home/mercuryo/Kubernetes/ejercicio2_2/todo-backend
docker build -t todo-backend-app:latest .
docker save todo-backend-app:latest -o todo-backend-app.tar
k3d image import todo-backend-app.tar -c k3s-default
```

## Verification

✅ Prometheus stack deployed and running (9+ pods)
✅ Loki and Promtail deployed and running (4 pods)
✅ Request logging middleware working (visible in kubectl logs)
✅ Logs being shipped to Loki (verified with API queries)
✅ 140-character validation working (400 responses for long TODOs)
✅ Grafana can be configured to view Loki logs

## Notes

- Grafana has some issues with its readiness probe, but it's still functional
- Logs are automatically captured by Promtail without additional configuration
- The logging middleware intercepts all responses and logs them with timestamps and durations
- All logs are available in Loki with full namespace/pod/container labels for filtering
