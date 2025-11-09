# Exercise 4.3 — Prometheus and PromQL Queries

## Objective

Install Prometheus with Helm and execute PromQL queries to:
- Count pods created by StatefulSets in a specific namespace
- Familiarize with Prometheus query syntax

## Prometheus Installation

A simplified Prometheus configuration was used with:
- Image: `prom/prometheus:v2.45.0`
- Service: ClusterIP on port 9090
- ConfigMap: For scrape configuration

### Installation:

```bash
kubectl apply -f ejercicio4_3/manifests/prometheus-simple.yaml
```

### Verify status:

```bash
kubectl get pods -l app=prometheus
kubectl get svc prometheus
```

## Prometheus GUI Access

Port-forward to access the GUI:

```bash
kubectl port-forward svc/prometheus 9090:9090
```

Then access: **http://localhost:9090**

## PromQL Query: Counting StatefulSet Pods

To count pods created by StatefulSets in a namespace, we use the `kube_pod_info` metric combined with owner labels:

```promql
count(kube_pod_info{created_by_kind="StatefulSet"})
```

Or more specifically, to count pods in the `prometheus` namespace:

```promql
count(kube_pod_info{namespace="prometheus", created_by_kind="StatefulSet"})
```

### Alternative with label_replace:

```promql
count(label_replace(kube_pod_info{namespace="prometheus"}, "owner_kind", "$1", "owner_references_kind", "(.*)") 
{owner_kind="StatefulSet"})
```

## kube_pod_info Metric Structure

The `kube_pod_info` metric includes useful labels:
- `namespace`: Pod namespace
- `pod`: Pod name
- `created_by_name`: Name of the resource that created the pod
- `created_by_kind`: Type of resource (Deployment, StatefulSet, DaemonSet, etc.)

## Notes on Prometheus in This Exercise

- Prometheus was installed in `default` namespace to simplify configuration
- Configured with temporary storage (EmptyDir) suitable for a test environment
- Scraping requires kube-state-metrics available in the cluster
- For production, use the `kube-prometheus-stack` with official Helm chart

## References

- [Kube Prometheus Stack](https://github.com/prometheus-community/helm-charts/tree/main/charts/kube-prometheus-stack)
- [Kube State Metrics Metrics](https://github.com/kubernetes/kube-state-metrics/tree/main/docs)
- [PromQL Documentation](https://prometheus.io/docs/prometheus/latest/querying/basics/)

