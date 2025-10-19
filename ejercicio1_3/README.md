# Log Output - Declarative Approach

Esta es la versión declarativa del ejercicio 1.1, usando manifiestos de Kubernetes.

## Requisitos
- Node.js
- Docker
- Kubernetes (k3d)

## Despliegue en Kubernetes
```bash
kubectl apply -f manifests/deployment.yaml
kubectl get pods
kubectl logs -f <pod-name>