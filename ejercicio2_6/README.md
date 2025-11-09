# Exercise 2.6: Removing Hardcoded Values and Configuration Management

## Description

En este ejercicio eliminamos **todos los valores hardcodeados** del proyecto y movemos la configuración a **ConfigMaps**. Esto es una práctica esencial para tener aplicaciones configurables en Kubernetes.

## Problema Identificado

El proyecto (Ejercicio 2.2) tenía valores hardcodeados en el código:

- **todo-app/src/index.js (línea 308)**: 
  ```javascript
  const BACKEND_URL = 'http://todo-backend-svc:3000'
  ```
  - Este valor estaba hardcodeado directamente en JavaScript
  - Imposible cambiar sin reconstruir la imagen Docker
  - Dificulta cambios de configuración en diferentes ambientes

## Solución Implementada

### 1. Refactorización del Código

**Antes (hardcodeado en cliente):**
```javascript
// Hardcodeado en página HTML renderizada
const BACKEND_URL = 'http://todo-backend-svc:3000';
```

**Ahora (dinámico desde servidor):**
```javascript
// En server (index.js)
const clientBackendUrl = process.env.TODOS_BACKEND || 'http://todo-backend-svc:3000';

// Pasado al template como variable
res.send(html.replace('${clientBackendUrl}', clientBackendUrl));

// En página HTML
const BACKEND_URL = '${clientBackendUrl}';
```

**Ventajas:**
- ✅ URL del backend es inyectable como variable de entorno
- ✅ Se puede cambiar sin reconstruir la imagen
- ✅ Soporta múltiples ambientes (dev, staging, prod)

### 2. ConfigMap Centralizado

Creado: `project-config` en namespace `project`

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  namespace: project
  name: project-config
data:
  TODOS_BACKEND: "http://todo-backend-svc:3000"
  LOG_OUTPUT_MESSAGE: "Project Application"
  IMAGE_CACHE_DURATION: "10"
```

**Configuraciones incluidas:**
- `TODOS_BACKEND`: URL del servicio backend de TODOs
- `LOG_OUTPUT_MESSAGE`: Mensaje para log output
- `IMAGE_CACHE_DURATION`: Duración de caché en minutos

### 3. Deployments Actualizados

**Método 1: configMapKeyRef (valores individuales)**
```yaml
env:
- name: TODOS_BACKEND
  valueFrom:
    configMapKeyRef:
      name: project-config
      key: TODOS_BACKEND
```

**Método 2: envFrom (todas las keys como variables)**
```yaml
envFrom:
- configMapRef:
    name: project-config
```

### 4. Verificación

#### Confirmar que la variable de entorno se inyecta:
```bash
kubectl exec -it -n project deployment/todo-app-dep -- sh -c 'echo "TODOS_BACKEND: $TODOS_BACKEND"'
# Resultado: TODOS_BACKEND: http://todo-backend-svc:3000 ✅
```

#### Verificar que el backend funciona:
```bash
kubectl exec -it -n project deployment/todo-backend-dep -- wget -qO- http://localhost:3000/todos
# Retorna lista de TODOs ✅
```

#### Probar la interfaz web:
```bash
kubectl port-forward -n project deployment/todo-app-dep 3010:3000
# Acceder a http://localhost:3010 en navegador ✅
```

## Comparación: Hardcoded vs ConfigMap

| Aspecto | Hardcoded | ConfigMap |
|---------|-----------|-----------|
| **Cambiar URL** | Editar código + rebuild imagen + reimplementar | Editar ConfigMap + restart pod |
| **Múltiples ambientes** | Diferentes repos/imágenes | Misma imagen, diferente ConfigMap |
| **Seguridad** | Valores visibles en código | Centralizados en cluster |
| **Mantenibilidad** | Difícil | Fácil |
| **DevOps friendly** | ❌ | ✅ |

## Estructura de Archivos

```
ejercicio2_6/
├── README.md
└── manifests/
    ├── configmap.yaml          # ConfigMap con toda configuración
    └── todo-app-updated.yaml   # Deployment actualizado (referencia)
```

## Siguientes Pasos en Kubernetes

Después de ConfigMaps, los siguientes conceptos serían:

1. **Secrets** - Para datos sensibles (contraseñas, tokens)
2. **Environment-specific ConfigMaps** - Diferentes configs por ambiente
3. **Helm Charts** - Para templating y versionado de manifests
4. **Kustomize** - Para customización de manifests sin templating

## Principios Aplicados

✅ **12-Factor App** - Configuración en variables de entorno, no en código
✅ **Immutable infrastructure** - La imagen no cambia, solo la configuración
✅ **GitOps ready** - Cambios de configuración versionados en Git
✅ **Production-ready** - Fácil de mantener en diferentes ambientes

## Comandos Útiles

```bash
# Ver ConfigMap
kubectl get configmap -n project
kubectl describe configmap project-config -n project

# Ver valores en pod
kubectl exec -it -n project deployment/todo-app-dep -- env | grep TODOS

# Cambiar ConfigMap (editar y aplicar)
kubectl edit configmap project-config -n project
kubectl rollout restart deployment/todo-app-dep -n project

# Ver logs de la aplicación
kubectl logs -n project deployment/todo-app-dep
kubectl logs -n project deployment/todo-backend-dep
```

## Conclusión

El ejercicio 2.6 completa el ciclo de aprendizaje del módulo 2:
- 2.1: Comunicación entre pods
- 2.2: Servicios y microservicios
- 2.3: Namespaces para organización
- 2.4: Documentación de namespaces
- 2.5: ConfigMaps básicos
- 2.6: **ConfigMaps en producción** ← Aquí

Con esto, tenemos una arquitectura completamente configurable sin valores hardcodeados, lista para diferentes ambientes.
