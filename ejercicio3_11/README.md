# Ejercicio 3.11 - Resource Requests and Limits for Scaling

## Objetivo

Establecer solicitudes y límites de recursos sensatos (resource requests y limits) para todas las aplicaciones del proyecto. Esto es fundamental para:

- ✅ Permitir que Kubernetes escale correctamente
- ✅ Prevenir que un pod consuma todos los recursos del cluster
- ✅ Facilitar la toma de decisiones del HorizontalPodAutoscaler (HPA)
- ✅ Mejorar la utilización de recursos
- ✅ Preparar para escalado automático (vertical y horizontal)

## Conceptos Fundamentales

### 1. Resource Requests vs Limits

```yaml
resources:
  requests:           # Mínimo garantizado, necesario para scheduling
    cpu: "100m"       # 100 milicore (10% de 1 CPU)
    memory: "128Mi"   # 128 Megabytes
  
  limits:             # Máximo permitido, hard limit
    cpu: "500m"       # 500 milicore (50% de 1 CPU)
    memory: "256Mi"   # 256 Megabytes
```

**Explicación:**

| Concepto | Propósito | Efecto |
|----------|----------|--------|
| **Requests** | Mínimo garantizado | Kubernetes reserva estos recursos para el pod |
| **Limits** | Máximo permitido | Pod será limitado/pausado si excede |
| **Ambos** | Control total | Scheduler sabe dónde colocar pod |
| **Solo Requests** | ⚠️ No recomendado | Pod puede crecer sin límite |
| **Solo Limits** | ⚠️ Sin garantías | Pod puede no tener espacio para crecer |

### 2. CPU (milicore)

```
1000m = 1 core completo
500m = 50% de 1 core
100m = 10% de 1 core
50m = 5% de 1 core
```

**Ejemplos:**
- **10m**: Aplicación muy liviana (cron, sidecar)
- **50m**: Aplicación ligera (servicio sin carga)
- **100m**: Aplicación pequeña
- **250m**: Aplicación media
- **500m**: Aplicación que requiere procesamiento

### 3. Memory (Mebibytes)

```
1024 Mi = 1 Gigabyte
512 Mi = 512 Megabytes
256 Mi = 256 Megabytes
128 Mi = 128 Megabytes
64 Mi = 64 Megabytes
```

**Ejemplos:**
- **32 Mi**: Servicio muy ligero
- **64 Mi**: Servicio simple
- **128 Mi**: Servicio típico
- **256 Mi**: Servicio con algunas características
- **512 Mi**: Aplicación media
- **1 Gi**: Aplicación pesada

## Análisis de Recursos del Proyecto

### Aplicaciones del Proyecto

Basado en `kubectl top pods -A` y análisis de las aplicaciones:

| App | CPU Típico | Memory Típico | Request | Limit |
|-----|-----------|---------------|---------|-------|
| dwk-environments (nginx) | 1-5m | 2-5Mi | 10m | 50m |
| colorcontent (nginx) | 1-5m | 2-5Mi | 10m | 50m |
| postgres-backup-job | 50-100m | 50-100Mi | 100m | 200m |
| todo-app (Node.js) | 10-20m | 20-40Mi | 20m | 100m |
| postgres (si DIY) | 30-50m | 100-150Mi | 50m | 200m |

**Nota**: Estos valores son estimaciones. Es importante medir en tu cluster específico.

## Implementing Resource Limits

### Ejemplo 1: Aplicación Web Simple (nginx)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dwk-environments
spec:
  replicas: 1
  selector:
    matchLabels:
      app: dwk-environments
  template:
    metadata:
      labels:
        app: dwk-environments
    spec:
      containers:
      - name: dwk-environments
        image: proyecto/imagen:tag
        
        # Resource requests and limits
        resources:
          requests:
            cpu: "10m"         # Mínimo: casi nada
            memory: "16Mi"     # Mínimo: muy poco
          
          limits:
            cpu: "50m"         # Máximo: 5% de 1 CPU
            memory: "32Mi"     # Máximo: 32 MB
        
        # Otros parámetros
        ports:
        - containerPort: 3000
        livenessProbe:
          httpGet:
            path: /
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 10
```

### Ejemplo 2: Aplicación Node.js/Backend

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: todo-app
spec:
  replicas: 1
  selector:
    matchLabels:
      app: todo-app
  template:
    metadata:
      labels:
        app: todo-app
    spec:
      containers:
      - name: todo-app
        image: proyecto/todo-app:tag
        
        # Resource management
        resources:
          requests:
            cpu: "50m"         # Mínimo: poco
            memory: "64Mi"     # Mínimo: 64 MB para Node
          
          limits:
            cpu: "200m"        # Máximo: 20% de 1 CPU
            memory: "128Mi"    # Máximo: 128 MB
        
        env:
        - name: NODE_ENV
          value: "production"
        
        ports:
        - containerPort: 3000
```

### Ejemplo 3: Aplicación CPU-Intensive (para HPA)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cpushredder-dep
spec:
  replicas: 1
  selector:
    matchLabels:
      app: cpushredder
  template:
    metadata:
      labels:
        app: cpushredder
    spec:
      containers:
      - name: cpushredder
        image: jakousa/dwk-app7:e11a700350aede132b62d3b5fd63c05d6b976394
        
        # Definir requests/limits para que HPA tenga baseline
        resources:
          requests:
            cpu: "100m"        # Baseline para cálculos
            memory: "64Mi"
          
          limits:
            cpu: "500m"        # Max: 50% de 1 CPU
            memory: "256Mi"    # Max: para seguridad
        
        ports:
        - containerPort: 3001

---
apiVersion: v1
kind: Service
metadata:
  name: cpushredder-svc
spec:
  type: LoadBalancer
  selector:
    app: cpushredder
  ports:
  - port: 80
    protocol: TCP
    targetPort: 3001

---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: cpushredder-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: cpushredder-dep
  
  minReplicas: 1
  maxReplicas: 6
  
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 50  # Scale when >50% CPU used
  
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
      - type: Percent
        value: 100
        periodSeconds: 30
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 10
        periodSeconds: 60
```

## Medición y Validación

### Comando: kubectl top pods

```bash
# Ver recursos de todos los pods en default namespace
kubectl top pods

# Ver con namespace específico
kubectl top pods -n project

# Ver todos los namespaces
kubectl top pods -A

# Ver detalles de un pod específico
kubectl top pod <pod-name>

# Con etiquetas
kubectl top pods -l app=dwk-environments
```

**Salida típica:**
```
NAME                                    CPU(cores)   MEMORY(bytes)
dwk-environments-6b48f799b4-jq4tl       1m           2Mi
todo-app-5c7d9b8f6e-a2k9l               15m          45Mi
postgres-backup-xxxxx                   50m          85Mi
```

### Comando: kubectl describe pod

```bash
# Ver requests/limits configurados
kubectl describe pod <pod-name>

# Búsqueda de Limits section
kubectl describe pod <pod-name> | grep -A 10 "Limits"
```

**Salida:**
```
    Limits:
      cpu:     50m
      memory:  32Mi
    Requests:
      cpu:     10m
      memory:  16Mi
```

## Namespace Resource Quotas

Para limitar el uso total en un namespace:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: staging
---
apiVersion: v1
kind: ResourceQuota
metadata:
  name: staging-quota
  namespace: staging
spec:
  hard:
    requests.cpu: "2"        # Total 2 CPUs en namespace
    requests.memory: "2Gi"   # Total 2 GB en namespace
    limits.cpu: "4"
    limits.memory: "4Gi"
    pods: "10"               # Máximo 10 pods
---
apiVersion: v1
kind: LimitRange
metadata:
  name: staging-limits
  namespace: staging
spec:
  limits:
  - default:                 # Limits si no se especifican
      cpu: "100m"
      memory: "128Mi"
    defaultRequest:          # Requests si no se especifican
      cpu: "50m"
      memory: "64Mi"
    type: Container
```

## Escalado Automático (HPA)

### Sin Resource Requests: HPA NO funciona

```bash
# ❌ Esto NO funcionará - sin baseline
kubectl top pods     # Mostrará: <unknown>

kubectl get hpa
# TARGETS: <unknown>/50%  ← No puede escalar
```

### Con Resource Requests: HPA funciona

```bash
# ✅ Esto SÍ funcionará - con baseline
kubectl top pods
# OUTPUT: 125m/500m  ← Ahora HPA puede calcular %

kubectl get hpa
# TARGETS: 25%/50%  ← Escala cuando >50%
```

## Mejores Prácticas

### ✅ HACER

```yaml
# 1. Siempre definir ambos requests y limits
resources:
  requests:
    cpu: "100m"
    memory: "128Mi"
  limits:
    cpu: "500m"
    memory: "256Mi"

# 2. Usar valores basados en métricas reales
# 3. Dejar headroom (limits > requests)
# 4. Tener requests realistas para scheduling
# 5. Documentar por qué esos valores
```

### ❌ NO HACER

```yaml
# 1. ❌ Sin limits (pod puede consumir todo)
resources:
  requests:
    cpu: "100m"
    memory: "128Mi"
  # limits: falta!

# 2. ❌ Sin requests (scheduling impredecible)
resources:
  limits:
    cpu: "500m"
    memory: "256Mi"
  # requests: falta!

# 3. ❌ Limits = Requests (sin headroom)
resources:
  requests:
    cpu: "500m"
  limits:
    cpu: "500m"  # Igual = sin espacio para picos

# 4. ❌ Valores arbitrarios
resources:
  requests:
    cpu: "999m"   # ¿Por qué 999?
    memory: "1Gi" # ¿De dónde?
```

## Caso de Uso Real: Proyecto Todo App

### Paso 1: Medir Sin Limites

```bash
# Ejecutar app sin limites y observar uso:
kubectl top pods -n project --watch
# Esperar 5 minutos

# Resultado típico:
# NAME          CPU    MEMORY
# todo-app      10m    35Mi
# postgres      25m    95Mi
```

### Paso 2: Establecer Requests (reservar mínimo)

```yaml
# Requests = actual usage * 1.2 (20% headroom)
# CPU: 10m * 1.2 = 12m → redondeado a 15m
# Mem: 35Mi * 1.2 = 42Mi → redondeado a 50Mi

resources:
  requests:
    cpu: "15m"
    memory: "50Mi"
```

### Paso 3: Establecer Limits (máximo seguro)

```yaml
# Limits = requests * 3-5 (para picos)
# CPU: 15m * 4 = 60m
# Mem: 50Mi * 3 = 150Mi

resources:
  requests:
    cpu: "15m"
    memory: "50Mi"
  limits:
    cpu: "60m"
    memory: "150Mi"
```

### Paso 4: Validar en Cluster

```bash
# Aplicar manifests
kubectl apply -f manifests/

# Monitorear
kubectl top pods -n project --watch

# Verificar que se respetan limites
kubectl describe pod -n project todo-app
```

## Troubleshooting

### Pod Pending: "Insufficient cpu"

```bash
# Problema: Requests demasiado altos
kubectl describe pod <pod-name>
# Events: FailedScheduling - Insufficient cpu

# Solución:
# 1. Bajar requests
# 2. O agregar más nodos
# 3. O liberar otros pods

# Verificar disponibilidad de nodos
kubectl describe nodes | grep -A 5 "Allocated resources"
```

### Pod OOMKilled: "Memory limit exceeded"

```bash
# Problema: Limits de memoria muy bajos
kubectl logs <pod-name>
# Línea final: OOMKilled (exit code 137)

# Solución:
# 1. Aumentar memory limits
# 2. Verificar que app no tiene memory leak
# 3. Usar -Xmx en Java apps

# Buscar pods killed por memoria
kubectl get pods | grep -i "0/1.*CrashLoopBackOff"
```

### CPU Throttling

```bash
# Problema: Pod siempre a 100% pero limitado
kubectl top pods
# OUTPUT: 450m/500m (constantemente al límite)

# Solución:
# 1. Aumentar CPU limits
# 2. Optimizar código
# 3. Considerar HPA

# Detectar throttling:
kubectl describe pod <pod-name> | grep -i "throttle"
```

## Verificación Final del Proyecto

### Checklist de Recursos

- [ ] Todos los Deployments tienen `resources.requests`
- [ ] Todos los Deployments tienen `resources.limits`
- [ ] `limits.cpu > requests.cpu` (headroom para picos)
- [ ] `limits.memory > requests.memory`
- [ ] Valores basados en `kubectl top pods` real
- [ ] HPA configurado con targets realistas
- [ ] Documentación de por qué esos valores

### Comandos de Verificación

```bash
# Ver todos los manifests con resources
kubectl get all -A -o yaml | grep -E "name:|requests:|limits:" | head -50

# Ver solo los que NO tienen limits
kubectl get pods -A -o yaml | grep -B 3 "limits:" | grep -v "limits:" | head -20

# Comparar requests vs actual usage
echo "=== REQUESTS ===" && kubectl top pods -n project
echo "=== ACTUAL USAGE ===" && kubectl get pods -n project -o yaml | grep -E "requests:|limits:"
```

## Referencias

- [Kubernetes Resource Requests and Limits](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/)
- [HPA Based on Resource Metrics](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/)
- [Resource Quotas](https://kubernetes.io/docs/concepts/policy/resource-quotas/)
- [Limit Ranges](https://kubernetes.io/docs/concepts/policy/limit-range/)
- [Vertical Pod Autoscaler](https://github.com/kubernetes/autoscaler/tree/master/vertical-pod-autoscaler)

## Conclusión

Establecer resource requests y limits es **fundamental** para:

1. ✅ **Scheduling correcto**: Kubernetes sabe dónde colocar pods
2. ✅ **Escalado automático**: HPA tiene baseline para decidir
3. ✅ **Utilización eficiente**: Evita desperdicio de recursos
4. ✅ **Estabilidad**: Previene que un pod derribe el cluster
5. ✅ **Predicibilidad**: Comportamiento consistente

**Sin resources definidos = caos en producción** 🔥
