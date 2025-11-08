# Ejercicio 3.2: Back to Ingress

## Objetivos

En este ejercicio deployamos **Log Output** y **Ping-pong** en GKE usando **Ingress** en lugar de LoadBalancer, aprendiendo:

1. Usar **Ingress** como L7 load balancer en GKE
2. Mapear múltiples servicios bajo una sola IP
3. Path-based routing (`/logoutput` y `/pingpong`)
4. Health checks requeridos por Ingress
5. NodePort services (requerido por Ingress en GKE)

## Conceptos Clave

### Ingress vs LoadBalancer

| Aspecto | LoadBalancer | Ingress |
|---|---|---|
| **Capa OSI** | L4 (TCP/UDP) | L7 (HTTP/HTTPS) |
| **Costo** | Alto (IP pública por servicio) | Bajo (IP compartida) |
| **Funcionalidades** | Básicas | Path/host-based routing |
| **Múltiples servicios** | Necesita LoadBalancer por servicio | Un Ingress, múltiples rutas |
| **SSL/TLS** | Terminación básica | Control total |

### NodePort en GKE

En GKE, aunque especifiquemos `type: NodePort`:
- **NO se expone** el puerto en los nodos (a diferencia de clusters on-prem)
- El Ingress accede al servicio internamente
- La IP pública viene del **Ingress**, no del NodePort

### Path-Based Routing

```yaml
rules:
  - http:
      paths:
        - path: /logoutput       # Traffic a esta ruta
          pathType: Prefix       # Coincidir prefijo
          backend:
            service:
              name: logoutput-svc
              port:
                number: 80
```

### Health Checks Requeridos

**Importante**: Ingress espera que **todas** las rutas respondan con HTTP 200 en **`/`**

Por eso todos nuestros servicios responden:
```
GET / → HTTP 200 (health check)
```

## Architectura

```
Internet Request → Ingress (IP pública)
                  ├→ /logoutput → logoutput-svc (NodePort)
                  ├→ /pingpong → pingpong-svc (NodePort)
                  └→ / → pingpong-svc (default)
```

## Manifests

### 1. Log Output Service & Deployment
- **Service**: NodePort en puerto 80 → 3000
- **Deployment**: 1 réplica de nginx:alpine
- **Health check**: GET / → 200 OK
- **Ruta**: `/logoutput`

### 2. Ping-pong Service & Deployment
- **Service**: NodePort en puerto 80 → 3000
- **Deployment**: 2 réplicas de nginx:alpine
- **Health check**: GET / → 200 OK
- **Rutas**: `/pingpong` y `/` (default)

### 3. Ingress
- **Path /logoutput**: → logoutput-svc:80
- **Path /pingpong**: → pingpong-svc:80
- **Path /**: → pingpong-svc:80 (default/health check)

## Deployment en GKE

### 1. Aplicar manifests
```bash
kubectl apply -f manifests/logoutput.yaml
kubectl apply -f manifests/pingpong.yaml
kubectl apply -f manifests/ingress.yaml
```

### 2. Esperar a que Ingress obtenga IP
```bash
kubectl get ing -w
# NAME           CLASS    HOSTS   ADDRESS    PORTS   AGE
# app-ingress    <none>   *       35.x.x.x   80      5m
```

Esto puede tardar 2-5 minutos. Durante el tiempo de espera, GKE:
- Crea un Load Balancer global de Google Cloud
- Configura reglas de ruteo
- Realiza health checks
- Genera certificado SSL si es necesario

### 3. Probar acceso
```bash
INGRESS_IP=$(kubectl get ing app-ingress -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

# Test Log Output
curl http://$INGRESS_IP/logoutput

# Test Ping-pong
curl http://$INGRESS_IP/pingpong

# Test default (health check)
curl http://$INGRESS_IP/
```

## Verificación

### Ver todos los recursos
```bash
kubectl get svc -l "app in (logoutput,pingpong)"
kubectl get deployment -l "app in (logoutput,pingpong)"
kubectl get ing
```

### Ver logs de las aplicaciones
```bash
kubectl logs -f deployment/logoutput-dep
kubectl logs -f deployment/pingpong-dep
```

### Ver eventos del Ingress
```bash
kubectl describe ing app-ingress
kubectl get events -w
```

## Problemas Comunes

### Ingress stuck en <pending>
- Espera más tiempo (GKE tarda 5-10 minutos)
- Verifica cuotas: `gcloud compute project-info describe --project=<PROJECT>`
- Revisa eventos: `kubectl describe ing app-ingress`

### Health check fallando (502/503)
- Verifica que los pods están en Running: `kubectl get pods`
- Verifica que responden a GET /: `kubectl port-forward <pod> 3000:3000`
- Revisa logs: `kubectl logs <pod>`

### Path routing no funciona
- Verifica que las rutas coinciden exactamente
- Ten cuidado con trailing slashes: `/pingpong/` vs `/pingpong`
- Verifica que el backend responde en todas las rutas

## Limpieza

```bash
# Eliminar recursos
kubectl delete ing app-ingress
kubectl delete deployment logoutput-dep pingpong-dep
kubectl delete svc logoutput-svc pingpong-svc

# O directamente:
kubectl delete -f manifests/
```

## Diferencias con LocalHost/k3d

En k3d local (sin Ingress Controller real):
- El Ingress NO obtiene IP externa automáticamente
- Necesitas simular con `kubectl port-forward`
- No hay load balancer real

En GKE con Ingress:
- IP pública real y accesible desde Internet
- Load balancer gestionado por Google Cloud
- Health checks automáticos
- SSL/TLS disponible

## Próximos Pasos

En los siguientes ejercicios exploraremos:
- TLS/SSL en Ingress
- Multiple hosts (virtual hosting)
- Rewrites y redirects
- Gateway API (futuro de Kubernetes routing)
