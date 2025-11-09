# Exercise 2.3: Keep Them Separated - Namespaces

## Description

En este ejercicio aprendemos a organizar un cluster de Kubernetes usando **Namespaces**. Los namespaces permiten dividir un cluster en clusters virtuales separados, útiles para:

- Separar ambientes (producción, testing, staging)
- Separar proyectos en un cluster compartido
- Aplicar ResourceQuotas a diferentes equipos
- Mantener recursos organizados y separados

## Namespaces Creados

### 1. Namespace `exercises`
Contiene todos los ejercicios individuales:
- Log Output (ejercicio2_1)
- Ping-Pong (ejercicio2_1)

```bash
kubectl get pods -n exercises
```

### 2. Namespace `project`
Contiene todos los ejercicios del proyecto:
- Ejercicio 1.11: Persistent Volumes
- Ejercicio 1.12: Image Caching
- Ejercicio 1.13: TODO App
- Ejercicio 2.2: Todo Backend Service

```bash
kubectl get pods -n project
```

### 3. Namespace `default`
Disponible para el seguimiento del material del curso.

## Comunicación Entre Namespaces

Los servicios pueden comunicarse entre namespaces usando DNS:

```
<servicio>.<namespace>.svc.cluster.local
```

Por ejemplo, si necesitamos acceder al servicio `todo-backend-svc` del namespace `project` desde otro namespace:

```bash
curl http://todo-backend-svc.project:3000/todos
```

## Operaciones con Namespaces

### Ver todos los namespaces

```bash
kubectl get namespaces
```

### Ver pods en un namespace específico

```bash
kubectl get pods -n exercises
kubectl get pods -n project
```

### Ver todo en todos los namespaces

```bash
kubectl get all --all-namespaces
```

### Cambiar el namespace por defecto

```bash
kubectl config set-context --current --namespace=exercises
```

### Crear un namespace

```bash
kubectl create namespace <nombre>
```

## Manifiestos Actualizados

Todos los manifiestos YAML ahora incluyen `namespace` en la sección metadata:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  namespace: exercises  # o project
  name: mi-deployment
```

## Archivos Modificados

### Ejercicio 2.1 (exercises namespace)
- `ejercicio2_1/manifests/logoutput.yaml` - Agregado namespace: exercises
- `ejercicio2_1/manifests/pingpong.yaml` - Agregado namespace: exercises

### Ejercicio 1.11 (project namespace)
- `ejercicio1_11/manifests/deployment.yaml` - Agregado namespace: project

### Ejercicio 1.12 (project namespace)
- `ejercicio1_12/manifests/deployment.yaml` - Agregado namespace: project
- `ejercicio1_12/manifests/service.yaml` - Agregado namespace: project

### Ejercicio 1.13 (project namespace)
- `ejercicio1_13/manifests/deployment.yaml` - Agregado namespace: project
- `ejercicio1_13/manifests/service.yaml` - Agregado namespace: project
- `ejercicio1_13/manifests/ingress.yaml` - Agregado namespace: project

### Ejercicio 2.2 (project namespace)
- `ejercicio2_2/manifests/todo-backend.yaml` - Agregado namespace: project
- `ejercicio2_2/manifests/todo-app.yaml` - Agregado namespace: project

## Verificación

Para verificar que todo está correctamente separado:

```bash
# Ver pods en namespace exercises
kubectl get pods -n exercises
# Debería mostrar: logoutput-dep y pingpong-dep

# Ver pods en namespace project
kubectl get pods -n project
# Debería mostrar: app-dep, todo-backend-dep, todo-app-dep

# Ver servicios en cada namespace
kubectl get svc -n exercises
kubectl get svc -n project
```

## Conceptos Aprendidos

- ✅ Crear namespaces
- ✅ Deployments en namespaces
- ✅ Services en namespaces
- ✅ DNS discovery entre namespaces
- ✅ Organización de recursos en cluster
- ✅ Separación de ambientes/proyectos

## Herramientas Útiles

Se recomienda instalar **kubectx** y **kubens** para cambiar fácilmente entre clusters y namespaces:

```bash
# Instalar (en Linux)
sudo git clone https://github.com/ahmetb/kubectx /opt/kubectx
sudo ln -s /opt/kubectx/kubectx /usr/local/bin/kubectx
sudo ln -s /opt/kubectx/kubens /usr/local/bin/kubens

# Uso
kubens                    # Listar namespaces
kubens exercises         # Cambiar al namespace exercises
kubectx                  # Listar clusters
```

## Documentación Oficial

- [Kubernetes Namespaces](https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/)
- [Namespace DNS](https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/)
- [Resource Quotas](https://kubernetes.io/docs/concepts/policy/resource-quotas/)
