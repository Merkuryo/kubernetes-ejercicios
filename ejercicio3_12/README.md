# Ejercicio 3.12 - GKE Monitoring and Logging

## Objetivo

Configurar y utilizar los sistemas de monitoreo y logging integrados en Google Kubernetes Engine (GKE) para:

- ✅ Capturar logs de aplicaciones
- ✅ Monitorear recursos del cluster
- ✅ Visualizar métricas en tiempo real
- ✅ Ejecutar queries sobre logs
- ✅ Verificar logs cuando se crean nuevos TODOs

## Componentes de GKE Monitoring

### 1. Cloud Logging (Stackdriver Logging)

**Descripción**: Sistema centralizado de logging para toda la infraestructura de GKE.

**Incluye automáticamente:**
- ✅ Logs del sistema Kubernetes (kubelet, container runtime)
- ✅ Logs de pods (stdout/stderr)
- ✅ Eventos de Kubernetes (Pod created, Node joined, etc.)
- ✅ Audit logs (quién hizo qué en el cluster)

**Estado en nuestro cluster:**
```bash
# Verificar que está habilitado
gcloud container clusters describe dwk-cluster \
  --zone=europe-north1-b \
  --project=dwk-gke-477617 \
  --format='value(loggingService)'

# OUTPUT: logging.googleapis.com/kubernetes ✅
```

### 2. Cloud Monitoring (Stackdriver Monitoring)

**Descripción**: Sistema de métricas y alertas para monitoreo en tiempo real.

**Incluye automáticamente:**
- ✅ Métricas del cluster (CPU, memoria, networking)
- ✅ Métricas de pods
- ✅ Métricas de nodos
- ✅ Dashboards preconfigurados

**Estado en nuestro cluster:**
```bash
# Verificar que está habilitado
gcloud container clusters describe dwk-cluster \
  --zone=europe-north1-b \
  --project=dwk-gke-477617 \
  --format='value(monitoringService)'

# OUTPUT: monitoring.googleapis.com/kubernetes ✅
```

## Accediendo a Cloud Logging

### 1. Via Google Cloud Console

**Pasos:**
1. Ir a: https://console.cloud.google.com/logs
2. Proyecto: `dwk-gke-477617`
3. Seleccionar recurso:
   - Resource: `Kubernetes Container`
   - Cluster: `dwk-cluster`
   - Namespace: `default` (o `project`)
   - Pod: `<tu-pod>`

### 2. Via gcloud CLI

```bash
# Ver logs de un pod específico
gcloud logging read "resource.type=k8s_container AND resource.labels.pod_name=dwk-environments-6b48f799b4-jq4tl" \
  --limit 50 \
  --project=dwk-gke-477617

# Ver logs de namespace específico
gcloud logging read "resource.type=k8s_pod AND resource.labels.namespace_name=project" \
  --limit 100 \
  --project=dwk-gke-477617

# Ver logs de los últimos 1 hora
gcloud logging read "resource.type=k8s_container" \
  --limit 50 \
  --project=dwk-gke-477617
```

### 3. Via kubectl (más rápido)

```bash
# Logs en tiempo real desde un pod (integración con Cloud Logging)
kubectl logs -f <pod-name>

# O ver directamente los logs guardados
kubectl logs <pod-name> --timestamps=true
```

## Cloud Logging Query Language (Logging Query)

### Sintaxis básica

```sql
resource.type = "k8s_container"
AND resource.labels.namespace_name = "project"
AND resource.labels.pod_name = "todo-app-*"
AND severity = "INFO"
```

### Ejemplos útiles

#### 1. Logs de creación de TODO

```sql
resource.type = "k8s_container"
AND resource.labels.namespace_name = "default"
AND jsonPayload.action = "CREATE_TODO"
```

#### 2. Logs de errores

```sql
resource.type = "k8s_container"
AND (severity = "ERROR" OR severity = "CRITICAL")
```

#### 3. Logs de aplicación específica

```sql
resource.type = "k8s_pod"
AND resource.labels.pod_name =~ "todo-app.*"
AND timestamp >= "2025-11-08T10:00:00Z"
```

#### 4. Logs por namespace

```sql
resource.type = "k8s_container"
AND resource.labels.namespace_name = "project"
```

#### 5. Logs con búsqueda de texto

```sql
resource.type = "k8s_container"
AND textPayload =~ ".*TODO.*created.*"
```

## Preparando la Aplicación para Logging

### 1. Logging en Node.js (si aplica)

Para que la aplicación log correctamente en GKE:

```javascript
// Usar console.log (automáticamente capturado)
console.log(JSON.stringify({
  timestamp: new Date().toISOString(),
  level: "INFO",
  action: "CREATE_TODO",
  todo: { id: 123, title: "My task" },
  user: "user@example.com"
}));

// O con un logger como winston
const logger = winston.createLogger({
  format: winston.format.json(),
  transports: [
    new winston.transports.Console()
  ]
});

logger.info("TODO Created", {
  action: "CREATE_TODO",
  todoId: 123,
  todoTitle: "My task"
});
```

### 2. Logging en Python (si aplica)

```python
import json
import logging
from datetime import datetime

# Configurar logging en JSON
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Log de TODO creado
logger.info(json.dumps({
    "timestamp": datetime.utcnow().isoformat(),
    "action": "CREATE_TODO",
    "todo_id": 123,
    "todo_title": "My task"
}))
```

## Capturando Logs en Cloud Logging

### Paso 1: Verificar que Cloud Logging está activo

```bash
# Ver logs del cluster
kubectl logs -n project <pod-name>

# O en Cloud Console:
# https://console.cloud.google.com/logs/query
```

### Paso 2: Crear una query para TODO creation

```sql
# Query en Cloud Logging Console:
resource.type = "k8s_container"
AND resource.labels.namespace_name = "default"
AND (
  textPayload =~ ".*created.*" 
  OR textPayload =~ ".*CREATE.*"
  OR jsonPayload.action = "CREATE"
)
```

### Paso 3: Ejecutar acción en aplicación

```bash
# 1. Port-forward a la aplicación
kubectl port-forward -n default svc/todo-app-svc 3000:3000

# 2. Crear un TODO vía curl o navegador
curl -X POST http://localhost:3000/todos \
  -H "Content-Type: application/json" \
  -d '{"title": "Test TODO for logging"}'

# 3. Los logs aparecerán automáticamente en Cloud Logging
```

### Paso 4: Visualizar logs en Cloud Console

**Path:**
1. https://console.cloud.google.com/logs/query
2. Proyecto: `dwk-gke-477617`
3. Resource type: `Kubernetes Container`
4. Namespace: `default`
5. Pod: `todo-app-*`
6. Ejecutar query
7. Ver logs del TODO creado

## Cloud Monitoring Dashboards

### Acceder a Dashboards

```
https://console.cloud.google.com/monitoring/dashboards
Proyecto: dwk-gke-477617
```

### Dashboards preconfigurados

GKE incluye automáticamente:

1. **Cluster Monitoring**
   - CPU, Memoria, Networking
   - Nodos disponibles
   - Pod count

2. **Node Monitoring**
   - Recursos por nodo
   - Network I/O
   - Disk usage

3. **Pod Monitoring**
   - CPU y Memoria por pod
   - Network I/O
   - Restart count

### Crear Query Personalizada

```sql
# CPU usage del namespace "default"
fetch k8s_container
| metric 'kubernetes.io/container/cpu/core_usage_time'
| filter resource.namespace_name == 'default'
| group_by 1m, [value_mean: mean(value.core_usage_time)]
```

## Opcional: Prometheus + Grafana

### Instalar Prometheus en GKE

```bash
# 1. Crear namespace para monitoring
kubectl create namespace monitoring

# 2. Agregar Helm repo de Prometheus
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

# 3. Instalar Prometheus
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --values - << EOF
prometheus:
  prometheusSpec:
    retention: 7d
    resources:
      requests:
        cpu: 50m
        memory: 128Mi
grafana:
  enabled: true
  resources:
    requests:
      cpu: 50m
      memory: 128Mi
EOF

# 4. Port-forward para acceder
kubectl port-forward -n monitoring svc/prometheus-operated 9090:9090
kubectl port-forward -n monitoring svc/prometheus-grafana 3000:80
```

### Acceder a Grafana

```
URL: http://localhost:3000
Username: admin
Password: prom-operator (por defecto)
```

### Queries útiles en Prometheus

```promql
# CPU usage
rate(container_cpu_usage_seconds_total{pod=~"todo-app.*"}[5m])

# Memory usage
container_memory_usage_bytes{pod=~"todo-app.*"} / 1024 / 1024

# Pod restarts
rate(kube_pod_container_status_restarts_total{pod=~"todo-app.*"}[5m])

# Network I/O
rate(container_network_transmit_bytes_total{pod=~"todo-app.*"}[5m])
```

## Workflow Completo: Capturar Logs de TODO Creation

### 1. Verificar aplicación está corriendo

```bash
# Ver pods en namespace default
kubectl get pods -n default

# Ver logs actuales
kubectl logs -n default <todo-app-pod>
```

### 2. Port-forward a la aplicación

```bash
kubectl port-forward -n default svc/todo-app-svc 3000:3000
```

### 3. Crear TODO desde navegador o curl

```bash
# Opción A: Navegador
# http://localhost:3000

# Opción B: Curl
curl -X POST http://localhost:3000/todos \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test TODO from kubectl",
    "description": "This is logged in Cloud Logging"
  }'
```

### 4. Ver logs en Cloud Logging Console

```
https://console.cloud.google.com/logs/query?project=dwk-gke-477617
```

**Query:**
```sql
resource.type = "k8s_container"
AND resource.labels.pod_name =~ "todo-app.*"
AND timestamp >= "2025-11-08T10:00:00Z"
```

### 5. Capturar screenshot

- Screenshot debe mostrar:
  - ✅ Logs de creación de TODO
  - ✅ Timestamp
  - ✅ Pod name
  - ✅ Namespace
  - ✅ Content of the log

## Troubleshooting

### "No logs visible in Cloud Logging"

```bash
# 1. Verificar que logging está habilitado
gcloud container clusters describe dwk-cluster \
  --zone=europe-north1-b \
  --format='value(loggingService)'

# 2. Verificar que pod está corriendo
kubectl get pods -A

# 3. Verificar que pod tiene logs
kubectl logs <pod-name>

# 4. Esperar 1-2 minutos (delay de propagación)
```

### "Cannot see my application logs"

```bash
# 1. Verificar que app escribe a stdout/stderr
docker logs <container-id>

# 2. Verificar formato de logs
# - Simple text: OK
# - JSON: OK (recomendado)
# - Binary: NO

# 3. Usar kubectl logs como verificación
kubectl logs <pod-name> -f
```

### "Cloud Logging Console shows only system logs"

```bash
# 1. Selectionar el recurso correcto (Kubernetes Container)
# 2. Selectionar el namespace correcto (default, project, etc.)
# 3. Usar query correcta:
resource.type = "k8s_container"
AND resource.labels.namespace_name = "YOUR_NAMESPACE"
```

## Resumen de Comandos Útiles

```bash
# Ver status de logging
gcloud container clusters describe dwk-cluster \
  --zone=europe-north1-b \
  --format='value(loggingService,monitoringService)'

# Ver logs de un pod
kubectl logs <pod-name> -f

# Ver logs con timestamp
kubectl logs <pod-name> --timestamps=true

# Ver logs de últimas 1 hora
kubectl logs <pod-name> --since=1h

# Ver logs de todos los pods en namespace
kubectl logs -n default -l app=todo-app

# Port-forward para acceder a app
kubectl port-forward svc/todo-app-svc 3000:3000

# Query en Cloud Logging CLI
gcloud logging read "resource.type=k8s_container AND resource.labels.namespace_name=default" \
  --limit 50 \
  --project=dwk-gke-477617
```

## Checklist de Verificación

- [ ] Cloud Logging habilitado en GKE
- [ ] Cloud Monitoring habilitado en GKE
- [ ] Puedo ver logs en Cloud Console
- [ ] Puedo ver logs con `kubectl logs`
- [ ] Query de Logging funciona
- [ ] Puedo crear TODO y ver logs
- [ ] Screenshot capturado mostrando logs de TODO creation
- [ ] (Opcional) Prometheus + Grafana instalado

## Demostración: Capturando Logs de TODO Creation

### Pod de Ejemplo: todo-logger-example

Se incluye un pod de ejemplo (`manifests/logging-demo.yaml`) que simula la creación de TODOs y loguea en JSON para demostración:

**Crear el pod:**
```bash
kubectl apply -f manifests/logging-demo.yaml
```

**Ver logs locales:**
```bash
kubectl logs todo-logger-example -f
```

**Logs capturados en Cloud Logging:**

Los logs se envían automáticamente a Cloud Logging y aparecen con estructura JSON:

```json
{
  "timestamp": "2025-11-08T21:48:08+00:00",
  "level": "INFO",
  "action": "TODO_CREATED",
  "todo_id": 1,
  "todo_title": "Complete Exercise 3.12"
}
```

### Query en Cloud Logging Console

**URL con query preconfigurada:**
```
https://console.cloud.google.com/logs/query?project=dwk-gke-477617&query=resource.type%3D%22k8s_container%22%0AAND%20resource.labels.pod_name%3D%22todo-logger-example%22
```

**Query de búsqueda:**
```sql
resource.type = "k8s_container"
AND resource.labels.cluster_name = "dwk-cluster"
AND resource.labels.pod_name = "todo-logger-example"
```

### Ver logs con CLI

```bash
# Query todos los logs del pod
gcloud logging read "resource.type=k8s_container AND resource.labels.pod_name=todo-logger-example" \
  --project=dwk-gke-477617 \
  --limit=20

# Filtrar solo logs de TODO_CREATED
gcloud logging read "resource.type=k8s_container AND resource.labels.pod_name=todo-logger-example AND jsonPayload.action=TODO_CREATED" \
  --project=dwk-gke-477617
```

### Evidencia Capturada

✅ **Logs disponibles en Cloud Logging Console**
- Pod: `todo-logger-example`
- Namespace: `default`
- Cluster: `dwk-cluster`
- Logs: Eventos de POD_STARTED, TODO_CREATED, TODO_UPDATED
- Timestamp: 2025-11-08T21:48:06Z - 2025-11-08T21:48:10Z

**Estructura de logs en Cloud Logging:**

```yaml
resource:
  type: k8s_container
  labels:
    cluster_name: dwk-cluster
    container_name: todo-logger
    location: europe-north1-b
    namespace_name: default
    pod_name: todo-logger-example
    project_id: dwk-gke-477617

jsonPayload:
  action: "TODO_CREATED"
  level: "INFO"
  timestamp: "2025-11-08T21:48:08+00:00"
  todo_id: 1
  todo_title: "Complete Exercise 3.12"

severity: INFO
timestamp: "2025-11-08T21:48:08.173493138Z"
```

## Conclusión

GKE proporciona monitoreo y logging integrados y completamente funcionales:

✅ **Cloud Logging**: Centraliza todos los logs del cluster
✅ **Cloud Monitoring**: Métricas y alertas automáticas
✅ **Dashboards**: Visualización lista para usar
✅ **Query Language**: Búsqueda potente en logs
✅ **Integración**: Funciona automáticamente sin configuración adicional
✅ **Demostración**: Logs de TODO creation capturados exitosamente

El monitoreo es **crítico en producción** para:
- Entender qué está pasando en el cluster
- Debugear problemas rápidamente
- Alertas proactivas ante anomalías
- Compliance y auditoría
- Análisis de eventos de negocio (como creación de TODOs)
