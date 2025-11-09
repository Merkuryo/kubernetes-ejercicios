# Exercise 3.7 - Entornos Separados por Rama

## Objective

Implementar una estrategia de despliegue en Kubernetes donde cada rama de Git se despliega en un namespace separado. Esto permite tener entornos aislados para:

- **Rama main** → Namespace `project` (producción)
- **Ramas feature** → Namespace con nombre de rama (desarrollo/testing)

## Arquitectura

```
GitHub Repository
├── main branch
│   ├── [GitHub Actions Workflow]
│   ├── Determina namespace = "project"
│   └── Despliega a GKE namespace "project"
│
└── feature-test branch
    ├── [GitHub Actions Workflow]
    ├── Determina namespace = "feature-test"
    └── Despliega a GKE namespace "feature-test"
```

## Implementación

### 1. Modificación del Workflow

El archivo `.github/workflows/main.yaml` ha sido actualizado con lógica de namespace:

```yaml
# Paso: Determinar namespace (NUEVO)
- name: Determine namespace
  id: namespace
  run: |
    BRANCH=${{ github.ref_name }}
    if [ "$BRANCH" = "main" ]; then
      NAMESPACE=project
    else
      NAMESPACE=$BRANCH
    fi
    echo "NAMESPACE=$NAMESPACE" >> $GITHUB_OUTPUT

# Paso: Deploy to GKE (ACTUALIZADO)
- name: Deploy to GKE
  run: |
    NAMESPACE=${{ steps.namespace.outputs.NAMESPACE }}
    cd ejercicio3_5
    
    # Crear namespace
    kubectl create namespace $NAMESPACE || true
    
    # Establecer contexto
    kubectl config set-context --current --namespace=$NAMESPACE
    
    # Actualizar Kustomize con namespace
    kustomize edit set namespace $NAMESPACE
    kustomize edit set image PROJECT/IMAGE=$IMAGE_TAG
    
    # Aplicar manifiestos
    kustomize build . | kubectl apply -f -
    
    # Esperar rollout
    kubectl rollout status deployment colorcontent
    kubectl get services -o wide
```

### 2. Configuración de Kustomize

El archivo `ejercicio3_5/kustomization.yaml` ha sido actualizado para incluir el campo namespace:

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: default  # Se actualiza por el workflow

resources:
  - manifests/deployment.yaml
  - manifests/service.yaml

images:
  - name: PROJECT/IMAGE
    newName: PROJECT/IMAGE
    newTag: latest
```

## Estrategia de Namespaces

| Rama | Namespace | Propósito |
|------|-----------|----------|
| main | project | Producción/Estable |
| feature-* | feature-* | Desarrollo/Testing |
| bugfix-* | bugfix-* | Correcciones |
| release-* | release-* | Pre-producción |

## Ventajas

1. **Aislamiento**: Cada rama tiene su entorno completamente separado
2. **Desarrollo Paralelo**: Múltiples features pueden ser testeadas simultáneamente
3. **Seguridad**: Cambios en una rama no afectan otras
4. **Control**: Control granular de permisos por namespace
5. **Testing**: Pruebas realistas del código antes de merge a main
6. **Rollback Fácil**: Revertir a un namespace anterior es trivial

## Flujo de Trabajo

### 1. Crear una rama feature

```bash
git checkout -b feature-nueva-funcionalidad
```

### 2. Hacer cambios

```bash
# Editar archivos en ejercicio3_5/
git add ejercicio3_5/
git commit -m "feat: Nueva funcionalidad"
```

### 3. Push a GitHub

```bash
git push -u origin feature-nueva-funcionalidad
```

### 4. GitHub Actions se ejecuta automáticamente

- Determina namespace = `feature-nueva-funcionalidad`
- Crea namespace en GKE
- Despliega la aplicación
- Genera LoadBalancer con IP pública

### 5. Probar el cambio

```bash
# Ver servicios en el namespace feature
kubectl get services -n feature-nueva-funcionalidad

# Acceder a la aplicación
curl http://<LOADBALANCER-IP>
```

### 6. Merge a main

Una vez validado, hacer merge:

```bash
git checkout main
git pull origin main
git merge feature-nueva-funcionalidad
git push origin main
```

### 7. Despliegue a producción

GitHub Actions se ejecuta automáticamente:
- Determina namespace = `project`
- Despliega a namespace `project` (producción)

## Verificación

### Ver todos los namespaces

```bash
kubectl get namespaces
```

Salida esperada:
```
NAME                STATUS   AGE
project             Active   2h      (main branch - producción)
feature-test        Active   30m     (feature branch - testing)
default             Active   3h
kube-system         Active   3h
kube-public         Active   3h
```

### Ver servicios en cada namespace

```bash
# Namespace producción
kubectl get services -n project
kubectl get pods -n project

# Namespace feature
kubectl get services -n feature-test
kubectl get pods -n feature-test
```

### Ver despliegues

```bash
# Listar todos los namespaces con pods
kubectl get pods -A | grep colorcontent

# Ver logs de un pod específico
kubectl logs -n feature-test -l app=colorcontent
```

## Limpieza

Para eliminar un namespace (después de cerrar una feature):

```bash
# Eliminar un namespace específico
kubectl delete namespace feature-test

# Ver namespaces eliminados en proceso
kubectl get namespaces --watch
```

**Nota**: También se puede eliminar a través de GitHub borrando la rama:
```bash
git push origin --delete feature-test
```

Y luego limpiar manualmente el namespace o automatizar con un workflow de limpieza.

## Testing de la Implementación

Se creó rama `feature-test` para validar:

1. ✅ Rama `feature-test` creada en GitHub
2. ✅ GitHub Actions se ejecutó automáticamente
3. ✅ Determina namespace = `feature-test`
4. ✅ Crea namespace `feature-test` en GKE
5. ✅ Despliega aplicación en namespace separado
6. ✅ LoadBalancer asignado a namespace `feature-test`
7. ✅ Aplicación accesible en IP pública del LoadBalancer
8. ✅ Namespace principal `project` sin cambios

## Próximos Pasos (Opcional)

Para mejorar aún más:

1. **Workflow de Limpieza**: Workflow automático que elimina namespaces cuando se borra la rama
2. **Ingress Automático**: Asignar dominios DNS a cada namespace
3. **Secrets Automáticos**: Gestionar secrets por namespace
4. **Monitoreo**: Monitorear cada namespace con Prometheus/Grafana
5. **Quotas**: Establecer quotas de recursos por namespace

## Archivos Modificados

- `.github/workflows/main.yaml`: Añadido lógica de namespace
- `ejercicio3_5/kustomization.yaml`: Añadido campo namespace
- `ejercicio3_5/index.html`: Cambio trivial para testing (Feature Test)

## Conclusión

Exercise 3.7 implementa una estrategia robusta de multi-ambiente usando namespaces de Kubernetes, permitiendo desarrollo paralelo, testing aislado y despliegue seguro a producción.
