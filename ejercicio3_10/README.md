# Exercise 3.10 - PostgreSQL Backup to Google Cloud Storage

## Objective

Crear un CronJob en Kubernetes que automáticamente haga backup de la base de datos PostgreSQL cada 24 horas y guarde los backups en Google Cloud Storage (GCS).

Este ejercicio completa la solución de backup iniciada en Ejercicio 2.9, pero esta vez **guardando los backups permanentemente** en GCS en lugar de descartarlos.

## Arquitectura

```
┌──────────────────────────────────────────────────────────────┐
│                    Kubernetes Cluster (GKE)                  │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ CronJob: postgres-backup                                │ │
│  ├─────────────────────────────────────────────────────────┤ │
│  │ Schedule: 0 2 * * * (2 AM UTC every day)                │ │
│  │                                                         │ │
│  │ ┌──────────────────────────────────────────────────┐   │ │
│  │ │ 1. Connect to PostgreSQL                         │   │ │
│  │ │    └─ postgres-svc:5432/todos                    │   │ │
│  │ │                                                  │   │ │
│  │ │ 2. Execute pg_dump                              │   │ │
│  │ │    └─ Creates SQL backup file                   │   │ │
│  │ │                                                  │   │ │
│  │ │ 3. Upload to Google Cloud Storage                │   │ │
│  │ │    └─ gs://dwk-postgres-backups/                │   │ │
│  │ │       postgres-backup-YYYYMMDD-HHMMSS.sql       │   │ │
│  │ └──────────────────────────────────────────────────┘   │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  Secrets:                                                     │
│  ├─ postgres-password: BD password                          │ │
│  └─ gcs-credentials: Service account JSON key              │ │
│                                                               │
└──────────────────────────────────────────────────────────────┘
                              │
                              ↓
┌──────────────────────────────────────────────────────────────┐
│           Google Cloud Storage (GCS)                         │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│ Bucket: gs://dwk-postgres-backups/                          │
│                                                               │
│ ├─ postgres-backup-20251108-020000.sql (5.2 MB)             │
│ ├─ postgres-backup-20251107-020000.sql (5.1 MB)             │
│ ├─ postgres-backup-20251106-020000.sql (5.0 MB)             │
│ └─ ... (retention: configurable)                           │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

## Implementación

### 1. Crear el Bucket de Google Cloud Storage

```bash
# Create bucket in europe-north1 region
gsutil mb -p dwk-gke-477617 -l europe-north1 gs://dwk-postgres-backups
```

### 2. Crear Service Account y Permisos

```bash
# Create service account for backup jobs
gcloud iam service-accounts create postgres-backup-sa \
  --display-name="PostgreSQL Backup Service Account" \
  --project=dwk-gke-477617

# Grant permissions to the bucket (object creator)
gsutil iam ch serviceAccount:postgres-backup-sa@dwk-gke-477617.iam.gserviceaccount.com:objectCreator \
  gs://dwk-postgres-backups

# Generate JSON key
gcloud iam service-accounts keys create ~/postgres-backup-key.json \
  --iam-account=postgres-backup-sa@dwk-gke-477617.iam.gserviceaccount.com
```

### 3. Crear Secret en Kubernetes

```bash
# Create secret with GCS credentials
kubectl create secret generic gcs-credentials \
  --from-file=credentials.json=$HOME/postgres-backup-key.json \
  -n default
```

### 4. Aplicar Manifests

```bash
# Apply RBAC configuration
kubectl apply -f manifests/rbac.yaml

# Apply CronJob
kubectl apply -f manifests/cronjob.yaml
```

## Manifests

### `rbac.yaml` - Control de Acceso

Define:
- **ServiceAccount**: `postgres-backup-sa` para el CronJob
- **ClusterRole**: Permisos para leer secrets de PostgreSQL y GCS
- **ClusterRoleBinding**: Vincula rol al service account

### `cronjob.yaml` - CronJob Configuration

**Especificaciones:**
- **Schedule**: `0 2 * * *` (2 AM UTC cada día)
- **Image**: `google/cloud-sdk:latest` (incluye pg_dump, gcloud, gsutil)
- **Process**:
  1. Activa servicio GCS con credenciales
  2. Conecta a PostgreSQL usando pg_dump
  3. Crea archivo SQL con timestamp
  4. Sube a GCS
  5. Verifica upload exitoso

**Detalles importantes:**
```yaml
# Volúmenes montados
volumes:
  - name: gcs-credentials    # GCS authentication
  - name: postgres-password  # DB password (from secret)

# Resource requests (para evitar problemas de memoria)
resources:
  requests:
    memory: "256Mi"
    cpu: "250m"
  limits:
    memory: "512Mi"
    cpu: "500m"

# Reintentos en caso de fallo
restartPolicy: OnFailure
```

## Verificación

### Ver CronJob

```bash
# Ver CronJobs
kubectl get cronjobs
# OUTPUT: NAME                 SCHEDULE      SUSPEND   ACTIVE   LAST SCHEDULE
#         postgres-backup      0 2 * * *     False     0        <none>

# Ver detalles
kubectl describe cronjob postgres-backup
```

### Ver Jobs Ejecutados

```bash
# Ver jobs creados por el CronJob
kubectl get jobs | grep postgres-backup
# OUTPUT: postgres-backup-27941081     0/1           1/1     8s       20h

# Ver logs del último job
kubectl logs -l job-name=postgres-backup-<timestamp>
```

### Verificar Backups en GCS

```bash
# Listar archivos en el bucket
gsutil ls -h gs://dwk-postgres-backups/

# Descargar un backup
gsutil cp gs://dwk-postgres-backups/postgres-backup-20251108-020000.sql ./

# Ver tamaño de backups
gsutil du -sh gs://dwk-postgres-backups/

# Contar archivos
gsutil ls gs://dwk-postgres-backups/ | wc -l
```

## Configuración Avanzada

### Cambiar Schedule

```yaml
# Ejecutar cada 6 horas
schedule: "0 */6 * * *"

# Ejecutar cada lunes a las 3 AM
schedule: "0 3 * * 1"

# Ejecutar cada 30 minutos
schedule: "*/30 * * * *"
```

### Cambiar Retención de Backups

Opción 1: Lifecycle policy en GCS
```bash
# Eliminar archivos con más de 30 días
gsutil lifecycle set - gs://dwk-postgres-backups << 'EOF'
{
  "lifecycle": {
    "rule": [
      {
        "action": {"type": "Delete"},
        "condition": {"age": 30}
      }
    ]
  }
}
EOF
```

Opción 2: Script en el CronJob
```bash
# Agregar al final del CronJob script
# Eliminar backups con más de 30 días
gsutil rm gs://dwk-postgres-backups/postgres-backup-* || true
```

### Notificaciones de Fallo

Agregar al CronJob un sidecar para reportar fallos:

```yaml
# En caso de fallo, enviar email/Slack
- name: notify-on-failure
  image: curlimages/curl:latest
  command:
    - /bin/sh
    - -c
    - |
      if [ "$?" != "0" ]; then
        curl -X POST https://hooks.slack.com/services/.../...
      fi
```

## Restore desde un Backup

### Opción 1: Descargar y Restaurar Localmente

```bash
# 1. Descargar backup desde GCS
gsutil cp gs://dwk-postgres-backups/postgres-backup-20251108-020000.sql ./restore.sql

# 2. Conectar a PostgreSQL
psql -h localhost -U postgres -d todos < restore.sql

# 3. Verificar restauración
psql -h localhost -U postgres -d todos -c "SELECT COUNT(*) FROM todo;"
```

### Opción 2: Restaurar Directamente en Pod

```bash
# 1. Copiar archivo a pod
kubectl cp restore.sql <pod-name>:/tmp/

# 2. Ejecutar restore
kubectl exec <pod-name> -- psql -U postgres -d todos < /tmp/restore.sql
```

### Opción 3: Restaurar en GKE desde GCS

```bash
# Crear pod temporal
kubectl run restore-pod \
  --image=postgres:13 \
  --env="PGPASSWORD=password" \
  --rm -it \
  -- /bin/bash

# Dentro del pod:
gsutil cp gs://dwk-postgres-backups/postgres-backup-*.sql ./
psql -h postgres-svc -U postgres -d todos < backup.sql
```

## Troubleshooting

### El CronJob no ejecuta

```bash
# 1. Verificar que CronJob está activo
kubectl get cronjob postgres-backup -o yaml | grep suspend

# 2. Ver eventos
kubectl describe cronjob postgres-backup

# 3. Verificar permisos de RBAC
kubectl auth can-i get secrets --as=system:serviceaccount:default:postgres-backup-sa
```

### Error: "pg_dump: could not connect to database"

```bash
# 1. Verificar que PostgreSQL está corriendo
kubectl get pods -l app=postgres

# 2. Probar conexión desde un pod
kubectl run -it --rm debug --image=postgres:13 -- \
  psql -h postgres-svc -U postgres -d todos -c "SELECT NOW()"

# 3. Verificar credenciales en secret
kubectl get secret postgres-password -o yaml
```

### Error: "Failed to upload backup to GCS"

```bash
# 1. Verificar credenciales GCS
kubectl get secret gcs-credentials -o yaml | grep credentials.json | head -1

# 2. Verificar permisos del service account
gsutil iam get gs://dwk-postgres-backups/ | grep postgres-backup-sa

# 3. Probar autenticación manualmente
kubectl run -it --rm gcs-test \
  --image=google/cloud-sdk:latest \
  --serviceaccount=postgres-backup-sa \
  -- gcloud auth list
```

## Monitoreo

### Agregar alertas en Cloud Monitoring

```bash
# Crear métrica para jobs fallidos
gcloud monitoring policies create \
  --display-name="PostgreSQL Backup Failed" \
  --condition-display-name="Job failed" \
  --condition-threshold-value=1
```

### Ver histórico de ejecuciones

```bash
# Ver todos los jobs (historial de 3 meses)
kubectl get events --field-selector involvedObject.kind=CronJob

# Ver jobs completados/fallidos
kubectl get jobs -o wide | grep postgres-backup
```

## Seguridad

### Mejores Prácticas

1. **Credenciales GCS**
   - ✅ Usar service account con permisos mínimos (objectCreator only)
   - ✅ Rotar keys regularmente
   - ✅ Auditar acceso en Cloud Audit Logs

2. **Backups en GCS**
   - ✅ Habilitar versioning
   ```bash
   gsutil versioning set on gs://dwk-postgres-backups
   ```
   - ✅ Usar encriptación customer-managed (opcional)
   - ✅ Restringir acceso público

3. **RBAC en Kubernetes**
   - ✅ ServiceAccount solo tiene permisos necesarios
   - ✅ NetworkPolicy para restringir tráfico

### Encriptación

```bash
# Habilitar versioning en bucket
gsutil versioning set on gs://dwk-postgres-backups

# Listar versiones
gsutil ls -la gs://dwk-postgres-backups/

# Ver tamaño con versiones
gsutil du -sh gs://dwk-postgres-backups/
```

## Costos

### Estimación Mensual

| Componente | Costo |
|-----------|-------|
| Almacenamiento (30 backups × 5MB) | $0.15 |
| Operaciones de escritura (30) | $0.15 |
| CronJob compute (1h × 30 días) | Incluido en cluster |
| **TOTAL** | **~$0.30/mes** |

Muy económico comparado con el valor de los datos.

## Próximas Mejoras

1. ✅ Agregar compresión de backups (gzip)
2. ✅ Encriptación de backups
3. ✅ Notificaciones por email/Slack
4. ✅ Backup incremental (solo cambios)
5. ✅ Restore automatizado (periodic testing)
6. ✅ Múltiples regiones para HA

## Referencias

- [Kubernetes CronJob Documentation](https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/)
- [PostgreSQL pg_dump Documentation](https://www.postgresql.org/docs/current/app-pgdump.html)
- [Google Cloud Storage Documentation](https://cloud.google.com/storage/docs)
- [GCS Object Lifecycle Policy](https://cloud.google.com/storage/docs/lifecycle)
- [gcloud CLI gsutil Reference](https://cloud.google.com/storage/docs/gsutil)

## Conclusión

Este ejercicio implementa una solución production-ready de backups automatizados:
- ✅ Ejecuta automáticamente cada 24 horas
- ✅ Guarda en GCS para durabilidad
- ✅ Bajo costo ($0.30/mes)
- ✅ Fácil de restaurar
- ✅ Escalable y mantenible

Los datos ahora están protegidos y recuperables.
