# Ejercicio 4.3 — Prometheus y PromQL Queries

## Objetivo

Instalar Prometheus con Helm y ejecutar queries PromQL para:
- Contar pods creados por StatefulSets en un namespace específico
- Familiarizarse con la sintaxis de consultas de Prometheus

## Instalación de Prometheus

Se utilizó una configuración simplificada de Prometheus con:
- Imagen: `prom/prometheus:v2.45.0`
- Service: ClusterIP en puerto 9090
- ConfigMap: Para la configuración de scrapes

### Instalación:

```bash
kubectl apply -f ejercicio4_3/manifests/prometheus-simple.yaml
```

### Verificar estado:

```bash
kubectl get pods -l app=prometheus
kubectl get svc prometheus
```

## Acceso a Prometheus GUI

Port-forward para acceder a la GUI:

```bash
kubectl port-forward svc/prometheus 9090:9090
```

Luego acceder a: **http://localhost:9090**

## Query PromQL: Contar Pods de StatefulSets

Para contar pods creados por StatefulSets en un namespace, usamos la métrica `kube_pod_info` combinada con etiquetas de owner:

```promql
count(kube_pod_info{created_by_kind="StatefulSet"})
```

O más específicamente, para contar pods en el namespace `prometheus`:

```promql
count(kube_pod_info{namespace="prometheus", created_by_kind="StatefulSet"})
```

### Alternativa con label_replace:

```promql
count(label_replace(kube_pod_info{namespace="prometheus"}, "owner_kind", "$1", "owner_references_kind", "(.*)") 
{owner_kind="StatefulSet"})
```

## Estructura de kube_pod_info

La métrica `kube_pod_info` incluye etiquetas útiles:
- `namespace`: Namespace del pod
- `pod`: Nombre del pod
- `created_by_name`: Nombre del recurso que creó el pod
- `created_by_kind`: Tipo de recurso (Deployment, StatefulSet, DaemonSet, etc.)

## Notas sobre Prometheus en este ejercicio

- Prometheus se instaló en namespace `default` para simplificar la configuración
- Se configuró con almacenamiento temporal (EmptyDir) apropiado para un entorno de prueba
- El scraping requiere que kube-state-metrics esté disponible en el cluster
- Para producción, se recomienda usar `kube-prometheus-stack` con Helm chart oficial

## Referencias

- [Kube Prometheus Stack](https://github.com/prometheus-community/helm-charts/tree/main/charts/kube-prometheus-stack)
- [Kube State Metrics Metrics](https://github.com/kubernetes/kube-state-metrics/tree/main/docs)
- [PromQL Documentation](https://prometheus.io/docs/prometheus/latest/querying/basics/)

