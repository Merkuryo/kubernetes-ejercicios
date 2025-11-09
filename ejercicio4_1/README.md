# Exercise 4.1 - Readiness Probe

## Objective

Crear ReadinessProbes para las aplicaciones Ping-pong y Log-output:

- ✅ **Ping-pong**: ReadinessProbe que verifique conexión a la base de datos
- ✅ **Log-output**: ReadinessProbe que verifique que puede recibir datos de Ping-pong
- ✅ **Demostración**: Sin PostgreSQL, los pods quedan en estado 0/1 y 1/2
- ✅ **Demostración**: Con PostgreSQL, los pods avanzan a 1/1 y 2/2

## ¿Qué es una ReadinessProbe?

Una **ReadinessProbe** es un mecanismo de Kubernetes que verifica si un contenedor está listo para recibir tráfico. Es diferente de una **LivenessProbe**:

| Probe | Propósito | Acción |
|-------|-----------|--------|
| **ReadinessProbe** | ¿Está listo para servir? | No envía tráfico si falla |
| **LivenessProbe** | ¿Está vivo/funcional? | Reinicia el contenedor si falla |

## Estructura de Directorios

```
ejercicio4_1/
├── manifests/
│   ├── postgres.yaml        # ConfigMap, Service, StatefulSet
│   ├── pingpong.yaml        # Service + Deployment con ReadinessProbe
│   └── logoutput.yaml       # Service + Deployment con 2 contenedores y ReadinessProbe
└── README.md (este archivo)
```

## Manifests

### 1. PostgreSQL (postgres.yaml)

```yaml
# ConfigMap con credenciales
apiVersion: v1
kind: ConfigMap
metadata:
  name: postgres-config
data:
  DB_HOST: "postgres-stset-0.postgres-svc.readiness-probe.svc.cluster.local"
  DB_PORT: "5432"
  DB_NAME: "postgres"
  DB_USER: "postgres"
  DB_PASSWORD: "password"

# StatefulSet
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres-stset
spec:
  serviceName: postgres-svc
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
        - name: postgres
          image: postgres:15-alpine
          # ... (ver archivo completo)
```

### 2. Ping-Pong con ReadinessProbe (pingpong.yaml)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: pingpong-dep
spec:
  replicas: 1
  template:
    metadata:
      labels:
        app: pingpong
    spec:
      containers:
        - name: pingpong
          image: mluukkai/dwk-app8:v1
          env:
            - name: DB_HOST
              valueFrom:
                configMapKeyRef:
                  name: postgres-config
                  key: DB_HOST
            # ... (otras variables)
          
          # ✅ ReadinessProbe: Verifica conexión a BD
          readinessProbe:
            httpGet:
              path: /healthz
              port: 3541
            initialDelaySeconds: 10    # Espera 10s antes de probar
            periodSeconds: 5            # Prueba cada 5s
```

**Explicación**:
- El endpoint `/healthz` devuelve `HTTP 200` si la BD está lista
- Devuelve `HTTP 500` si no puede conectarse
- El probe falla → pod no recibe tráfico

### 3. Log-Output con ReadinessProbe (logoutput.yaml)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: logoutput-dep
spec:
  replicas: 1
  template:
    metadata:
      labels:
        app: logoutput
    spec:
      containers:
        # Contenedor 1: log-writer
        # Escribe logs desde ping-pong
        - name: log-writer
          image: mluukkai/dwk-app8:v1
          env:
            - name: PINGPONG_URL
              value: "http://pingpong-svc:3000"

        # Contenedor 2: log-reader (HTTP server)
        # Lee logs y sirve requests
        - name: log-reader
          image: mluukkai/dwk-app8:v1
          
          # ✅ ReadinessProbe: Verifica que puede recibir de ping-pong
          readinessProbe:
            httpGet:
              path: /healthz
              port: 3541
            initialDelaySeconds: 10
            periodSeconds: 5
```

**Características**:
- **2 contenedores en 1 pod**: log-writer y log-reader
- **log-writer**: Depende de que ping-pong esté disponible
- **log-reader**: Solo ready cuando puede servir requests
- **Estado de pod**: `X/2` (contenedores ready / total)

## Despliegue y Pruebas

### 1. Aplicar todos los manifests

```bash
kubectl apply -f manifests/
```

### 2. Ver estado SIN que PostgreSQL esté ready

```bash
$ kubectl get pods -n readiness-probe

NAME                             READY   STATUS    RESTARTS   AGE
logoutput-dep-7fb7dcbc58-h67fw   1/2     Running   0          1m
pingpong-dep-75948877b7-wwl8p    0/1     Running   0          1m
postgres-stset-0                 1/1     Running   0          1m
```

**Explicación**:
- ✅ `postgres-stset-0`: 1/1 - Base de datos ready
- ❌ `pingpong-dep`: 0/1 - ReadinessProbe falla (no puede conectar a BD)
- ⚠️ `logoutput-dep`: 1/2 - log-writer ready, log-reader NOT ready (ping-pong no disponible)

### 3. Ver eventos de ReadinessProbe

```bash
$ kubectl describe pod -n readiness-probe <pod-name>
```

Output:
```
Events:
  Type     Reason     Age                From               Message
  ----     ------     ----               ----               -------
  Warning  Unhealthy  16s (x5 over 36s)  kubelet            Readiness probe failed:
    Get "http://10.84.0.16:3541/healthz": context deadline exceeded
```

### 4. Esperar a que la BD esté lista

Después de unos segundos/minutos, cuando PostgreSQL complete su inicialización:

```bash
$ kubectl get pods -n readiness-probe

NAME                             READY   STATUS    RESTARTS   AGE
logoutput-dep-7fb7dcbc58-h67fw   2/2     Running   0          3m
pingpong-dep-75948877b7-wwl8p    1/1     Running   0          3m
postgres-stset-0                 1/1     Running   0          3m
```

✅ **Todos los pods ahora están READY**:
- Ping-pong puede conectarse a BD → `1/1`
- Log-output puede recibir de ping-pong → `2/2`

## Conceptos Clave

### ReadinessProbe Types

**1. httpGet** (usado en este ejercicio)
```yaml
readinessProbe:
  httpGet:
    path: /healthz
    port: 3541
  initialDelaySeconds: 10
  periodSeconds: 5
```

**2. exec** (comando)
```yaml
readinessProbe:
  exec:
    command:
      - /bin/sh
      - -c
      - test -e /ready
  initialDelaySeconds: 10
```

**3. tcpSocket** (verificar puerto)
```yaml
readinessProbe:
  tcpSocket:
    port: 5432
  initialDelaySeconds: 10
```

### Parámetros Importantes

```yaml
readinessProbe:
  httpGet:
    path: /healthz
    port: 3541
  initialDelaySeconds: 10      # Tiempo de espera antes del primer probe
  periodSeconds: 5              # Frecuencia de pruebas
  timeoutSeconds: 1             # Timeout para cada prueba
  successThreshold: 1           # Pruebas exitosas hasta marcar como ready
  failureThreshold: 3           # Fallos antes de marcar como not-ready
```

## Flujo de Inicialización

```
tiempo 0s   → Pods creados
            → Contenedores inician

tiempo 10s  → Primer ReadinessProbe ejecutado

┌─────────────────────────────────────────┐
│   ping-pong ReadinessProbe              │
│   Intenta conectar a PostgreSQL         │
└─────────────────────────────────────────┘
   ↓ FALLA (BD no lista)
   → ping-pong status: NOT READY (0/1)

┌─────────────────────────────────────────┐
│   log-output ReadinessProbe             │
│   Intenta acceder a ping-pong           │
└─────────────────────────────────────────┘
   ↓ FALLA (ping-pong no ready)
   → log-reader NOT READY
   → status: 1/2

ESPERAR...

┌─────────────────────────────────────────┐
│   PostgreSQL listo para conexiones      │
└─────────────────────────────────────────┘
   ↓
┌─────────────────────────────────────────┐
│   ping-pong ReadinessProbe              │
│   Conecta a PostgreSQL: 200 OK          │
└─────────────────────────────────────────┘
   ↓ ÉXITO
   → ping-pong status: READY (1/1)

┌─────────────────────────────────────────┐
│   log-output ReadinessProbe             │
│   Puede acceder a ping-pong: 200 OK     │
└─────────────────────────────────────────┘
   ↓ ÉXITO
   → log-reader status: READY
   → status: 2/2
```

## Comandos Útiles

```bash
# Ver pods en el namespace
kubectl get pods -n readiness-probe

# Ver detalles completos de un pod (incluyendo eventos)
kubectl describe pod <pod-name> -n readiness-probe

# Ver logs del contenedor
kubectl logs <pod-name> -c <container-name> -n readiness-probe

# Ejecutar comando dentro del pod
kubectl exec <pod-name> -c <container-name> -n readiness-probe -- <cmd>

# Observar cambios en tiempo real
kubectl get pods -n readiness-probe --watch

# Limpiar todo
kubectl delete namespace readiness-probe
```

## Resumen

✅ **Ejercicio completado**:

1. ✅ Ping-pong con ReadinessProbe verifica conexión a BD
2. ✅ Log-output con ReadinessProbe verifica disponibilidad de ping-pong
3. ✅ Sin PostgreSQL: pods en 0/1 y 1/2
4. ✅ Con PostgreSQL: pods avanzan a 1/1 y 2/2 automáticamente
5. ✅ ReadinessProbes mejoran la confiabilidad de deployments

## Referencias

- [Kubernetes Liveness and Readiness Probes](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)
- [ReadinessProbe Docs](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.32/#probe-v1-core)
- [Best Practices for Probes](https://kubernetes.io/blog/2015/12/container-probe-defaults-changed/)
