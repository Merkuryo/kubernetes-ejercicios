# Exercise 4.10: The Project - Grande Finale (Separate Repos Pattern)

## Objective

Finalize the project setup by implementing the **GitOps best practice**: separating **code repository** and **configuration repository**.

- **App Repository** (`kubernetes-ejercicios`): Contains application code (backend source)
- **Config Repository** (`kubernetes-ejercicios-config`): Contains Kubernetes manifests and overlays

This separation ensures:
- ✅ **Concerns separated**: Developers manage code, DevOps manages infrastructure
- ✅ **Independent versioning**: Code and config can be versioned separately
- ✅ **Better security**: Config repo can have different access controls
- ✅ **Scalability**: Multiple apps can reference same config repo patterns
- ✅ **Industry standard**: Used by companies like Google, Netflix, Uber

## Architecture Overview

### Repository Separation

```
┌─────────────────────────────────────────────────────────────────┐
│ kubernetes-ejercicios (APP REPOSITORY)                          │
│ github.com/Merkuryo/kubernetes-ejercicios                       │
├─────────────────────────────────────────────────────────────────┤
│ ├── ejercicio4_10/                                              │
│ │   └── backend/                                                │
│ │       ├── src/index.js        (APPLICATION CODE)              │
│ │       ├── Dockerfile                                          │
│ │       └── package.json                                        │
│ │                                                               │
│ └── github-workflows/                                            │
│     └── publish-separate-repos.yaml                             │
│        (1. Build backend image                                 │
│         2. Clone config repo                                   │
│         3. Update image tag in config repo                     │
│         4. Push to config repo)                                │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    GitHub Actions Workflow
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ kubernetes-ejercicios-config (CONFIG REPOSITORY)                │
│ github.com/Merkuryo/kubernetes-ejercicios-config                │
├─────────────────────────────────────────────────────────────────┤
│ ├── base/                        (Common Kubernetes config)     │
│ │   ├── backend/deployment.yaml                                 │
│ │   ├── broadcaster/deployment.yaml                             │
│ │   ├── postgres/postgres.yaml                                  │
│ │   └── ...                                                     │
│ │                                                               │
│ └── overlays/                    (Environment-specific)         │
│     ├── staging/                                                │
│     │   ├── broadcaster-patch.yaml (LOG_ONLY=true)              │
│     │   └── kustomization.yaml (UPDATED BY WORKFLOW)            │
│     └── prod/                                                   │
│         ├── backend-patch.yaml (3 replicas)                     │
│         ├── broadcaster-patch.yaml (6 replicas)                 │
│         └── kustomization.yaml (UPDATED BY WORKFLOW)            │
│                                                                 │
│   ↑↑↑ THIS REPO IS WATCHED BY ARGOCD ↑↑↑                      │
└─────────────────────────────────────────────────────────────────┘
                              ↑
                    ArgoCD Auto-Sync
                              │
┌─────────────────────────────────────────────────────────────────┐
│ Kubernetes Cluster                                              │
├─────────────────────────────────────────────────────────────────┤
│ namespace: staging          │ namespace: production              │
│ ├─ staging-backend          │ ├─ prod-backend-1                 │
│ ├─ staging-broadcaster      │ ├─ prod-backend-2                 │
│ ├─ staging-postgres         │ ├─ prod-backend-3                 │
│ └─ staging-*                │ ├─ prod-broadcaster-1..6          │
│                             │ ├─ prod-postgres                  │
│                             │ └─ prod-*                         │
│                                                                 │
│ State: Always matches overlays/ in config repo                  │
└─────────────────────────────────────────────────────────────────┘
```

## CI/CD Flow with Separate Repos

### Scenario: Developer commits to main

```
Step 1: Developer commits code to app repo
─────────────────────────────────────────
$ cd kubernetes-ejercicios
$ vi ejercicio4_10/backend/src/index.js
$ git add . && git commit -m "feat: Add new feature"
$ git push origin main


Step 2: GitHub Actions triggers (in app repo)
──────────────────────────────────────────────
Workflow: publish-separate-repos.yaml
  ✓ Checkout app repo (kubernetes-ejercicios)
  ✓ Build Docker image (backend)
  ✓ Push to registry (docker.pkg.dev)
  ✓ Checkout config repo (kubernetes-ejercicios-config)
  ✓ Update image tag in overlays/staging/kustomization.yaml
  ✓ git commit && git push to config repo


Step 3: Config repo updated
────────────────────────────
Repository: kubernetes-ejercicios-config
  overlays/staging/kustomization.yaml
  Before: image: docker.pkg.dev/.../the-project-api:old-sha
  After:  image: docker.pkg.dev/.../the-project-api:new-sha


Step 4: ArgoCD detects change
──────────────────────────────
ArgoCD polls config repo (every 180 seconds by default)
  ✓ Detects change in overlays/staging/kustomization.yaml
  ✓ Compares cluster state with config state
  ✓ Cluster state != config state → OUT OF SYNC


Step 5: ArgoCD auto-syncs
─────────────────────────
syncPolicy: automated
  ✓ Kustomize build overlays/staging
  ✓ Apply manifests to staging namespace
  ✓ staging-backend-dep: old pod killed
  ✓ staging-backend-dep: new pod created with new image
  ✓ Application status: IN SYNC


Step 6: Staging updated
──────────────────────
$ kubectl get pods -n staging
staging-backend-dep-abc123        1/1     Running   0          10s
staging-broadcaster-dep-def456    1/1     Running   0          5s
staging-postgres-0                1/1     Running   0          30s
```

### Scenario: Promote to production (tag stable)

```
Step 1: Create stable tag
─────────────────────────
$ git tag stable
$ git push origin stable


Step 2: GitHub Actions triggers (for tag)
──────────────────────────────────────────
Workflow: publish-separate-repos.yaml (tag condition)
  ✓ Build same Docker image (SHA is same as latest)
  ✓ Update overlays/prod/kustomization.yaml instead
  ✓ git commit && git push to config repo


Step 3: Config repo production overlay updated
───────────────────────────────────────────────
Repository: kubernetes-ejercicios-config
  overlays/prod/kustomization.yaml
  Before: image: docker.pkg.dev/.../the-project-api:old-sha
  After:  image: docker.pkg.dev/.../the-project-api:new-sha


Step 4: ArgoCD detects production change
─────────────────────────────────────────
targetRevision: stable (watches tags, not main)
  ✓ Detects change in overlays/prod/kustomization.yaml
  ✓ Cluster state != config state → OUT OF SYNC


Step 5: ArgoCD auto-syncs production
────────────────────────────────────
syncPolicy: automated
  ✓ Kustomize build overlays/prod
  ✓ Apply manifests to production namespace
  ✓ 3 backend pods updated (rolling update)
  ✓ 6 broadcaster pods updated
  ✓ Application status: IN SYNC


Step 6: Production updated
──────────────────────────
$ kubectl get pods -n production
prod-backend-dep-aaa111           1/1     Running   0          30s
prod-backend-dep-bbb222           1/1     Running   0          25s
prod-backend-dep-ccc333           1/1     Running   0          20s
prod-broadcaster-dep-ddd444       1/1     Running   0          15s
...
prod-postgres-0                   1/1     Running   0          1h
```

## Repository Structure

### App Repository (kubernetes-ejercicios)

```
kubernetes-ejercicios/
├── ejercicio4_10/
│   ├── backend/                    ← Application code
│   │   ├── src/
│   │   │   └── index.js            (Node.js backend)
│   │   ├── Dockerfile              (Build instructions)
│   │   └── package.json
│   │
│   ├── github-workflows/
│   │   └── publish-separate-repos.yaml
│   │       (Builds image, updates config repo)
│   │
│   └── argocd/
│       ├── applications.yaml       (Points to config repo)
│       └── deploy.sh
│
└── [other exercises...]
```

### Config Repository (kubernetes-ejercicios-config)

```
kubernetes-ejercicios-config/
├── base/                           ← Common Kubernetes manifests
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
│   └── kustomization.yaml          ← Master kustomization
│
└── overlays/                        ← Environment-specific
    ├── staging/
    │   ├── broadcaster-patch.yaml
    │   └── kustomization.yaml      ← Updated by GitHub Actions
    └── prod/
        ├── backend-patch.yaml
        ├── broadcaster-patch.yaml
        ├── postgres-backup.yaml
        └── kustomization.yaml      ← Updated by GitHub Actions
```

## GitHub Actions Workflow (Separate Repos)

```yaml
name: Publish The Project - Separate Config Repo

on:
  push:
    branches: [main]
    paths: [ejercicio4_10/backend/**]
    tags: [stable]

jobs:
  build-and-update-config:
    steps:
      - name: Checkout app repository
        uses: actions/checkout@v4
        with:
          path: app-repo          # kubernetes-ejercicios

      - name: Build and push backend image
        # Build from app-repo/ejercicio4_10/backend
        # Tag: docker.pkg.dev/.../the-project-api:<sha>

      - name: Checkout config repository
        uses: actions/checkout@v4
        with:
          repository: Merkuryo/kubernetes-ejercicios-config
          path: config-repo        # kubernetes-ejercicios-config

      - name: Update Staging Image
        if: github.event_name == 'push' && !startsWith(github.ref, 'refs/tags/')
        run: |
          cd config-repo/overlays/staging
          kustomize edit set image PROJECT/BACKEND=...:<sha>

      - name: Update Production Image
        if: startsWith(github.ref, 'refs/tags/stable')
        run: |
          cd config-repo/overlays/prod
          kustomize edit set image PROJECT/BACKEND=...:<sha>

      - name: Commit and push to config repository
        # git push kubernetes-ejercicios-config
```

## ArgoCD Applications (Pointing to Config Repo)

```yaml
---
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: the-project-staging
  namespace: argocd
spec:
  source:
    repoURL: https://github.com/Merkuryo/kubernetes-ejercicios-config
    path: overlays/staging
    targetRevision: main          # Watch main branch
  destination:
    namespace: staging
  syncPolicy:
    automated:
      prune: true
      selfHeal: true

---
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: the-project-production
  namespace: argocd
spec:
  source:
    repoURL: https://github.com/Merkuryo/kubernetes-ejercicios-config
    path: overlays/prod
    targetRevision: stable        # Watch stable tag
  destination:
    namespace: production
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

## Setup Instructions

### 1. Create Config Repository

```bash
# Option A: Create new repo (recommended for production)
# - Visit github.com/new
# - Repository name: kubernetes-ejercicios-config
# - Initialize with README
# - Clone locally

git clone https://github.com/Merkuryo/kubernetes-ejercicios-config
cd kubernetes-ejercicios-config

# Add base and overlays directories with manifests
# (See config-repo-reference/ in app repo for examples)

mkdir -p base/{backend,broadcaster,postgres,ping-pong,log-output}
mkdir -p overlays/{staging,prod}

# Copy manifest files...
# git add . && git commit && git push


# Option B: For this exercise, use references provided
# Checkout: ejercicio4_10/config-repo-reference/
```

### 2. Install ArgoCD

```bash
cd ejercicio4_10/argocd
chmod +x deploy.sh
./deploy.sh
```

### 3. Setup GitHub Actions Secrets

In app repo (kubernetes-ejercicios):
- Settings → Secrets and variables → Actions
- Add: `GCP_SA_KEY` (for pushing images)
- Add: `GITHUB_TOKEN` (for accessing config repo)

### 4. Create Applications

```bash
kubectl apply -f ejercicio4_10/argocd/applications.yaml
```

### 5. Test the Flow

```bash
# Make a change in app repo
vi ejercicio4_10/backend/src/index.js

# Commit and push
git add . && git commit -m "test: Add feature"
git push origin main

# Watch GitHub Actions build image
# and update config repo

# Watch ArgoCD sync to cluster
kubectl get applications -n argocd -w
```

## Benefits of Separate Repos

### 1. **Clear Separation of Concerns**
- Developers: Focus on code (app repo)
- DevOps/SRE: Focus on infrastructure (config repo)
- No conflicts between teams

### 2. **Independent Versioning**
- Code v1.5.0 can run with config v2.0.0
- Roll back code without touching config
- Roll back config without rebuilding image

### 3. **Security & Access Control**
- App repo: Read access for everyone
- Config repo: Write access only for DevOps team
- Sensitive env-specific config not in app repo

### 4. **Scalability**
- Multiple apps share same config repo patterns
- Centralized GitOps configuration
- Single source of truth for all infrastructure

### 5. **Audit Trail**
- Code changes: who, what, when in app repo
- Config changes: who, what, when in config repo
- Separate histories for accountability

### 6. **Disaster Recovery**
- Lose app repo: rebuild images from backups
- Lose config repo: clone from backup, re-deploy
- Each repo independently recoverable

## Comparison: 3 Patterns

| Aspect | Single Repo | Multi-repo (4.9) | Separate Repos (4.10) |
|--------|-------------|------------------|----------------------|
| Code location | Same | Same | App repo |
| Config location | Same | Same | Config repo |
| Concerns | Mixed | Mixed | **Separated** |
| DevOps Access | Full | Full | **Config only** |
| Developer Access | Full | Full | **App only** |
| Versioning | Coupled | Coupled | **Independent** |
| Scalability | OK | Good | **Excellent** |
| Complexity | Low | Medium | **High** |
| Industry use | Startups | Mid-size | **Enterprise** |

## Common Workflows

### Add New Environment

```bash
# In config repo
mkdir overlays/staging-us-east

# Copy staging kustomization as template
cp overlays/staging/kustomization.yaml overlays/staging-us-east/

# Customize for region (e.g., different node pools)
# git add && git commit && git push

# In app repo
# Add new ArgoCD Application referencing overlays/staging-us-east

# Result: 4 environments from 1 config repo
```

### Rollback Staging

```bash
# Option 1: Rollback code
cd kubernetes-ejercicios
git revert HEAD
git push origin main
# GitHub Actions builds, updates config repo
# ArgoCD syncs, staging reverted

# Option 2: Rollback config
cd kubernetes-ejercicios-config
git revert HEAD
git push origin main
# ArgoCD syncs, staging reverted
```

### Promote to Production

```bash
# In app repo
git tag stable
git push origin stable

# GitHub Actions:
# - Builds same image
# - Updates overlays/prod in config repo

# ArgoCD:
# - Detects stable tag update
# - Syncs prod namespace

# Result: Production updated with zero manual steps
```

## Files in This Exercise

```
ejercicio4_10/
├── backend/
│   ├── src/index.js              (App code)
│   ├── Dockerfile
│   └── package.json
├── github-workflows/
│   └── publish-separate-repos.yaml (Workflow for 2 repos)
├── argocd/
│   ├── applications.yaml         (ArgoCD apps pointing to config repo)
│   └── deploy.sh
└── config-repo-reference/
    ├── STRUCTURE.md              (How config repo should be organized)
    ├── backend-deployment-example.yaml
    ├── staging-kustomization-example.yaml
    └── [other examples]
```

## Next Steps

1. **Create kubernetes-ejercicios-config repository**
   - Push base/ and overlays/ from config-repo-reference

2. **Enable GitHub Actions in config repo**
   - Settings → Actions → Allow Actions

3. **Install ArgoCD**
   - `cd ejercicio4_10/argocd && ./deploy.sh`

4. **Deploy applications**
   - `kubectl apply -f ejercicio4_10/argocd/applications.yaml`

5. **Test end-to-end**
   - Make code change → GitHub Actions → Config repo → ArgoCD → Cluster

## Conclusion

Exercise 4.10 demonstrates the **ultimate GitOps pattern**: complete separation between application code and infrastructure configuration. This is the standard for enterprise Kubernetes deployments and provides:

✅ Clear team responsibilities
✅ Independent versioning
✅ Better security model
✅ Scalable to hundreds of environments
✅ Industry best practice

The journey from Exercise 4.1 (readiness probes) to 4.10 (separate repos GitOps) demonstrates the complete evolution from basic Kubernetes to production-grade GitOps architecture.
