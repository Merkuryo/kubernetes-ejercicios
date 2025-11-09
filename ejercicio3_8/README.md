# Exercise 3.8 - Cleanup Workflow: Eliminar Namespaces al Borrar Ramas

## Objective

Implementar un workflow de GitHub Actions que automáticamente elimine los namespaces de Kubernetes cuando se borra una rama en el repositorio. Esto completa la estrategia de multi-ambiente por rama, asegurando que no haya namespaces huérfanos o recursos perdidos en el cluster.

## Arquitectura

```
GitHub Repository
├── Push rama feature-xyz
│   ├── Workflow 'Release application'
│   └── Crea namespace 'feature-xyz' en GKE
│
└── Delete rama feature-xyz
    ├── Webhook GitHub
    ├── Trigger 'on: delete'
    ├── Workflow 'Cleanup environment'
    └── Elimina namespace 'feature-xyz' de GKE
```

## Implementación

### 1. Nuevo Workflow: `cleanup.yaml`

El archivo `.github/workflows/cleanup.yaml` se ejecuta cuando se elimina una rama:

```yaml
name: Cleanup environment on branch delete

on:
  delete:  # Se dispara cuando se elimina una rama o tag

jobs:
  cleanup:
    name: Delete namespace when branch is deleted
    runs-on: ubuntu-latest
    
    # Solo ejecutar si se deletea una rama (no un tag)
    if: github.event.ref_type == 'branch'
    
    steps:
      - name: Authenticate to Google Cloud
      - name: Set up Cloud SDK
      - name: Get GKE credentials
      - name: Determine namespace and delete
        run: |
          BRANCH=${{ github.event.ref }}
          
          # Proteger namespace de producción
          if [ "$BRANCH" = "main" ]; then
            echo "🛡️ Protecting production namespace 'project'"
            exit 0
          fi
          
          # Eliminar namespace de la rama
          NAMESPACE=$BRANCH
          kubectl delete namespace $NAMESPACE --ignore-not-found=true
```

### 2. Lógica de Protección

El workflow implementa protecciones importantes:

| Rama | Acción | Razón |
|------|--------|-------|
| main | SKIP (no elimina) | Producción debe ser permanente |
| feature-* | Elimina namespace | Feature completada, limpiar recursos |
| bugfix-* | Elimina namespace | Corrección aplicada, limpiar recursos |
| release-* | Elimina namespace | Release completada, limpiar recursos |

### 3. Pasos de Ejecución

1. **Detectar eliminación de rama**
   - GitHub registra webhook de eliminación
   - Verifica que sea una rama (no tag)

2. **Autenticar a GCP**
   - Usa servicio account github-actions
   - Mismo que el workflow principal

3. **Obtener credenciales de GKE**
   - Conecta a cluster dwk-cluster

4. **Eliminar namespace**
   - `kubectl delete namespace $BRANCH_NAME`
   - `--ignore-not-found=true`: No falla si ya está eliminado
   - Espera confirmación de eliminación

### 4. Seguridad y Validación

```bash
# Protección 1: No eliminates main
if [ "$BRANCH" = "main" ]; then
  exit 0
fi

# Protección 2: Ignora si ya no existe
--ignore-not-found=true

# Protección 3: Verifica eliminación
kubectl wait --for=condition=terminating --timeout=60s
```

## Flujo de Trabajo Completo

### Ciclo 1: Crear Feature Branch

```bash
# 1. Crear rama
git checkout -b feature-nueva-funcionalidad

# 2. Hacer cambios
echo "Nuevas características" > ejercicio3_5/new-feature.txt

# 3. Push a GitHub
git add ejercicio3_5/
git commit -m "feat: Nueva funcionalidad"
git push -u origin feature-nueva-funcionalidad

# 4. GitHub Actions - Release application
#    ✅ Crea namespace 'feature-nueva-funcionalidad'
#    ✅ BuildKit + publish image
#    ✅ Deploy a namespace feature-nueva-funcionalidad
```

### Ciclo 2: Mergear y Limpiar

```bash
# 1. Merge a main en GitHub (via Pull Request)
# 2. Rama feature-nueva-funcionalidad se borra

# 3. GitHub webhook detecta eliminación
# 4. GitHub Actions - Cleanup environment
#    ✅ Verifica que sea una rama (no tag)
#    ✅ Obtiene credenciales de GKE
#    ✅ Ejecuta: kubectl delete namespace feature-nueva-funcionalidad
#    ✅ Namespace eliminado completamente
```

### Resultado

```bash
# Antes de eliminar rama
$ kubectl get namespaces
NAME                   STATUS   AGE
project                Active   2h    (main - producción)
feature-nueva-func     Active   30m   (feature - será eliminado)

# Después de eliminar rama
$ kubectl get namespaces
NAME          STATUS   AGE
project       Active   2h    (solo main permanece)
```

## Ventajas

1. **Limpieza automática**: No requiere intervención manual
2. **Zero wandering resources**: Sin namespaces huérfanos
3. **Cost optimization**: Menos recursos consumidos en GKE
4. **Clean CI/CD**: Historia clara de qué exists y qué no
5. **Seguridad**: Production namespace protegido

## Verificación

### Ver log del workflow

```bash
# En GitHub Actions: .github/workflows/cleanup.yaml
# 1. Ir a Actions
# 2. Buscar "Cleanup environment on branch delete"
# 3. Ver logs de ejecución
```

### Verificar eliminación manual

```bash
# Antes de eliminar rama
kubectl get namespaces | grep feature-nueva-func
# OUTPUT: feature-nueva-func  Active  30m

# Eliminar rama en GitHub
git push origin --delete feature-nueva-func

# Esperar ~30 segundos (workflow cleanup ejecuta)

# Después de eliminar
kubectl get namespaces | grep feature-nueva-func
# OUTPUT: (vacío - namespace eliminado ✅)
```

### Protección de production

```bash
# Intentar borrar main rama (falla en GitHub)
git push origin --delete main
# ERROR: Refusing to delete the only branch in this repository

# Incluso si se pudiera, el workflow lo protegería:
# Log del workflow: "🛡️ Protecting production namespace 'project' - skipping deletion"
```

## Estructura del Proyecto

```
.github/
├── workflows/
│   ├── main.yaml        (Release application - deploy)
│   └── cleanup.yaml     ⭐ NEW (Cleanup environment - delete)

ejercicio3_5/
├── Dockerfile
├── kustomization.yaml
├── index.html
├── manifests/
│   ├── deployment.yaml
│   └── service.yaml

ejercicio3_8/
├── README.md            (Este archivo)
└── manifests/
    └── .gitkeep
```

## Próximas Mejoras (Opcional)

1. **Confirmación antes de eliminar**: Requerir PR approval
2. **Logging centralizado**: Enviar eventos de eliminación a Slack/Discord
3. **Retención configurable**: No eliminar si hay pull requests abiertas
4. **Backup antes de eliminar**: Exportar logs del namespace antes de borrar
5. **Métricas**: Registrar tiempo de vida de cada namespace

## Conclusión

Exercise 3.8 completa el ciclo de vida del multi-ambiente por rama:
- ✅ **3.7**: Crear namespaces cuando se crea rama
- ✅ **3.8**: Limpiar namespaces cuando se borra rama

Esto forma un sistema completo, escalable y auto-limpiable de desarrollo en Kubernetes con GitHub Actions.
