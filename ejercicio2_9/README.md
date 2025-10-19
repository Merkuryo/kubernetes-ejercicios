# Ejercicio 2.9: Jobs and CronJobs - Auto-generate Wikipedia TODOs

## Descripción

En este ejercicio aprendemos a usar **CronJobs** en Kubernetes para ejecutar tareas **periódicamente**. La aplicación crea automáticamente TODOs cada hora con artículos aleatorios de Wikipedia para recordar al usuario que lea algo nuevo.

## Conceptos Clave

### Job vs CronJob vs Deployment

| Recurso | Propósito | Duración | Trigger |
|---------|-----------|----------|---------|
| **Deployment** | Servicio continuo | Indefinido | Manual (kubectl apply) |
| **Job** | Tarea que corre hasta completarse | Finita | Manual (kubectl apply) |
| **CronJob** | Tarea periódica | Finita (pero repetida) | Automático (schedule) |

### Job - Características

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: backup
spec:
  # Número máximo de reintentos si falla
  backoffLimit: 3
  
  # Tiempo máximo de ejecución
  activeDeadlineSeconds: 600
  
  # Número de completaciones paralelas/secuenciales
  parallelism: 1        # Solo 1 pod concurrentemente
  completions: 1        # Ejecutar 1 vez hasta completarse
  
  template:
    spec:
      restartPolicy: Never  # No reintentar automáticamente
      containers:
      - name: job
        image: myimage:latest
```

### CronJob - Características

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: scheduled-task
spec:
  # Cron schedule (formato estándar Unix)
  schedule: "0 * * * *"  # Cada hora en minuto 0
  
  # Límite de jobs históricos a mantener
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 3
  
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: Never
          containers:
          - name: task
            image: myimage:latest
```

## Formato de Schedule CronJob

```
┌─────────────────── minuto (0-59)
│ ┌───────────────── hora (0-23)
│ │ ┌─────────────── día del mes (1-31)
│ │ │ ┌───────────── mes (1-12)
│ │ │ │ ┌─────────── día de la semana (0-6, domingo=0)
│ │ │ │ │
│ │ │ │ │
* * * * *

Ejemplos:
"0 * * * *"      → Cada hora en minuto 0 (00:00, 01:00, 02:00, etc.)
"*/15 * * * *"   → Cada 15 minutos
"0 9 * * MON"    → Todos los lunes a las 09:00
"0 0 1 * *"      → Primer día del mes a medianoche
"*/1 * * * *"    → Cada minuto (solo para testing)
```

## Implementación: Wikipedia TODO Generator

### Objetivo

Crear un CronJob que:
1. Se ejecute cada hora
2. Obtenga una URL aleatorio de Wikipedia
3. Cree un TODO: "Read <URL>"
4. Persista en la base de datos

### Script: generate-wiki-todo.sh

```bash
#!/bin/bash
set -e

# 1. Obtener URL aleatorio de Wikipedia
WIKI_URL=$(curl -s -I "https://en.wikipedia.org/wiki/Special:Random" \
  | grep -i "^location:" \
  | cut -d' ' -f2- \
  | tr -d '\r')

# 2. Crear TODO en el backend
TODO_CONTENT="Read $WIKI_URL"

RESPONSE=$(curl -s -X POST "$BACKEND_URL/todos" \
  -H "Content-Type: application/json" \
  -d "{\"content\":\"$TODO_CONTENT\"}")

# 3. Verificar éxito
if echo "$RESPONSE" | grep -q '"id"'; then
    echo "✅ TODO created: $WIKI_URL"
    exit 0
else
    echo "❌ Failed to create TODO"
    exit 1
fi
```

### Dockerfile

```dockerfile
FROM alpine:3.18

# Instalar curl y bash
RUN apk add --no-cache curl bash

WORKDIR /scripts
COPY scripts/generate-wiki-todo.sh .
RUN chmod +x generate-wiki-todo.sh

CMD ["./generate-wiki-todo.sh"]
```

### CronJob Manifest

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: wiki-todo-generator
  namespace: project
spec:
  # Ejecutar cada hora
  schedule: "0 * * * *"
  
  # Guardar últimos 3 jobs exitosos
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 3
  
  jobTemplate:
    spec:
      # Timeout de 5 minutos
      activeDeadlineSeconds: 300
      
      template:
        spec:
          restartPolicy: Never
          
          containers:
          - name: wiki-todo
            image: wiki-todo-app:latest
            imagePullPolicy: Never
            
            env:
            - name: BACKEND_URL
              value: "http://todo-backend-db-svc:3000"
            
            resources:
              requests:
                cpu: 100m
                memory: 64Mi
              limits:
                cpu: 500m
                memory: 256Mi
```

## Wikipedia Special:Random API

**Endpoint:** `https://en.wikipedia.org/wiki/Special:Random`

**Comportamiento:**
- No devuelve contenido (HTTP 302 Redirect)
- Header `Location` contiene la URL del artículo aleatorio
- Cambio distinto cada vez que se accede

**Ejemplo:**
```bash
$ curl -s -I "https://en.wikipedia.org/wiki/Special:Random" | grep Location
Location: https://en.wikipedia.org/wiki/George_C._Ludlow

# El usuario ve: "Read https://en.wikipedia.org/wiki/George_C._Ludlow"
```

## Flujo de Ejecución

```
┌─────────────────┐
│  CronJob        │
│  Scheduler      │
└────────┬────────┘
         │
    Minuto 0 de cada hora
         │
         ▼
┌─────────────────────┐
│ Job Created         │
│ wiki-todo-gen-1234  │
└────────┬────────────┘
         │
         ▼
┌─────────────────────────────────┐
│ Pod: wiki-todo-gen-1234-xxxxx   │
│ Script: generate-wiki-todo.sh   │
│                                 │
│ 1. curl → Wikipedia             │
│ 2. Extract URL (George_C_...)   │
│ 3. POST → Backend API           │
│ 4. Backend → PostgreSQL         │
│ 5. EXIT 0 (Success)             │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────┐
│ Job Completed   │
│ 1/1             │
└─────────────────┘
```

## Pruebas Realizadas

### Ejecución 1 (Minuto 21)
```
Job: wiki-todo-generator-test-29348481
URL: https://en.wikipedia.org/wiki/George_C._Ludlow
Created TODO: Read https://en.wikipedia.org/wiki/George_C._Ludlow
Status: ✅ Complete
```

### Ejecución 2 (Minuto 22)
```
Job: wiki-todo-generator-test-29348482
URL: https://en.wikipedia.org/wiki/Ni_Ni_Khin_Zaw
Created TODO: Read https://en.wikipedia.org/wiki/Ni_Ni_Khin_Zaw
Status: ✅ Complete
```

### Ejecución 3 (Minuto 23)
```
Job: wiki-todo-generator-test-29348483
URL: https://en.wikipedia.org/wiki/Orri_(given_name)
Created TODO: Read https://en.wikipedia.org/wiki/Orri_(given_name)
Status: ✅ Complete
```

**Total de TODOs creados: 8** (5 iniciales + 3 por CronJob)

## Comandos Útiles

### Ver CronJobs
```bash
kubectl get cronjobs -n project
kubectl describe cronjob wiki-todo-generator -n project
```

### Ver Jobs creados por CronJob
```bash
kubectl get jobs -n project | grep wiki
```

### Ver logs de un Job
```bash
# Obtener nombre del pod del job
kubectl logs -n project job/wiki-todo-generator-test-29348481

# O desde el pod directamente
kubectl logs -n project wiki-todo-generator-test-29348481-xxxxx
```

### Monitorear CronJob en vivo
```bash
watch -n 5 'kubectl get cronjobs,jobs -n project | grep wiki'
```

### Ejecutar Job manualmente (útil para testing)
```bash
# Crear un job bajo demanda desde un CronJob
kubectl create job wiki-manual-run --from=cronjob/wiki-todo-generator -n project
```

### Editar schedule de CronJob
```bash
kubectl patch cronjob wiki-todo-generator -n project \
  --type='json' \
  -p='[{"op":"replace","path":"/spec/schedule","value":"*/5 * * * *"}]'
```

## Estructura de Archivos

```
ejercicio2_9/
├── Dockerfile
├── scripts/
│   └── generate-wiki-todo.sh
└── manifests/
    ├── cronjob.yaml        # Ejecuta cada hora
    └── cronjob-test.yaml   # Ejecuta cada minuto (para testing)
```

## Despliegue

### 1. Construir imagen
```bash
cd ejercicio2_9
docker build -t wiki-todo-app .
```

### 2. Importar en k3d
```bash
docker save wiki-todo-app > app.tar
k3d image import app.tar -c k3s-default
```

### 3. Aplicar CronJob
```bash
# Para producción (cada hora)
kubectl apply -f manifests/cronjob.yaml

# Para testing (cada minuto)
kubectl apply -f manifests/cronjob-test.yaml
```

### 4. Monitorear ejecuciones
```bash
kubectl get jobs -n project -w | grep wiki
```

## Consideraciones de Producción

1. **Limpieza de Jobs:** `successfulJobsHistoryLimit` y `failedJobsHistoryLimit` previenen acumulo de recursos
2. **Timeout:** `activeDeadlineSeconds` evita jobs que cuelguen indefinidamente
3. **Recursos:** `requests` y `limits` aseguran scheduling correcto
4. **Retry:** `backoffLimit` para jobs que puedan fallar
5. **Logging:** Revisar logs de jobs fallidos con `kubectl logs`

## Limitaciones Conocidas

1. **Wikipedia puede fallar:** La API de Wikipedia puede no estar disponible ocasionalmente
2. **Timeout del script:** Si la conexión es lenta, puede exceder 5 minutos
3. **Rate limiting:** Wikipedia tiene límites de rate limiting para IPs

## Solución de Problemas

### Job nunca se ejecuta
```bash
# Revisar si CronJob está suspendido
kubectl get cronjob wiki-todo-generator -n project

# Si SUSPEND=True, reactivar
kubectl patch cronjob wiki-todo-generator -n project \
  --type='json' \
  -p='[{"op":"replace","path":"/spec/suspend","value":false}]'
```

### Job falla repetidamente
```bash
# Ver logs del último job fallido
kubectl logs -n project job/$(kubectl get jobs -n project \
  -l cronjob=wiki-todo-generator \
  --sort-by=.metadata.creationTimestamp \
  --template='{{.items[-1].metadata.name}}')
```

### No se crean TODOs
```bash
# Verificar conectividad al backend
kubectl exec -it -n project wiki-todo-generator-test-xxxxx -- \
  curl http://todo-backend-db-svc:3000/health

# Verificar que la imagen está en el cluster
kubectl describe job wiki-todo-generator-test-xxxxx -n project
```

## Comparación: Job vs CronJob vs Deployment

| Característica | Job | CronJob | Deployment |
|---|---|---|---|
| Ejecución única | ✅ | ✅ (repetida) | ❌ (continua) |
| Ejecución periódica | ❌ | ✅ | ❌ |
| Ejecuta hasta completarse | ✅ | ✅ | ❌ |
| Monitorea completación | ✅ | ✅ | ✅ |
| Status persistente | ✅ | ✅ | ✅ |
| Caso de uso | Backups, migraciones | Limpieza, sincronización | Servicios web, APIs |

## Conclusión

El ejercicio 2.9 demuestra:
- ✅ **CronJobs** para tareas periódicas programadas
- ✅ **Jobs** como base de CronJobs
- ✅ **API Integration** con Wikipedia
- ✅ **Integración** con servicio backend existente
- ✅ **Monitoreo** y logging de ejecuciones
- ✅ **Configuración** de schedules y timeouts

Con esto, tenemos un sistema automatizado que:
1. **Crea TODOs automáticamente** cada hora
2. **Ofrece contenido variado** desde Wikipedia
3. **Persiste** todos los datos en PostgreSQL
4. **Es monitoreble** con logs y status de ejecución
5. **Es resiliente** con retry y timeout configurables
