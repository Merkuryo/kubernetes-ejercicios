# Esta es la ESTRUCTURA que debería estar en un repositorio SEPARADO
# llamado "kubernetes-ejercicios-config" o similar.
#
# En un setup real, este repositorio sería:
# - Separado del código fuente
# - Manejado por el equipo de infraestructura/DevOps
# - Apuntado por ArgoCD para sincronización
# - Contendría SOLO configuración, no código
#
# Estructura esperada en el config repo:
#
# kubernetes-ejercicios-config/
# ├── base/
# │   ├── backend/
# │   │   ├── deployment.yaml
# │   │   ├── service.yaml
# │   │   └── kustomization.yaml
# │   ├── broadcaster/
# │   │   ├── deployment.yaml
# │   │   └── kustomization.yaml
# │   ├── postgres/
# │   │   ├── postgres.yaml
# │   │   └── kustomization.yaml
# │   ├── ping-pong/
# │   │   ├── deployment.yaml
# │   │   └── kustomization.yaml
# │   ├── log-output/
# │   │   ├── deployment.yaml
# │   │   └── kustomization.yaml
# │   └── kustomization.yaml
# │
# └── overlays/
#     ├── staging/
#     │   ├── broadcaster-patch.yaml
#     │   └── kustomization.yaml
#     └── prod/
#         ├── backend-patch.yaml
#         ├── broadcaster-patch.yaml
#         ├── postgres-backup.yaml
#         └── kustomization.yaml
#
# Las imágenes Docker se construyen en kubernetes-ejercicios (app repo)
# Los manifests Kubernetes se versionan en kubernetes-ejercicios-config (config repo)
#
# Flujo CI/CD:
# 1. Developer modifica src/index.js en app repo (kubernetes-ejercicios)
# 2. git push origin main
# 3. GitHub Actions (app repo):
#    - Build Docker image
#    - Push a registry (e.g., docker.pkg.dev)
#    - Clona config repo (kubernetes-ejercicios-config)
#    - Actualiza image tag en config repo
#    - git push a config repo
# 4. ArgoCD (en cluster):
#    - Monitorea config repo
#    - Ve cambio en overlays/staging/kustomization.yaml
#    - Sincroniza con cluster
#    - Pods se actualizan con nueva imagen
