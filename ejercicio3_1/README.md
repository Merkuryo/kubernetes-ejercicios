# Ejercicio 3.1: Pingpong GKE

## Objetivos

En este ejercicio deployamos la aplicación Ping-pong en **Google Kubernetes Engine (GKE)**, aprendiendo:

1. Usar Google Cloud Platform (GCP) y GKE
2. Crear un cluster GKE con múltiples nodos
3. Usar **LoadBalancer** service para exponer la aplicación
4. Configurar **PersistentVolumes** en GKE
5. Usar **subPath** para evitar conflictos de volumen

## Conceptos Clave

### Google Kubernetes Engine (GKE)

GKE es un servicio administrado de Kubernetes en Google Cloud que:
- Maneja el control plane automáticamente
- Ofrece autoscaling de nodos
- Proporciona integración con servicios de Google Cloud
- Usa LoadBalancers de Google Cloud para exposición externa

### LoadBalancer vs Ingress

| Característica | LoadBalancer | Ingress |
|---|---|---|
| Costo | Alto (costo de IP pública) | Bajo (usa ingress controller) |
| Tipo | Capa 4 (Transport) | Capa 7 (Application) |
| Múltiples servicios | Un IP por servicio | Múltiples servicios en una IP |
| Uso en GKE | Rápido y directo | Requiere controller adicional |

### subPath en Volúmenes

Cuando PostgreSQL se monta directamente en un PersistentVolume, puede haber conflicto con directorios del sistema de archivos. Usamos `subPath: postgres` para:

```yaml
volumeMounts:
  - name: data
    mountPath: /var/lib/postgresql/data
    subPath: postgres  # Crea un subdirectorio dentro del volumen
```

Esto crea: `/mnt/volume/postgres/` en lugar de usar `/mnt/volume/` directamente.

## Preparación

### 1. Instalar Google Cloud SDK
```bash
sudo snap install google-cloud-cli --classic
gcloud -v
```

### 2. Autenticar con Service Account
```bash
gcloud auth activate-service-account --key-file=/path/to/key.json
gcloud config set project dwk-gke-XXXXX
gcloud services enable container.googleapis.com compute.googleapis.com
```

### 3. Crear Cluster GKE
```bash
gcloud container clusters create dwk-cluster \
  --zone=europe-north1-b \
  --cluster-version=1.32 \
  --disk-size=32 \
  --num-nodes=3 \
  --machine-type=e2-micro
```

Esto tarda 10-15 minutos en completarse.

### 4. Obtener Credenciales
```bash
gcloud container clusters get-credentials dwk-cluster --zone=europe-north1-b
kubectl cluster-info
```

## Manifests

### Deployment: Ping-pong Application
- **Replicas**: 2 (para distribución de carga)
- **Service**: LoadBalancer (expone en IP pública)
- **Puerto externo**: 80 (mapeado a 3000 interno)
- **Variables de entorno**: Conecta a PostgreSQL

### StatefulSet: PostgreSQL Database
- **Replicas**: 1 (base de datos única)
- **Storage**: 10Gi PersistentVolume (automático en GKE)
- **subPath**: `postgres` para evitar conflictos de inicialización
- **Headless Service**: Para estabilidad del nombre DNS

## Deployment en GKE

### 1. Verificar acceso al cluster
```bash
kubectl cluster-info
kubectl get nodes
```

### 2. Aplicar manifests
```bash
kubectl apply -f manifests/statefulset.yaml
kubectl apply -f manifests/deployment.yaml
```

### 3. Esperar a que todo esté listo
```bash
kubectl get pods -w
kubectl get pvc
```

### 4. Obtener IP del LoadBalancer
```bash
kubectl get svc -w
# Esperar a que EXTERNAL-IP cambie de <pending> a una IP real
```

## Prueba de la Aplicación

Una vez que tengas la IP externa:

```bash
# Acceder a la aplicación
curl http://<EXTERNAL-IP>/

# Hacer ping
curl -X POST http://<EXTERNAL-IP>/ping \
  -H "Content-Type: application/json"

# Obtener estado de salud
curl http://<EXTERNAL-IP>/health
```

## Verificación

### Logs de la Aplicación
```bash
kubectl logs -f deployment/pingpong-dep
```

### Logs de PostgreSQL
```bash
kubectl logs -f statefulset/pingpong-db
```

### Verificar PersistentVolume
```bash
kubectl get pvc
kubectl get pv
kubectl describe pvc data-pingpong-db-0
```

## Costos en GCP

### Estimación para este ejercicio
- **3 nodos e2-micro**: ~$25-35/mes
- **10Gi Storage (GCE persistent disk)**: ~$1-2/mes
- **LoadBalancer IP**: ~$3/mes
- **Total aproximado**: $30-40/mes

Con créditos gratuitos de $300, esto representa **~8 meses de uso**.

### Importante
- **Eliminar el cluster cuando no lo uses**: `gcloud container clusters delete dwk-cluster --zone=europe-north1-b`
- Esto elimina todos los recursos y deja de generar costos

## Problemas Comunes

### "initdb: error: directory exists but is not empty"
**Solución**: Ya está implementada con `subPath: postgres`

### LoadBalancer IP permanece en <pending>
- Espera más tiempo (GCP puede tardar 5-10 minutos)
- Verifica: `kubectl describe svc pingpong-svc`
- Revisa cuotas de GCP: `gcloud compute project-info describe --project=<PROJECT_ID>`

### Pod de PostgreSQL no inicia
- Revisa logs: `kubectl logs statefulset/pingpong-db`
- Verifica PVC: `kubectl get pvc`
- Describe pod: `kubectl describe pod pingpong-db-0`

## Limpieza

### Eliminar el cluster
```bash
gcloud container clusters delete dwk-cluster --zone=europe-north1-b
```

Esto elimina:
- ✅ Todos los pods
- ✅ Todos los servicios (y sus LoadBalancers)
- ✅ Todos los PersistentVolumes
- ✅ Toda infraestructura de GKE

## Diferencias con k3d Local

| Aspecto | k3d Local | GKE |
|---|---|---|
| **Networking** | Docker bridge | VPC de Google Cloud |
| **Storage** | Local en nodos | Google Persistent Disk |
| **LoadBalancer** | NodePort simulado | IP pública real |
| **Costo** | $0 | $30-40/mes |
| **Escalabilidad** | Manual | Automática disponible |
| **Control plane** | Gestionado localmente | Gestionado por Google |

## Siguientes Pasos

En los próximos ejercicios exploraremos:
- Autoscaling automático en GKE
- Ingress en lugar de LoadBalancer
- Multi-región deployment
- CI/CD integration con GCP
