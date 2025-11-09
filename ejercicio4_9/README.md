# Exercise 4.9: The Project - Multi-environment Setup with Kustomize

## Objetivo

Implementar un setup de **múltiples ambientes** (staging y production) para "The Project" utilizando **Kustomize overlays** y **ArgoCD**, donde:

- **Staging**: Sincroniza automáticamente en cada commit a `main`
- **Production**: Sincroniza solo en commits etiquetados con `stable`

Cada ambiente tiene configuraciones específicas:

### Staging
- 1 replica del backend
- 1 replica del broadcaster
- Broadcaster **solo registra eventos en stdout** (sin enviar a servicios externos)
- Base de datos **sin backup**
- Namespace: `staging`

### Production
- 3 replicas del backend
- 6 replicas del broadcaster
- Broadcaster **envía eventos a Discord, Telegram, Slack**
- Base de datos **con CronJob de backup automático** (diario a las 2 AM)
- Namespace: `production`

## Arquitectura

### Estructura de Kustomize

```
ejercicio4_9/
├── base/                           # Configuración común a todos los ambientes
│   ├── backend/
│   │   ├── deployment.yaml        # Definición del deployment
│   │   ├── service.yaml           # Servicio ClusterIP
│   │   └── kustomization.yaml     # Imagen por defecto: mluukkai/dwk-app6-api:stable
│   ├── postgres/
│   │   ├── postgres.yaml          # StatefulSet + Secret + ConfigMap
│   │   └── kustomization.yaml
│   ├── ping-pong/
│   │   ├── deployment.yaml        # Deployment + Service inline
│   │   └── kustomization.yaml
│   ├── log-output/
│   │   ├── deployment.yaml        # Deployment + LoadBalancer
│   │   └── kustomization.yaml
│   ├── broadcaster/
│   │   ├── deployment.yaml        # Deployment base
│   │   └── kustomization.yaml
│   └── kustomization.yaml         # Agrupa todos los componentes
│
└── overlays/                        # Configuraciones específicas por ambiente
    ├── staging/
    │   ├── broadcaster-patch.yaml  # LOG_ONLY=true
    │   └── kustomization.yaml      # Parcha base + namespace staging
    └── prod/
        ├── backend-patch.yaml       # 3 replicas
        ├── broadcaster-patch.yaml   # 6 replicas, LOG_ONLY=false
        ├── postgres-backup.yaml     # CronJob de backup
        └── kustomization.yaml       # Parcha base + namespace production + backup
```

### Flujo GitOps Multi-ambiente

```
┌──────────────────────────────────────┐
│ Developer push a main                │
│ git commit && git push origin main   │
└──────────────────────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────┐
│ GitHub Actions Workflow              │
├──────────────────────────────────────┤
│ 1. Build backend image (SHA tag)     │
│ 2. Push a Docker Hub                 │
│ 3. Update overlays/staging/          │
│    kustomization.yaml con SHA        │
│ 4. Commit cambios a main             │
└──────────────────────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────┐
│ Git Repository (main branch)         │
├──────────────────────────────────────┤
│ overlays/staging/kustomization.yaml  │
│ (image tag = SHA)                    │
└──────────────────────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────┐
│ ArgoCD Application: staging          │
│ (watches main, path overlays/staging)│
│ syncPolicy: automated                │
└──────────────────────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────┐
│ Kubernetes Cluster                   │
├──────────────────────────────────────┤
│ Namespace: staging                   │
│ ├─ staging-backend-dep (1 replica)   │
│ ├─ staging-broadcaster-dep (1 rep)   │
│ ├─ staging-postgres (StatefulSet)    │
│ ├─ staging-ping-pong-dep             │
│ └─ staging-log-output-dep            │
│                                      │
│ TODOS SOLO REGISTRAN EN STDOUT       │
│ SIN BACKUP DE BD                     │
└──────────────────────────────────────┘
```

```
┌──────────────────────────────────────┐
│ Developer crea TAG STABLE            │
│ git tag stable && git push --tags    │
└──────────────────────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────┐
│ GitHub Actions Workflow              │
├──────────────────────────────────────┤
│ 1. Build backend image (SHA tag)     │
│ 2. Push a Docker Hub                 │
│ 3. Update overlays/prod/             │
│    kustomization.yaml con SHA        │
│ 4. Commit cambios a main             │
└──────────────────────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────┐
│ Git Repository (stable tag ref)      │
├──────────────────────────────────────┤
│ overlays/prod/kustomization.yaml     │
│ (image tag = SHA)                    │
└──────────────────────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────┐
│ ArgoCD Application: production       │
│ (watches stable tag, overlays/prod)  │
│ syncPolicy: automated                │
└──────────────────────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────┐
│ Kubernetes Cluster                   │
├──────────────────────────────────────┤
│ Namespace: production                │
│ ├─ prod-backend-dep (3 replicas)     │
│ ├─ prod-broadcaster-dep (6 replicas) │
│ ├─ prod-postgres (StatefulSet)       │
│ ├─ prod-ping-pong-dep                │
│ ├─ prod-log-output-dep               │
│ └─ prod-postgres-backup (CronJob)    │
│                                      │
│ BROADCASTER ENVIA A SERVICIOS EXTERNOS│
│ BD CON BACKUP AUTOMÁTICO (2 AM UTC)  │
└──────────────────────────────────────┘
```

## Componentes Clave

### Base Deployment (backend/deployment.yaml)

```yaml
spec:
  replicas: 1  # Será parchado por overlays
  containers:
    - env:
        - name: NATS_URL
          value: "nats://nats-server:4222"
        - name: LOG_ONLY  # Variable que controla comportamiento
          value: "false"   # Será true en staging
```

### Overlay Staging (overlays/staging/kustomization.yaml)

```yaml
patches:
  - target:
      kind: Deployment
      name: broadcaster-dep
    patch: |-
      - op: replace
        path: /spec/template/spec/containers/0/env/5/value
        value: "true"  # LOG_ONLY=true: solo stdout

namespace: staging
namePrefix: staging-
```

### Overlay Production (overlays/prod/kustomization.yaml)

```yaml
resources:
  - ../../base
  - postgres-backup.yaml  # CronJob adicional

patches:
  - target:
      kind: Deployment
      name: backend-dep
    patch: |-
      - op: replace
        path: /spec/replicas
        value: 3

  - target:
      kind: Deployment
      name: broadcaster-dep
    patch: |-
      - op: replace
        path: /spec/replicas
        value: 6

namespace: production
namePrefix: prod-
```

### CronJob de Backup (overlays/prod/postgres-backup.yaml)

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: postgres-backup
spec:
  schedule: "0 2 * * *"  # Diariamente a las 2 AM UTC
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - command:
                - /bin/sh
                - -c
                - |
                  PGPASSWORD=$POSTGRES_PASSWORD pg_dump \
                    -h postgres-svc -U $POSTGRES_USER $POSTGRES_DB > \
                    /backups/dump-$(date +%Y-%m-%d-%H-%M-%S).sql
              volumeMounts:
                - name: backup-storage
                  mountPath: /backups
```

### ArgoCD Applications (argocd/applications.yaml)

```yaml
---
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: the-project-staging
  namespace: argocd
spec:
  source:
    repoURL: https://github.com/Merkuryo/kubernetes-ejercicios
    path: ejercicio4_9/overlays/staging
    targetRevision: main  # Sincroniza en cada cambio a main
  destination:
    namespace: staging
  syncPolicy:
    automated:
      prune: true      # Elimina recursos no en Git
      selfHeal: true   # Revierte cambios manuales
---
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: the-project-production
  namespace: argocd
spec:
  source:
    repoURL: https://github.com/Merkuryo/kubernetes-ejercicios
    path: ejercicio4_9/overlays/prod
    targetRevision: stable  # Sincroniza en el tag 'stable'
  destination:
    namespace: production
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

## Instalación

### 1. Prerequisitos

```bash
# Asegurar que kubectl está configurado
kubectl cluster-info

# Asegurar que Helm está instalado
helm version

# Asegurar que Kustomize está disponible
kustomize version
```

### 2. Instalación de ArgoCD

```bash
# Usar el script de deployment
cd ejercicio4_9/argocd
chmod +x deploy.sh
./deploy.sh
```

O manualmente:

```bash
# Crear namespace argocd
kubectl create namespace argocd

# Instalar ArgoCD
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Patchear para LoadBalancer
kubectl patch svc argocd-server -n argocd -p '{"spec": {"type": "LoadBalancer"}}'

# Crear namespaces
kubectl create namespace staging
kubectl create namespace production

# Crear secrets (IMPORTANTE: aplicar antes que ArgoCD)
# Los secretos DEBEN existir antes de que los pods intenten usarlos
kubectl create secret generic postgres-credentials \
  --from-literal=username=postgres \
  --from-literal=password=postgres \
  -n staging

kubectl create secret generic postgres-credentials \
  --from-literal=username=postgres \
  --from-literal=password=postgres \
  -n production

# Si usas servicios externos en production
kubectl create secret generic external-services \
  --from-literal=discord_url=https://discord.com/api/webhooks/... \
  --from-literal=telegram_token=... \
  --from-literal=slack_url=https://hooks.slack.com/services/... \
  -n production

# Instalar NATS
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update

helm install nats bitnami/nats \
  --namespace staging \
  --set auth.enabled=false

helm install nats bitnami/nats \
  --namespace production \
  --set auth.enabled=false

# Crear aplicaciones ArgoCD
kubectl apply -f ./applications.yaml
```

### 3. Obtener acceso a ArgoCD

```bash
# Port forward (alternativa a LoadBalancer)
kubectl port-forward svc/argocd-server -n argocd 8080:443

# Obtener contraseña inicial
kubectl -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath="{.data.password}" | base64 -d

# Cambiar contraseña
argocd login localhost:8080
argocd account update-password
```

Acceder a: `https://localhost:8080` (o IP de LoadBalancer)

## GitHub Actions Workflow

El workflow `publish-multi-env.yaml` se ejecuta cuando:

1. **Push a main** con cambios en `ejercicio4_9/`
   - Build backend image
   - Update `overlays/staging/kustomization.yaml`
   - Commit cambios a main
   - ArgoCD detecta y sincroniza a staging en 180s

2. **Push de tag `stable`**
   - Build backend image
   - Update `overlays/prod/kustomization.yaml`
   - Commit cambios a main
   - ArgoCD detecta y sincroniza a production en 180s

Nota: El tag debe ser exactamente `stable` (puede ser `v1.0.0-stable` o solo `stable`)

## Flujo de Trabajo Práctico

### Deploy a Staging

```bash
# 1. Realizar cambios en código
vi ejercicio4_9/backend/src/index.js

# 2. Hacer commit y push a main
git add ejercicio4_9/backend/
git commit -m "feat: Update backend API"
git push origin main

# 3. GitHub Actions ejecuta automáticamente
# Esperar 2-3 minutos para que build y push complete

# 4. ArgoCD sincroniza (máximo 180 segundos)
# Ver en ArgoCD UI: the-project-staging app

# 5. Verificar deployment en staging
kubectl get pods -n staging
kubectl logs -f deployment/staging-backend-dep -n staging
```

### Promote a Production

```bash
# 1. Crear tag 'stable'
git tag stable

# 2. Push tag
git push origin stable

# 3. GitHub Actions ejecuta automáticamente
# Build con el mismo SHA, update prod overlay

# 4. ArgoCD sincroniza a production namespace
# Ver en ArgoCD UI: the-project-production app

# 5. Verificar 3 replicas en production
kubectl get pods -n production
kubectl logs -f deployment/prod-backend-dep -n production --all-containers=true | head -30
```

## Testing Scenarios

### Scenario 1: Cambios locales a staging

```bash
# Modificar backend
echo 'console.log("STAGING UPDATE");' >> ejercicio4_9/backend/src/index.js

# Commit y push
git add ejercicio4_9/backend/
git commit -m "test: Add logging"
git push origin main

# Esperar 2-3 minutos (GitHub Actions)
# Esperar max 180s (ArgoCD)

# Verificar logs en staging
kubectl logs -f deployment/staging-backend-dep -n staging

# Ver que NO está en production
kubectl logs -f deployment/prod-backend-dep -n production
# (No verá el cambio)
```

### Scenario 2: Staging broadcaster solo logs

```bash
# Crear un TODO en staging
curl -X POST http://staging-backend-svc/todos \
  -H "Content-Type: application/json" \
  -d '{"content": "Test"}'

# Ver logs del broadcaster en staging
kubectl logs -f deployment/staging-broadcaster-dep -n staging
# Output: {"type": "created", "todo": {...}, "timestamp": "..."}

# Verificar que NO se envía a Discord, Telegram, Slack
# (Mirar logs del broadcaster para confirmar LOG_ONLY=true)

# Comparar con production broadcaster
kubectl logs -f deployment/prod-broadcaster-dep -n production
# Output: Intentará enviar a servicios externos
```

### Scenario 3: Backup en production

```bash
# Ver el CronJob en production
kubectl get cronjob -n production
# prod-postgres-backup

# Ver runs anteriores
kubectl get jobs -n production

# Ver logs de un backup
kubectl logs -f job/<job-name> -n production

# El backup ocurre diariamente a las 2 AM UTC
```

### Scenario 4: Rollback rápido

```bash
# Si algo falla en production, revertir es fácil
# Opción 1: Revert el commit
git revert HEAD
git push origin main  # Desaplicar a staging
# (seguir con git tag stable para prod)

# Opción 2: Revert el tag
git tag -d stable
git push origin :stable
git tag stable HEAD~1  # Apuntar a commit anterior
git push origin stable

# ArgoCD sincroniza automáticamente
kubectl get pods -n production -w
```

## Diferencias Base vs Overlays

### Base

- Definiciones comunes a todos los ambientes
- Imágenes con tag `stable` (default)
- 1 replica por defecto
- Sin CronJobs
- LOG_ONLY=false por defecto

### Overlay Staging

- Sincroniza de `main` branch
- 1 replica backend
- 1 replica broadcaster
- Broadcaster: LOG_ONLY=true
- Namespace: `staging`
- namePrefix: `staging-`

### Overlay Production

- Sincroniza de `stable` tag
- 3 replicas backend (alta disponibilidad)
- 6 replicas broadcaster (load distribution)
- Broadcaster: LOG_ONLY=false (envía a externos)
- PostgreSQL + CronJob de backup
- Namespace: `production`
- namePrefix: `prod-`

## Configuración de Secrets

Los secretos **NO se incluyen en Git** (por seguridad).

Deben aplicarse manualmente antes de que ArgoCD cree los pods:

```bash
# Postgres credentials (igual en ambos ambientes)
kubectl create secret generic postgres-credentials \
  --from-literal=username=postgres \
  --from-literal=password=tu_password_seguro \
  -n staging

kubectl create secret generic postgres-credentials \
  --from-literal=username=postgres \
  --from-literal=password=tu_password_seguro \
  -n production

# Servicios externos (solo en production)
kubectl create secret generic external-services \
  --from-literal=discord_url=https://discord.com/api/webhooks/... \
  --from-literal=telegram_token=123456:abcdef \
  --from-literal=slack_url=https://hooks.slack.com/services/... \
  -n production
```

## Ventajas de esta Arquitectura

### ✅ Single Source of Truth
- Git es la fuente única de verdad
- Histórico completo de cambios
- Auditoría: quién, qué, cuándo

### ✅ Ambiente Staging para Testing
- Cada commit automáticamente en staging
- Testing de cambios antes de production
- Sin riesgo

### ✅ Production Control
- Solo tags promotan a production
- Control explícito sobre qué versión corre
- Rollback fácil vía git

### ✅ Environment-Specific Configuration
- Diferentes replicas, backups, webhooks por ambiente
- Minimal copy-paste (todo en base/)
- DRY: Don't Repeat Yourself

### ✅ Declarative & Reproducible
- Desastre: spin up nuevo cluster
- git clone + kubectl apply = cluster restaurado
- No existe "servidor de producción secreto"

### ✅ Self-Healing & Auto-Sync
- Cambio manual revertido automáticamente
- Pod crashea: auto-recreado
- Cluster siempre = Git

## Troubleshooting

### Los pods en staging no están sincronizando

```bash
# Verificar aplicación ArgoCD
kubectl get application the-project-staging -n argocd -o yaml

# Ver eventos de la aplicación
kubectl describe application the-project-staging -n argocd

# Verificar que el namespace existe
kubectl get namespace staging

# Verificar secrets
kubectl get secrets -n staging
```

### El broadcaster en staging sigue enviando mensajes

```bash
# Verificar que LOG_ONLY=true está seteado
kubectl get deployment staging-broadcaster-dep -n staging -o yaml | grep -A 30 "env:"

# Si no está, force sync en ArgoCD UI o:
kubectl delete pod -l app=broadcaster -n staging
# ArgoCD lo recreará con la configuración correcta
```

### El backup en production no corre

```bash
# Verificar CronJob
kubectl get cronjob -n production

# Verificar schedule
kubectl get cronjob prod-postgres-backup -n production -o yaml

# Crear job manual para testing
kubectl create job --from=cronjob/prod-postgres-backup manual-backup -n production

# Ver logs
kubectl logs -f job/manual-backup -n production
```

### GitHub Actions falla

```bash
# Verificar logs del workflow
GitHub → Actions → publish-multi-env.yaml

# Verificar que los secrets están definidos
Settings → Secrets → Verificar GCP_SA_KEY

# Verificar que el Dockerfile existe
ejercicio4_9/backend/Dockerfile

# Verificar credenciales Docker
gcloud auth configure-docker europe-north1-docker.pkg.dev
```

## Extensiones Posibles

1. **Multi-region**
   - Overlay para cada región (us-east, eu-west, etc)
   - Diferentes providers de cloud

2. **Canary Deployments**
   - Argo Rollouts en production
   - 10% → 50% → 100% traffic shift

3. **Feature Flags**
   - ConfigMap por ambiente
   - Backend lee flags desde ConfigMap

4. **Secrets Encriptados**
   - Sealed Secrets o External Secrets
   - Secrets en Git pero encriptados

5. **ArgoCD Notifications**
   - Slack/email en cada deploy
   - Alertas en failed syncs

## Archivos Creados

```
ejercicio4_9/
├── base/
│   ├── backend/
│   │   ├── deployment.yaml
│   │   ├── service.yaml
│   │   └── kustomization.yaml
│   ├── broadcaster/
│   │   ├── deployment.yaml
│   │   └── kustomization.yaml
│   ├── postgres/
│   │   ├── postgres.yaml
│   │   └── kustomization.yaml
│   ├── ping-pong/
│   │   ├── deployment.yaml
│   │   └── kustomization.yaml
│   ├── log-output/
│   │   ├── deployment.yaml
│   │   └── kustomization.yaml
│   └── kustomization.yaml
├── overlays/
│   ├── staging/
│   │   ├── broadcaster-patch.yaml
│   │   └── kustomization.yaml
│   └── prod/
│       ├── backend-patch.yaml
│       ├── broadcaster-patch.yaml
│       ├── postgres-backup.yaml
│       └── kustomization.yaml
├── backend/
│   ├── src/
│   │   └── index.js
│   ├── Dockerfile
│   └── package.json
├── github-workflows/
│   └── publish-multi-env.yaml
├── argocd/
│   ├── applications.yaml
│   └── deploy.sh
└── README.md
```

## Referencias

- [Kustomize Overlays](https://kubernetes.io/docs/tasks/manage-kubernetes-objects/declarative-config/#composing-object-configurations)
- [ArgoCD Applications](https://argo-cd.readthedocs.io/en/stable/operator-manual/declarative-setup/#applications)
- [GitOps Principles](https://www.gitops.tech/)
- [Kustomize Patches](https://kubectl.docs.kubernetes.io/references/kustomize/api-fields/commonlabelandannotation/)
