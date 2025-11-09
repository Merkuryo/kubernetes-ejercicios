# Ejercicio 4.7: Baby Steps to GitOps

## Objetivo

Implementar GitOps en un cluster de Kubernetes usando ArgoCD. La aplicación log-output se desplegará automáticamente cuando se hagan cambios en el repositorio.

## ¿Qué es GitOps?

GitOps es una metodología de operations donde:

1. **Git es la fuente de verdad**: Todo el estado del cluster está definido en Git
2. **Pull deployment (no push)**: El cluster tira cambios del repositorio, no CI/CD pushea
3. **Declarativo**: Se describe el estado deseado, no acciones imperativas
4. **Automático**: Cambios en Git → Sincronización automática al cluster
5. **Auditable**: Historial completo de cambios en Git

### Comparación: Push vs Pull

**Traditional Push (sin GitOps)**:
```
Developer → Git push
         ↓
      GitHub
         ↓
   GitHub Actions (CI/CD)
         ↓
  Builds & Tests image
         ↓
  Pushes to registry
         ↓
  PUSHES TO CLUSTER (no puede funcionar con clusters privados)
```

**GitOps Pull (recomendado)**:
```
Developer → Git push → GitHub
                            ↓
                    GitHub Actions
                            ↓
                    Builds image & 
                    Commits kustomization.yaml
                            ↓
                    Git repository
                            ↓
                    ArgoCD (cluster interno)
                            ↓
                    TIRA cambios del repo
                            ↓
                    Sincroniza cluster
```

**Ventajas del Pull**:
- ✅ Funciona con clusters privados (sin acceso externo)
- ✅ Sincronización automática
- ✅ Auditoría completa en Git
- ✅ Rollback fácil (revert commit)
- ✅ Mejor security (sin credenciales en CI/CD)
- ✅ Recuperación automática si pod crashea

## Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                   DEVELOPER WORKFLOW                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Developer modifies code → git push to main              │
│                                                             │
│  2. GitHub Actions workflow triggered:                      │
│     ├─ Checkout code                                        │
│     ├─ Build Docker image                                   │
│     ├─ Push image to Docker Hub                             │
│     ├─ Update kustomization.yaml with new image tag         │
│     └─ Commit kustomization.yaml to main                    │
│                                                             │
│  3. kustomization.yaml updated in Git                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  GIT REPOSITORY (Source of Truth)          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ejercicio4_7/manifests/                                    │
│  ├── deployment.yaml (image: PROJECT/IMAGE)                │
│  ├── service.yaml                                           │
│  └── kustomization.yaml (image tag auto-updated)            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                            ↑
                   (Continuously watched by)
                            │
┌─────────────────────────────────────────────────────────────┐
│              ARGOCD (Kubernetes cluster)                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  4. ArgoCD polls Git every 180 seconds (default)            │
│  5. Detects changes in kustomization.yaml                   │
│  6. Pulls image with new tag                                │
│  7. Applies to cluster                                      │
│  8. Pods auto-refresh with new version                      │
│  9. Cluster state matches Git state                         │
│                                                             │
│  ✅ Automated & Declarative Deployment                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Componentes

### 1. Manifests de Kubernetes (`manifests/`)

**deployment.yaml**: Define la aplicación log-output
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: log-output-dep
spec:
  replicas: 1
  selector:
    matchLabels:
      app: log-output
  template:
    spec:
      containers:
        - name: log-output
          image: PROJECT/IMAGE  # Placeholder
```

**service.yaml**: LoadBalancer para acceso externo
```yaml
apiVersion: v1
kind: Service
metadata:
  name: log-output
spec:
  selector:
    app: log-output
  ports:
    - port: 80
      targetPort: 8080
  type: LoadBalancer
```

**kustomization.yaml**: Define la imagen concreta (actualizada automáticamente)
```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - deployment.yaml
  - service.yaml
images:
  - name: PROJECT/IMAGE
    newName: username/log-output-gitops
    newTag: "abc123def456..."  # Git SHA (auto-actualizado)
```

### 2. GitHub Actions Workflow (`github-workflows/publish-log-output.yaml`)

Workflow que automáticamente:

1. **Build Docker image** con Git SHA como tag
   ```bash
   docker build -t username/log-output-gitops:abc123... .
   ```

2. **Push a Docker Hub**
   ```bash
   docker push username/log-output-gitops:abc123...
   ```

3. **Update kustomization.yaml** con nuevo tag
   ```bash
   kustomize edit set image PROJECT/IMAGE=username/log-output-gitops:abc123...
   ```

4. **Commit cambios a main**
   ```bash
   git commit -m "Build abc123: Update image to username/log-output-gitops:abc123..."
   git push
   ```

### 3. ArgoCD Application (`argocd/application.yaml`)

Define cómo ArgoCD sincroniza la aplicación:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: log-output-gitops
  namespace: argocd
spec:
  source:
    repoURL: https://github.com/Merkuryo/kubernetes-ejercicios
    path: ejercicio4_7/manifests
    targetRevision: main
  
  destination:
    server: https://kubernetes.default.svc  # Cluster actual
    namespace: default
  
  syncPolicy:
    automated:
      prune: true    # Borrar recursos que no están en Git
      selfHeal: true # Revertir cambios manuales que no están en Git
```

**syncPolicy options**:
- `automated`: Sincronización automática
- `prune: true`: Si se elimina de Git, se elimina del cluster
- `selfHeal: true`: Si alguien cambia algo en el cluster manualmente, revertir
- `CreateNamespace: true`: Crear namespace si no existe

## Instalación

### 1. Instalar ArgoCD

```bash
# Crear namespace
kubectl create namespace argocd

# Instalar ArgoCD
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# O usar el script proporcionado
bash argocd/install-argocd.sh
```

### 2. Acceso a ArgoCD

```bash
# Cambiar tipo a LoadBalancer (para acceso externo)
kubectl patch svc argocd-server -n argocd -p '{"spec": {"type": "LoadBalancer"}}'

# Obtener IP externa
kubectl get svc argocd-server -n argocd

# Obtener contraseña inicial
kubectl get secret -n argocd argocd-initial-admin-secret -o jsonpath='{.data.password}' | base64 -d

# Port-forward (alternativa si no tienes LoadBalancer)
kubectl port-forward -n argocd svc/argocd-server 8080:443
```

**Login ArgoCD**:
- URL: `https://<EXTERNAL_IP>` o `https://localhost:8080`
- Usuario: `admin`
- Contraseña: (la obtenida arriba)

### 3. Configurar GitHub Actions

GitHub Actions necesita permiso para escribir en el repositorio:

1. Ve a **Settings** → **Actions** → **General**
2. En "Workflow permissions" selecciona:
   - ✅ "Read and write permissions"
   - ✅ "Allow GitHub Actions to create and approve pull requests"

### 4. Crear Secrets en GitHub

Necesitas agregar tus credenciales de Docker:

1. Ve a **Settings** → **Secrets and variables** → **Actions**
2. Crea estos secrets:
   - `DOCKERHUB_USERNAME`: Tu usuario de Docker Hub
   - `DOCKERHUB_TOKEN`: Tu token de Docker Hub

```bash
# Para crear token en Docker Hub:
# 1. Docker Hub → Account settings → Security → New Access Token
# 2. Copiar el token
# 3. Agregarlo como secret en GitHub
```

### 5. Crear ArgoCD Application (opción 1: UI)

1. Abre ArgoCD UI
2. Click "New app"
3. Completa el formulario:
   - **Application name**: `log-output-gitops`
   - **Project**: `default`
   - **Repository URL**: `https://github.com/Merkuryo/kubernetes-ejercicios`
   - **Revision**: `main`
   - **Path**: `ejercicio4_7/manifests`
   - **Destination cluster**: `https://kubernetes.default.svc`
   - **Namespace**: `default`
4. En **Sync Policy**: Selecciona "Automatic"
   - ✅ Prune
   - ✅ Self Heal
5. Click "Create"

### 5. Crear ArgoCD Application (opción 2: kubectl)

```bash
kubectl apply -f argocd/application.yaml
```

Verificar:
```bash
kubectl get applications -n argocd
kubectl describe application log-output-gitops -n argocd
```

## Flujo de Trabajo Completo

### Paso 1: Developer hace cambios

```bash
# Modificar código de log-output
# Esto puede ser cualquier cambio en ejercicio4_7/

git add ejercicio4_7/
git commit -m "Update log-output app"
git push origin main
```

### Paso 2: GitHub Actions se ejecuta automáticamente

1. Workflow se dispara por `push` a `main` en `ejercicio4_7/**`
2. Checkout del código
3. Build imagen Docker
4. Push a Docker Hub
5. Update `kustomization.yaml` con nuevo tag
6. Commit cambios a `main`

```bash
# Ver ejecución del workflow
GitHub → Actions → workflows → publish-log-output.yaml
```

### Paso 3: ArgoCD sincroniza automáticamente

1. ArgoCD detecta cambios en `main`
2. Pull `kustomization.yaml` actualizado
3. Aplica cambios al cluster
4. Nuevos pods con nueva imagen

```bash
# Ver sincronización en ArgoCD
ArgoCD UI → log-output-gitops → Sync status → Application tree

# O en terminal
kubectl get pods -l app=log-output
kubectl logs -f deployment/log-output-dep
```

## Testing

### Escenario 1: Update image (normal flow)

```bash
# 1. Modificar Dockerfile o código
echo "# Updated" >> ejercicio4_7/Dockerfile

# 2. Push a main
git add ejercicio4_7/Dockerfile
git commit -m "Update log-output"
git push origin main

# 3. Ver workflow en GitHub Actions
# Esperar que termine (2-3 minutos)

# 4. Ver que kustomization.yaml se actualizó
git pull
cat ejercicio4_7/manifests/kustomization.yaml
# Debe mostrar nuevo tag

# 5. Ver sincronización en ArgoCD
kubectl get pods -l app=log-output
kubectl logs -f deployment/log-output-dep
```

### Escenario 2: Manual change (self-healing)

```bash
# 1. Cambiar replicas manualmente
kubectl scale deployment log-output-dep --replicas=3

# 2. ArgoCD detecta inconsistencia
# Esperar 180 segundos o forzar sync

# 3. ArgoCD revierte a 1 replica (según Git)
kubectl get deployment log-output-dep
# replicas: 1 (reverted automatically)
```

### Escenario 3: Git rollback

```bash
# 1. Si necesitas revertir
git revert HEAD
git push origin main

# 2. ArgoCD sincroniza automáticamente
# Nueva imagen será la anterior
```

## Archivos Generados

```
ejercicio4_7/
├── Dockerfile (log-output app)
├── manifests/
│   ├── deployment.yaml (image: PROJECT/IMAGE)
│   ├── service.yaml (LoadBalancer)
│   └── kustomization.yaml (auto-updated con nuevo tag)
├── github-workflows/
│   └── publish-log-output.yaml (Build → Push → Update Kustomization)
├── argocd/
│   ├── application.yaml (ArgoCD Application manifest)
│   └── install-argocd.sh (Script instalación)
└── README.md (Este archivo)
```

## Monitoreo

### Ver status de ArgoCD

```bash
# Ver aplicación
kubectl get application -n argocd

# Ver detalles
kubectl describe application log-output-gitops -n argocd

# Ver logs de ArgoCD
kubectl logs -f deployment/argocd-application-controller -n argocd

# Ver sincronización
kubectl logs -f deployment/argocd-repo-server -n argocd
```

### Ver aplicación desplegada

```bash
# Ver pods
kubectl get pods -l app=log-output

# Ver logs
kubectl logs -f deployment/log-output-dep

# Ver servicio
kubectl get svc log-output

# Acceder a la app
curl http://<EXTERNAL_IP>
```

### Ver workflow en GitHub

```
GitHub → Actions → publish-log-output.yaml → (latest run)
```

## Troubleshooting

### ArgoCD dice "OutOfSync"

```bash
# 1. Verificar que kustomization.yaml está actualizado
git log --oneline ejercicio4_7/manifests/kustomization.yaml

# 2. Forzar sincronización en ArgoCD UI o:
kubectl patch application log-output-gitops -n argocd \
  -p '{"status": {"lastComparisonResult": null}}'

# 3. Verificar que tienes acceso al repo
kubectl logs -f deployment/argocd-repo-server -n argocd
```

### Workflow no se ejecuta

```bash
# 1. Verificar que está en main
git branch

# 2. Verificar que cambio es en ejercicio4_7/
git diff HEAD~1

# 3. Ver logs de GitHub Actions
GitHub → Actions → publish-log-output.yaml

# Errores comunes:
# - No tienes secrets de Docker Hub configurados
# - Permisos de workflow no permiten push
```

### ArgoCD no sincroniza automáticamente

```bash
# 1. Verificar syncPolicy en application.yaml
kubectl get application log-output-gitops -n argocd -o yaml | grep -A 5 syncPolicy

# 2. Si está manual, cambiar a automático en UI o:
kubectl patch application log-output-gitops -n argocd \
  --type merge -p '{"spec":{"syncPolicy":{"automated":{"prune":true,"selfHeal":true}}}}'

# 3. Forzar sincronización manual
argocd app sync log-output-gitops
```

## Conceptos Clave

### Kustomize

Herramienta para customizar manifests YAML:

```yaml
# Base deployment con placeholder
image: PROJECT/IMAGE

# Kustomization actualiza dinámicamente
kustomize edit set image PROJECT/IMAGE=username/app:tag
```

### Sync Policies

| Policy | Comportamiento |
|--------|---|
| Manual | Requiere sync manual en ArgoCD UI |
| Automatic | Sincroniza automáticamente cambios en Git |
| Prune | Borra recursos del cluster que no están en Git |
| Self Heal | Revierte cambios manuales en el cluster |

### Queue Group (NATS) vs Queue Deployment (Kubernetes)

No confundir:
- **NATS Queue Group**: Múltiples consumers reciben mensajes sin duplicados
- **Kubernetes Queue Deployment**: ArgoCD automáticamente sincroniza

## Ventajas de GitOps

✅ **Single Source of Truth**: Todo en Git
✅ **Automatic Deployment**: Sin pipelines complejos
✅ **Audit Trail**: Historial completo de cambios
✅ **Easy Rollback**: Revert commit = revert deploy
✅ **Self Healing**: Cluster se corrige automáticamente
✅ **Works with Private Clusters**: Pull, no push
✅ **Disaster Recovery**: Reconstruir cluster desde Git
✅ **Team Collaboration**: Todos ven el mismo estado

## Próximos Pasos

- Ejercicio 4.8: GitOps con múltiples aplicaciones
- Ejercicio 4.9: GitOps con secrets
- Ejercicio 4.10: ArgoCD ApplicationSet para multi-tenancy

## Referencias

- [ArgoCD Documentation](https://argo-cd.readthedocs.io/)
- [GitOps Principles](https://www.gitops.tech/)
- [Kustomize](https://kustomize.io/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

## Resumen

Este ejercicio implementa un flujo **push (developer) → pull (ArgoCD)** donde:

1. **Developer** modifica código y hace `git push`
2. **GitHub Actions** build imagen y actualiza `kustomization.yaml`
3. **ArgoCD** detecta cambios y sincroniza al cluster
4. **Cluster** automáticamente se actualiza

Todo está declarado en Git, auditable, versionado y puede recuperarse fácilmente.

**GitOps = Infrastructure as Code + Git = Declarative cluster management** ✅
