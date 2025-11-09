# Exercise 2.4: The Project - Step 9 - Project Namespace Organization

## Description

En este ejercicio organizamos completamente el proyecto en su propio namespace. Todos los ejercicios relacionados con el proyecto (1.11, 1.12, 1.13, 2.2) ahora se encuentran en el namespace `project`.

Esta separación permite:
- Mantener el proyecto aislado del resto de ejercicios
- Aplicar ResourceQuotas específicas para el proyecto
- Facilitar el despliegue y gestión
- Seguir los principios de organización de Kubernetes

## Namespace `project`

### Componentes del Proyecto en el Namespace

```
proyecto/
├── Ejercicio 1.11: Persistent Volumes
│   ├── app-dep (2 contenedores: log-writer, log-reader)
│   ├── app-svc (NodePort 30000-30001)
│   └── PersistentVolume/PersistentVolumeClaim
│
├── Ejercicio 1.12: Image Caching
│   ├── project-dep
│   └── project-svc (NodePort 30005, antes 30002)
│
├── Ejercicio 1.13: TODO App
│   ├── project-dep (compartido con 1.12)
│   ├── project-svc (actualizado)
│   └── project-ingress
│
└── Ejercicio 2.2: Todo Backend Service
    ├── todo-app-dep
    ├── todo-app-svc (NodePort 30003)
    ├── todo-backend-dep
    └── todo-backend-svc (ClusterIP)
```

### Pods Corriendo en el Namespace `project`

```
NAME                                READY   STATUS    RESTARTS
app-dep-846565b99b-lpwgn            2/2     Running   0
project-dep-5684d65c4f-vnllz        1/1     Running   0
todo-app-dep-5bbd7d8877-sscfs       1/1     Running   0
todo-backend-dep-7857d9fcc9-kw2gv   1/1     Running   0
```

### Servicios en el Namespace `project`

| Servicio | Tipo | Puerto | NodePort |
|----------|------|--------|----------|
| app-svc | NodePort | 3000/3001 | 30000/30001 |
| project-svc | NodePort/ClusterIP | 80 | 30005 |
| todo-app-svc | NodePort | 3000 | 30003 |
| todo-backend-svc | ClusterIP | 3000 | - |

## Operaciones con el Namespace `project`

### Ver todos los recursos del proyecto

```bash
kubectl get all -n project
```

### Ver solo pods del proyecto

```bash
kubectl get pods -n project
```

### Ver servicios del proyecto

```bash
kubectl get svc -n project
```

### Ver persistentes volumes del proyecto

```bash
kubectl get pvc -n project
```

### Ver logs de un pod del proyecto

```bash
kubectl logs -n project <pod-name>
kubectl logs -n project deployment/todo-app-dep
```

### Ejecutar comando en un pod del proyecto

```bash
kubectl exec -it -n project <pod-name> -- /bin/sh
```

### Port-forward a un servicio del proyecto

```bash
# Acceder al proyecto (puerto 30005)
kubectl port-forward -n project svc/project-svc 8080:80

# Acceder al todo-app (puerto 30003)
kubectl port-forward -n project svc/todo-app-svc 3000:3000

# Acceder al todo-backend
kubectl port-forward -n project svc/todo-backend-svc 3001:3000
```

## Estructura de Archivos Modificados

Todos los manifiestos YAML del proyecto ahora incluyen el namespace:

```yaml
metadata:
  namespace: project
  name: <nombre>
```

### Archivos Afectados:

```
ejercicio1_11/
├── manifests/
│   ├── deployment.yaml (namespace: project)
│   └── storage/
│       ├── persistentvolume.yaml (sin namespace - cluster-wide)
│       └── persistentvolumeclaim.yaml (namespace: project)

ejercicio1_12/
├── manifests/
│   ├── deployment.yaml (namespace: project)
│   └── service.yaml (namespace: project, puerto 30005)

ejercicio1_13/
├── manifests/
│   ├── deployment.yaml (namespace: project)
│   ├── service.yaml (namespace: project)
│   └── ingress.yaml (namespace: project)

ejercicio2_2/
├── manifests/
│   ├── todo-app.yaml (namespace: project)
│   └── todo-backend.yaml (namespace: project)
```

## DNS Dentro del Namespace `project`

Los servicios dentro del namespace pueden comunicarse usando:

```bash
# Dentro del mismo namespace
http://todo-backend-svc:3000

# Desde otro namespace
http://todo-backend-svc.project:3000
http://todo-backend-svc.project.svc.cluster.local:3000
```

## Ventajas de esta Organización

1. **Aislamiento**: El proyecto está completamente separado de otros ejercicios
2. **Escalabilidad**: Fácil agregar más ejercicios al proyecto sin conflictos
3. **Gestión de Recursos**: Se pueden aplicar ResourceQuotas al namespace
4. **Debugging**: Logs y eventos del proyecto están aislados
5. **Limpieza**: Eliminar todo el proyecto es tan simple como: `kubectl delete namespace project`

## Eliminar Todo el Proyecto (Si es Necesario)

```bash
# Esto eliminará TODOS los recursos del proyecto
kubectl delete namespace project
```

## Recriar el Proyecto

```bash
# Crear nuevamente el namespace
kubectl create namespace project

# Reapliar todos los manifiestos
kubectl apply -f ejercicio1_11/manifests/
kubectl apply -f ejercicio1_12/manifests/
kubectl apply -f ejercicio1_13/manifests/
kubectl apply -f ejercicio2_2/manifests/
```

## Comparación de Namespaces

```bash
# Namespace exercises (ejercicios individuales)
kubectl get all -n exercises

# Namespace project (ejercicios del proyecto)
kubectl get all -n project

# Namespace default (material del curso)
kubectl get all -n default
```

## Cambiar el Namespace por Defecto (Opcional)

Si trabajas frecuentemente con el namespace `project`:

```bash
kubectl config set-context --current --namespace=project
```

Para volver al default:

```bash
kubectl config set-context --current --namespace=default
```

## Herramientas Útiles

### kubens (para cambiar rápidamente entre namespaces)

```bash
# Listar todos los namespaces
kubens

# Cambiar al namespace project
kubens project

# Volver al anterior
kubens -
```

## Siguiente Paso

En ejercicios posteriores:
- Se agregarán más servicios al namespace `project`
- Se pueden implementar ResourceQuotas
- Se puede configurar NetworkPolicies para limitar tráfico

## Conclusión

El ejercicio 2.4 establece la práctica de organizar recursos por proyecto en namespaces separados, mejorando la mantenibilidad y escalabilidad del cluster.
