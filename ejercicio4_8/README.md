# Exercise 4.8: The Project Step 24 - GitOps

## Objective

Mover "The Project" (backend + ping-pong + log-output + postgres) a GitOps.

Cuando se hace commit al repositorio, todas las aplicaciones se desplieguan automáticamente en el cluster.

## Arquitectura GitOps para The Project

```
DEVELOPER WORKFLOW:
─────────────────
1. Developer modifica código en ejercicio4_8/
   (backend, ping-pong, log-output, docker files)

2. git push origin main

3. GitHub Actions triggered
   │
   ├─ Build backend image
   ├─ Push to Docker Hub
   ├─ Update backend/manifests/kustomization.yaml
   ├─ Commit cambios a main
   └─ (Extensible para ping-pong y log-output)

4. Git repository updated
   │
   ├─ kustomization.yaml con nuevo tag del backend
   ├─ Histórico completo de cambios
   └─ Main branch = Fuente de Verdad

5. ArgoCD (dentro del cluster)
   │
   ├─ Polls main cada 180s
   ├─ Detecta cambios en kustomization.yaml
   ├─ Sincroniza 4 aplicaciones:
   │  ├─ the-project-postgres
   │  ├─ the-project-backend
   │  ├─ the-project-ping-pong
   │  └─ the-project-log-output
   └─ Estado del cluster = Estado de Git
```

## Componentes

### 1. Backend (`backend/`)

**Node.js Express API** que maneja TODOs

**Dockerfile**: Multi-stage build (node:20-alpine)

**Manifests**:
- `deployment.yaml`: Backend app con env vars de PostgreSQL
- `service.yaml`: ClusterIP para comunicación interna
- `kustomization.yaml`: Auto-actualizado por GitHub Actions con nuevo tag

### 2. Ping-Pong (`ping-pong/`)

**Simple Node.js server** que logs ping-pong

**Manifests**:
- `deployment.yaml`: Ping-pong app + service
- `kustomization.yaml`: Placeholder para image updates

### 3. Log-Output (`log-output/`)

**Ubuntu container** que logs timestamps

**Manifests**:
- `deployment.yaml`: Log-output app + LoadBalancer service
- `kustomization.yaml`: Placeholder para image updates

### 4. PostgreSQL (`postgres/`)

**StatefulSet** para persistencia

**Manifests**:
- `postgres.yaml`: Secret + Service + StatefulSet + ConfigMap
- `kustomization.yaml`: Sin updates de imagen

### 5. GitHub Actions Workflow (`github-workflows/publish-the-project.yaml`)

Cuando se hace push a main en ejercicio4_8/**:

```yaml
Steps:
1. Checkout código
2. Setup Docker Buildx
3. Login a Docker Hub
4. Build y push backend image con tag SHA
5. Setup Kustomize
6. Update kustomization.yaml con nuevo tag
7. Commit cambios a main
```

**Nota**: El workflow es extensible para ping-pong y log-output.

### 6. ArgoCD Applications (`argocd/applications.yaml`)

4 ArgoCD Applications sincronizadas automáticamente:

```yaml
1. the-project-postgres
   - Path: ejercicio4_8/postgres/manifests
   - Sync: Automatic

2. the-project-backend
   - Path: ejercicio4_8/backend/manifests
   - Sync: Automatic

3. the-project-ping-pong
   - Path: ejercicio4_8/ping-pong/manifests
   - Sync: Automatic

4. the-project-log-output
   - Path: ejercicio4_8/log-output/manifests
   - Sync: Automatic
```

**Propiedades**:
- `automated.prune: true` → Borra recursos si se eliminan de Git
- `automated.selfHeal: true` → Revierte cambios manuales
- `syncOptions.CreateNamespace: true` → Crea namespace si no existe

## Instalación

### 1. Instalar ArgoCD

```bash
# Crear namespace
kubectl create namespace argocd

# Instalar ArgoCD
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# O usar el script
bash argocd/deploy.sh
```

### 2. Configurar acceso a ArgoCD

```bash
# Cambiar a LoadBalancer
kubectl patch svc argocd-server -n argocd -p '{"spec": {"type": "LoadBalancer"}}'

# Obtener IP
kubectl get svc argocd-server -n argocd

# Obtener contraseña
kubectl get secret -n argocd argocd-initial-admin-secret -o jsonpath='{.data.password}' | base64 -d
```

### 3. Configurar GitHub Actions Secrets

En **Settings → Secrets and variables → Actions**:

- `DOCKERHUB_USERNAME`: Tu usuario de Docker Hub
- `DOCKERHUB_TOKEN`: Tu token de Docker Hub

### 4. Habilitar permisos de workflow

En **Settings → Actions → General**:
- ✅ "Read and write permissions"
- ✅ "Allow GitHub Actions to create and approve pull requests"

### 5. Deploy The Project via ArgoCD

```bash
# Crear las 4 aplicaciones
kubectl apply -f argocd/applications.yaml

# O:
bash argocd/deploy.sh
```

Verificar:
```bash
kubectl get applications -n argocd
kubectl get pods
```

## Flujo de Trabajo Completo

### Cambio 1: Backend

```bash
# 1. Modificar backend
vi ejercicio4_8/backend/src/index.js

# 2. Commit y push
git add ejercicio4_8/backend/
git commit -m "Update backend logic"
git push origin main

# 3. GitHub Actions ejecuta
# GitHub → Actions → publish-the-project.yaml

# 4. Build y push image
# docker build -t username/the-project-backend:SHA .
# docker push

# 5. Update kustomization.yaml
# kustomize edit set image PROJECT/BACKEND=username/the-project-backend:SHA

# 6. Commit cambios
# git commit -m "Build SHA: Update backend image"

# 7. Git updated
cat ejercicio4_8/backend/manifests/kustomization.yaml
# newTag: "abc123def456..."

# 8. ArgoCD detecta cambios (máximo 180s)
# Sincroniza nuevos pods con nueva imagen
```

### Cambio 2: PostgreSQL (sin actualización de imagen)

```bash
# 1. Modificar schema de DB
# vi ejercicio4_8/postgres/manifests/postgres.yaml

# 2. Commit y push
git add ejercicio4_8/postgres/
git commit -m "Update postgres schema"
git push origin main

# 3. GitHub Actions NO se ejecuta (postgres no tiene dockerfile)
# Pero cambios están en Git

# 4. ArgoCD detecta cambios en postgres/manifests
# Sincroniza automáticamente

# 5. PostgreSQL StatefulSet se actualiza
```

### Manual Rollback

```bash
# 1. Si necesitas revertir
git log --oneline ejercicio4_8/backend/manifests/kustomization.yaml

# 2. Revertir commit
git revert <commit>
git push origin main

# 3. GitHub Actions actualiza kustomization.yaml
# 4. ArgoCD sincroniza con versión anterior
```

## Testing

### 1. Verificar Instalación

```bash
# Ver aplicaciones
kubectl get applications -n argocd
kubectl describe application the-project-backend -n argocd

# Ver pods
kubectl get pods

# Ver servicios
kubectl get svc
```

### 2. Probar Backend

```bash
# Port-forward
kubectl port-forward svc/backend 3000:3000

# Crear TODO
curl -X POST http://localhost:3000/todos \
  -H "Content-Type: application/json" \
  -d '{"content": "Test"}'

# Obtener TODOs
curl http://localhost:3000/todos
```

### 3. Probar cambios automáticos

```bash
# 1. Modificar backend
echo "# Updated" >> ejercicio4_8/backend/Dockerfile

# 2. Commit y push
git add ejercicio4_8/backend/Dockerfile
git commit -m "Update"
git push origin main

# 3. Ver workflow
GitHub → Actions → publish-the-project.yaml

# 4. Esperar a que termine (2-3 minutos)

# 5. Ver que kustomization.yaml se actualizó
git pull
cat ejercicio4_8/backend/manifests/kustomization.yaml

# 6. Ver en ArgoCD UI
# ArgoCD → the-project-backend → Sync status

# 7. Verificar que pods se actualizaron
kubectl get pods
kubectl logs -f deployment/backend-dep
```

### 4. Probar self-healing

```bash
# 1. Cambiar replicas manualmente
kubectl scale deployment backend-dep --replicas=3

# 2. Ver replicas
kubectl get deployment backend-dep
# replicas: 3

# 3. Esperar 180s para que ArgoCD sincronice

# 4. Ver que revertió a 1 replica (según kustomization.yaml)
kubectl get deployment backend-dep
# replicas: 1 (reverted by ArgoCD)
```

## Archivos Creados

```
ejercicio4_8/
├── backend/
│   ├── src/
│   │   └── index.js (Node.js Express API)
│   ├── Dockerfile
│   ├── package.json
│   └── manifests/
│       ├── deployment.yaml
│       ├── service.yaml
│       └── kustomization.yaml (auto-updated)
├── ping-pong/
│   └── manifests/
│       ├── deployment.yaml (+ inline service)
│       └── kustomization.yaml
├── log-output/
│   └── manifests/
│       ├── deployment.yaml (+ inline service)
│       └── kustomization.yaml
├── postgres/
│   └── manifests/
│       ├── postgres.yaml (Secret + Service + StatefulSet)
│       └── kustomization.yaml
├── github-workflows/
│   └── publish-the-project.yaml (Build backend, update kustomization)
├── argocd/
│   ├── applications.yaml (4 ArgoCD Applications)
│   └── deploy.sh (Installation script)
└── README.md (Este archivo)
```

## Monitoreo

### ArgoCD UI

```bash
# Port-forward (si no tienes LoadBalancer)
kubectl port-forward -n argocd svc/argocd-server 8080:443

# URL
https://localhost:8080 (o LoadBalancer IP)
```

**En ArgoCD UI**:
- Ver los 4 applications
- Ver sync status
- Ver application tree (pods, deployments, services)
- Ver logs de sincronización

### Logs

```bash
# ArgoCD application controller
kubectl logs -f deployment/argocd-application-controller -n argocd

# ArgoCD repo server
kubectl logs -f deployment/argocd-repo-server -n argocd

# Backend
kubectl logs -f deployment/backend-dep

# PostgreSQL
kubectl logs -f statefulset/postgres
```

## Ventajas de GitOps para The Project

✅ **Single Source of Truth**: Todo en Git
✅ **Consistency**: Todos los ambientes iguales
✅ **Traceability**: Historial completo de cambios
✅ **Disaster Recovery**: Reconstruir desde Git
✅ **Rollback**: Git revert = cluster revert
✅ **Scaling**: Git push = aplicación escalada
✅ **Security**: No credentials en CI/CD, solo Git
✅ **Automation**: Sin pasos manuales
✅ **Team Collaboration**: Git pull requests para cambios

## Troubleshooting

### ArgoCD dice "OutOfSync"

```bash
# 1. Verificar que manifests están en Git
git status

# 2. Forzar sincronización
kubectl patch application the-project-backend -n argocd \
  -p '{"status": {"lastComparisonResult": null}}'

# 3. Ver logs de ArgoCD
kubectl logs -f deployment/argocd-repo-server -n argocd
```

### Workflow no se ejecuta

```bash
# 1. Verificar que estás en main
git branch

# 2. Verificar que cambio es en ejercicio4_8/
git diff HEAD~1 --name-only

# 3. Ver logs en GitHub
GitHub → Actions → publish-the-project.yaml

# Errores comunes:
# - No tienes Docker Hub secrets
# - Permisos de workflow insuficientes
# - Imagen no pudo buildear
```

### Pods no se actualizan

```bash
# 1. Verificar que kustomization.yaml tiene nuevo tag
cat ejercicio4_8/backend/manifests/kustomization.yaml

# 2. Verificar que ArgoCD sincronizó
kubectl describe application the-project-backend -n argocd

# 3. Forzar image pull
kubectl rollout restart deployment backend-dep

# 4. Ver logs
kubectl logs -f deployment/backend-dep
```

## Extensión: Agregar ping-pong y log-output a Workflow

Actualmente el workflow solo actualiza backend. Para agregar ping-pong y log-output:

```yaml
# En publish-the-project.yaml, después del backend:

- name: Build and push ping-pong image
  uses: docker/build-push-action@v5
  with:
    context: ./ejercicio4_8/ping-pong
    push: true
    tags: |
      ${{ secrets.DOCKERHUB_USERNAME }}/the-project-ping-pong:${{ github.sha }}
      ${{ secrets.DOCKERHUB_USERNAME }}/the-project-ping-pong:latest

- name: Update ping-pong kustomization
  run: |
    cd ${{ github.workspace }}/ejercicio4_8/ping-pong/manifests
    kustomize edit set image PROJECT/PING_PONG=${{ secrets.DOCKERHUB_USERNAME }}/the-project-ping-pong:${{ github.sha }}

# Similar para log-output...
```

## Próximos Pasos

- Ejercicio 4.9: GitOps con Secrets (sealed-secrets, external-secrets)
- Ejercicio 4.10: Múltiples ambientes con Kustomization bases
- Ejercicio 4.11: ArgoCD ApplicationSet para multi-tenancy
- Ejercicio 4.12: Metrics y alertas de ArgoCD

## Referencias

- [ArgoCD Docs](https://argo-cd.readthedocs.io/)
- [GitOps Best Practices](https://www.gitops.tech/)
- [Kustomize](https://kustomize.io/)
- [GitHub Actions](https://docs.github.com/en/actions)

## Resumen

Este ejercicio implementa GitOps completo para The Project:

1. **Developer** modifica código → git push
2. **GitHub Actions** build & update Git
3. **Git** contiene fuente de verdad (main branch)
4. **ArgoCD** tira cambios y sincroniza cluster
5. **Cluster** automáticamente se actualiza

**GitOps = Declarative + Versionado + Auditable + Automático** ✅
