# Log Output Application

Esta aplicación genera un string aleatorio al inicio y lo muestra cada 5 segundos junto con un timestamp.

## Requisitos
- Node.js
- Docker
- Kubernetes (k3d)

## Instrucciones

### Local development
```bash
npm install
npm start
```

### Docker
```bash
docker build -t merkuryom/random-logger:v1 .
docker run merkuryom/random-logger:v1
```

### Kubernetes
```bash
kubectl apply -f manifests/deployment.yaml
kubectl get pods
kubectl logs -f <pod-name>
```