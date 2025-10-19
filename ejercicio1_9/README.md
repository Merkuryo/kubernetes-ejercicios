# Log Output and Ping Pong Applications

Dos aplicaciones que comparten un Ingress:

## Log Output Application
- Genera y mantiene un string aleatorio
- Muestra el string con timestamp cada 5 segundos
- Accesible en la ruta raíz (/)

## Ping Pong Application
- Mantiene un contador en memoria
- Incrementa el contador en cada petición
- Responde con "pong <número>"
- Accesible en la ruta /pingpong

## Kubernetes
```bash
kubectl apply -f manifests/

# Acceder a las aplicaciones:
# Log Output: http://localhost:8081
# Ping Pong: http://localhost:8081/pingpong