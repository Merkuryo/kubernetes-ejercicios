# Ejercicio 5.1 - DIY CRD & Controller

## Objetivo

Crear un **Custom Resource Definition (CRD)** personalizado llamado `DummySite` y su correspondiente **Custom Controller** que:

1. **Define** un nuevo tipo de recurso Kubernetes: `DummySite`
2. **Observa** cambios en recursos `DummySite`
3. **Descarga** HTML desde una URL especificada
4. **Crea** automáticamente Deployments, Services y ConfigMaps para servir el contenido

Este ejercicio introduce el concepto de **extender Kubernetes** con recursos personalizados, que es fundamental en:
- Operadores Kubernetes
- Controladores personalizados
- Extensiones de plataforma

## Conceptos Clave

### 1. Custom Resource Definition (CRD)

Un CRD es una extensión del API de Kubernetes que permite definir nuevos tipos de recursos. Antes de CRDs, solo podías usar recursos built-in como Deployments, Services, etc.

**Ventajas:**
- Declara nuevos tipos de recursos que tu aplicación necesita
- Integración nativa con kubectl
- Controlado por Git (declarativo)
- Compatible con todo el ecosistema Kubernetes

### 2. Controller Pattern

Un controlador es un bucle infinito que:
1. **Observa** el estado deseado (recursos en el cluster)
2. **Lee** el estado actual
3. **Actúa** para llevar el estado actual al deseado

**Componentes:**
- **Watch**: Escucha eventos (ADDED, MODIFIED, DELETED)
- **Reconcile**: Compara estado deseado vs actual
- **Act**: Crea/actualiza/elimina recursos

### 3. RBAC (Role-Based Access Control)

Los controladores necesitan permisos específicos para acceder a la API de Kubernetes:

- **ServiceAccount**: Identidad del controlador
- **ClusterRole**: Define qué operaciones se permiten
- **ClusterRoleBinding**: Vincula el ServiceAccount con el ClusterRole

## Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                        Kubernetes Cluster                   │
│                                                             │
│  ┌────────────────────────────────────────────────────┐   │
│  │              API Server                            │   │
│  │  /apis/stable.dwk/v1/dummysites                  │   │
│  └────────────────────────────────────────────────────┘   │
│              ▲                    ▲                         │
│              │                    │                         │
│              │ WATCH              │ UPDATE (create,delete)  │
│              │                    │                         │
│  ┌──────────────────────────────────────────────────┐     │
│  │  DummySite Controller Pod                        │     │
│  │                                                  │     │
│  │  ┌─────────────────────────────────────────┐   │     │
│  │  │ Watch DummySite resources               │   │     │
│  │  │ • Receive ADDED event                   │   │     │
│  │  │ • Download HTML from website_url        │   │     │
│  │  │ • Create ConfigMap (HTML content)       │   │     │
│  │  │ • Create Deployment (nginx)             │   │     │
│  │  │ • Create Service (LoadBalancer)         │   │     │
│  │  │                                          │   │     │
│  │  │ On DELETED event:                        │   │     │
│  │  │ • Delete Deployment                      │   │     │
│  │  │ • Delete Service                         │   │     │
│  │  │ • Delete ConfigMap                       │   │     │
│  │  └─────────────────────────────────────────┘   │     │
│  │                                                  │     │
│  │  ServiceAccount: dummysite-controller-account   │     │
│  └──────────────────────────────────────────────────┘     │
│                                                             │
│  ┌──────────────────────────────────────────────────┐     │
│  │  Resources created por el controlador             │     │
│  │                                                  │     │
│  │  For each DummySite:                             │     │
│  │  • ConfigMap (website HTML)                      │     │
│  │  • Deployment (nginx server)                     │     │
│  │  • Service (LoadBalancer)                        │     │
│  │  • Pod (nginx container)                         │     │
│  └──────────────────────────────────────────────────┘     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Flujo de Operación

### Paso 1: Aplicar CRD
```bash
kubectl apply -f manifests/resourcedefinition.yaml
```

Resultado:
- Se registra el nuevo tipo de recurso `DummySite`
- Puedes crear recursos con `kind: DummySite`

### Paso 2: Configurar RBAC
```bash
kubectl apply -f manifests/serviceaccount.yaml
kubectl apply -f manifests/clusterrole.yaml
kubectl apply -f manifests/clusterrolebinding.yaml
```

Resultado:
- Se crea `ServiceAccount: dummysite-controller-account`
- Se define `ClusterRole: dummysite-controller-role` con permisos
- Se vinculan juntos con `ClusterRoleBinding`

### Paso 3: Desplegar Controlador
```bash
kubectl apply -f manifests/deployment.yaml
```

Resultado:
- Se despliega el pod del controlador
- El controlador se conecta a la API
- Comienza a observar recursos `DummySite`

### Paso 4: Crear un DummySite
```bash
kubectl apply -f manifests/dummysite-example.yaml
```

Resultado:
- El controlador recibe evento ADDED
- Descarga HTML desde https://example.com/
- Crea ConfigMap con el HTML
- Crea Deployment (nginx)
- Crea Service (LoadBalancer)

### Paso 5: Acceder al Sitio
```bash
kubectl get svc example-com-service
kubectl port-forward svc/example-com-service 8080:80
# Acceder a http://localhost:8080
```

## Estructura de Archivos

```
ejercicio5_1/
├── manifests/
│   ├── resourcedefinition.yaml      # Define CRD DummySite
│   ├── serviceaccount.yaml          # ServiceAccount para el controlador
│   ├── clusterrole.yaml             # Permisos del controlador
│   ├── clusterrolebinding.yaml      # Vinculación de permisos
│   ├── deployment.yaml              # Despliegue del controlador
│   ├── dummysite-example.yaml       # Recurso de prueba (example.com)
│   └── dummysite-kubernetes-wiki.yaml # Recurso de prueba (wiki)
│
├── controller/
│   ├── src/index.js                 # Código del controlador (Node.js)
│   ├── package.json                 # Dependencias
│   └── Dockerfile                   # Imagen del controlador
│
├── deploy.sh                        # Script de instalación
└── README.md                        # Este archivo
```

## Definición del CRD

```yaml
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: dummysites.stable.dwk      # Nombre único, formato: <plural>.<group>
spec:
  group: stable.dwk                 # API group: /apis/stable.dwk/v1
  scope: Namespaced                 # Puede existir en cualquier namespace
  names:
    kind: DummySite                 # Tipo de recurso (CamelCase)
    plural: dummysites              # Plural (URL: /dummysites)
    singular: dummysite             # Singular (alias CLI)
    shortNames: [ds]                # Abreviatura (kubectl get ds)
  versions:
    - name: v1
      served: true
      storage: true
      schema:
        openAPIV3Schema:
          type: object
          properties:
            spec:
              type: object
              required:
                - website_url
              properties:
                website_url:
                  type: string      # Propiedad: URL del sitio web
```

## Ejemplo de Recurso DummySite

```yaml
apiVersion: stable.dwk/v1
kind: DummySite
metadata:
  name: example-com              # Nombre único
spec:
  website_url: https://example.com/  # URL a copiar
```

Cuando aplicas esto:

```bash
$ kubectl apply -f dummysite-example.yaml

# Verificar que se creó
$ kubectl get dummysites
NAME           WEBSITE URL              AGE
example-com    https://example.com/     5s

# Versión corta
$ kubectl get ds
NAME           WEBSITE URL              AGE
example-com    https://example.com/     5s
```

## Controlador - Flujo Detallado

### 1. Inicialización

```javascript
// Conectar a la API de Kubernetes
const kc = new k8s.KubeConfig();
kc.loadFromCluster();  // Lee configuración desde /var/run/secrets/kubernetes.io/serviceaccount/

// Crear clientes API
const customObjectsApi = kc.makeApiClient(k8s.CustomObjectsApi);
const appsApi = kc.makeApiClient(k8s.AppsV1Api);
const k8sApi = kc.makeApiClient(k8s.CoreV1Api);
```

### 2. Watch de Cambios

```javascript
const watch = new k8s.Watch(kc);
await watch.stream(
  `/apis/stable.dwk/v1/dummysites`,  // Observar DummySites
  {},
  (type, apiObj) => {
    if (type === 'ADDED' || type === 'MODIFIED') {
      handleDummySiteAdded(apiObj);
    } else if (type === 'DELETED') {
      handleDummySiteDeleted(apiObj);
    }
  }
);
```

### 3. Descargar HTML

```javascript
async function downloadHtml(url) {
  // Hacer GET request a la URL
  // Retorna el HTML descargado
  // Modifica enlaces relativos para que sigan funcionando
}
```

### 4. Crear ConfigMap

```javascript
// Almacenar HTML como ConfigMap para que nginx lo sirva
const configMap = {
  apiVersion: 'v1',
  kind: 'ConfigMap',
  metadata: {
    name: `${name}-html`
  },
  data: {
    'index.html': htmlContent  // El HTML descargado
  }
};
await k8sApi.createNamespacedConfigMap(namespace, configMap);
```

### 5. Crear Deployment

```javascript
// Crear Deployment que ejecuta nginx
const deployment = {
  apiVersion: 'apps/v1',
  kind: 'Deployment',
  metadata: {
    name: `${name}-deployment`
  },
  spec: {
    replicas: 1,
    containers: [{
      name: 'web-server',
      image: 'nginx:alpine',
      volumeMounts: [{
        name: 'html-volume',
        mountPath: '/usr/share/nginx/html'
      }]
    }],
    volumes: [{
      name: 'html-volume',
      configMap: {
        name: `${name}-html`  // Montar ConfigMap como volumen
      }
    }]
  }
};
await appsApi.createNamespacedDeployment(namespace, deployment);
```

### 6. Crear Service

```javascript
// Crear Service para acceder a nginx
const service = {
  apiVersion: 'v1',
  kind: 'Service',
  metadata: {
    name: `${name}-service`
  },
  spec: {
    type: 'LoadBalancer',  // Asignar IP externa
    selector: {
      app: `dummysite-${name}`
    },
    ports: [{
      port: 80,
      targetPort: 80
    }]
  }
};
await k8sApi.createNamespacedService(namespace, service);
```

## RBAC Detallado

### ServiceAccount

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: dummysite-controller-account
  namespace: default
```

**Qué hace:**
- Crea una identidad para el controlador
- El pod usa esta cuenta para autenticarse con la API
- Kubernetes automáticamente monta el token en `/var/run/secrets/kubernetes.io/serviceaccount/token`

### ClusterRole

```yaml
kind: ClusterRole
metadata:
  name: dummysite-controller-role
rules:
# Puede leer y observar DummySites
- apiGroups: ["stable.dwk"]
  resources: ["dummysites"]
  verbs: ["get", "list", "watch", "delete"]

# Puede crear y gestionar Deployments
- apiGroups: ["apps"]
  resources: ["deployments"]
  verbs: ["get", "list", "create", "update", "patch", "delete"]

# Puede crear y gestionar Services
- apiGroups: [""]
  resources: ["services"]
  verbs: ["get", "list", "create", "update", "patch", "delete"]

# Puede gestionar ConfigMaps
- apiGroups: [""]
  resources: ["configmaps"]
  verbs: ["get", "list", "create", "update", "patch", "delete"]

# Puede ver Pods
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list", "delete"]
```

**Componentes:**
- `apiGroups`: Grupo de API ("stable.dwk", "apps", "", etc.)
- `resources`: Tipo de recurso ("dummysites", "deployments", etc.)
- `verbs`: Operaciones permitidas (get, list, watch, create, update, patch, delete)

### ClusterRoleBinding

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: dummysite-controller-rolebinding
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: dummysite-controller-role    # Role a usar
subjects:
- kind: ServiceAccount
  name: dummysite-controller-account  # A quién darle permisos
  namespace: default
```

**Qué hace:**
- Vincula la `ClusterRole` (permisos) con el `ServiceAccount` (identidad)
- Cualquier pod que use `serviceAccount: dummysite-controller-account` tendrá esos permisos

## Instalación y Prueba

### 1. Instalación Automática

```bash
# Hacer script ejecutable
chmod +x deploy.sh

# Ejecutar instalación
./deploy.sh
```

### 2. Instalación Manual

```bash
# Aplicar CRD
kubectl apply -f manifests/resourcedefinition.yaml

# Aplicar RBAC
kubectl apply -f manifests/serviceaccount.yaml
kubectl apply -f manifests/clusterrole.yaml
kubectl apply -f manifests/clusterrolebinding.yaml

# Construir imagen (si es necesario)
docker build -t dummysite-controller:v1 controller/
docker push your-registry/dummysite-controller:v1

# Actualizar deployment.yaml con tu registro
# Luego desplegar
kubectl apply -f manifests/deployment.yaml
```

### 3. Verificar Instalación

```bash
# Verificar CRD existe
kubectl get crd dummysites.stable.dwk

# Verificar RBAC
kubectl get sa dummysite-controller-account
kubectl get clusterrole dummysite-controller-role
kubectl get clusterrolebinding dummysite-controller-rolebinding

# Verificar controlador está corriendo
kubectl get deployment dummysite-controller-dep
kubectl get pods -l app=dummysite-controller

# Ver logs del controlador
kubectl logs -f -l app=dummysite-controller
```

### 4. Crear un DummySite

```bash
# Aplicar un recurso DummySite
kubectl apply -f manifests/dummysite-example.yaml

# Verificar que se creó
kubectl get dummysites
kubectl get ds  # Forma corta
kubectl describe dummysite example-com
```

### 5. Observar Creación de Recursos

El controlador creará automáticamente:

```bash
# Ver ConfigMaps
kubectl get configmaps
# Debería haber: example-com-html

# Ver Deployments
kubectl get deployments
# Debería haber: example-com-deployment

# Ver Services
kubectl get svc
# Debería haber: example-com-service (LoadBalancer)

# Ver Pods
kubectl get pods -l app=dummysite-example-com
```

### 6. Acceder al Sitio

```bash
# Para local (port-forward)
kubectl port-forward svc/example-com-service 8080:80

# Acceder en navegador
# http://localhost:8080/

# Para cloud (si tiene LoadBalancer externo)
kubectl get svc example-com-service
# Obtener EXTERNAL-IP y acceder directamente
```

### 7. Verificar Logs del Controlador

```bash
# Ver logs en tiempo real
kubectl logs -f deployment/dummysite-controller-dep

# Búsqueda de errores
kubectl logs deployment/dummysite-controller-dep | grep ERROR
```

## Limpiar Recursos

### Eliminar un DummySite

```bash
# El controlador automáticamente limpia todo
kubectl delete dummysite example-com

# Verificar que se elimina
kubectl get deployments
kubectl get svc
kubectl get configmaps
```

### Desinstalar Todo

```bash
# Eliminar Deployment del controlador
kubectl delete deployment dummysite-controller-dep

# Eliminar RBAC
kubectl delete clusterrolebinding dummysite-controller-rolebinding
kubectl delete clusterrole dummysite-controller-role
kubectl delete sa dummysite-controller-account

# Eliminar CRD
kubectl delete crd dummysites.stable.dwk
```

## Casos de Uso

### 1. Sitio Simple (example.com)

```yaml
apiVersion: stable.dwk/v1
kind: DummySite
metadata:
  name: example-site
spec:
  website_url: https://example.com/
```

### 2. Documentación

```yaml
apiVersion: stable.dwk/v1
kind: DummySite
metadata:
  name: kubernetes-docs
spec:
  website_url: https://kubernetes.io/docs/
```

### 3. Wiki

```yaml
apiVersion: stable.dwk/v1
kind: DummySite
metadata:
  name: kubernetes-wiki
spec:
  website_url: https://en.wikipedia.org/wiki/Kubernetes
```

## Limitaciones y Mejoras Futuras

### Limitaciones Actuales

1. **CSS/JS Rotos**: Enlaces complejos pueden no funcionar perfectamente
2. **Imágenes Externas**: Las imágenes siguen vinculadas al sitio original (no descargadas)
3. **JavaScript**: No ejecuta JavaScript del sitio original
4. **Responsividad**: Puede no ser totalmente responsive

### Mejoras Futuras

1. **Sincronización Periódica**: Re-descargar HTML cada N horas
2. **Descarga Completa**: Incluir CSS, imágenes, JavaScript
3. **Optimización**: Minificar HTML/CSS/JS
4. **Caché**: Cachear descargas para no re-descargar constantemente
5. **Validación**: Validar URLs antes de descargar
6. **Limites**: Limitar tamaño máximo de HTML descargado
7. **Status en CRD**: Agregar status field (DOWNLOADING, READY, ERROR)

## Lecciones Aprendidas

### 1. CRDs Extienden Kubernetes

Los CRDs permiten crear nuevos tipos de recursos que se comportan como recursos nativos.

**Ventaja**: Tu aplicación puede declarativamente usar Kubernetes como plataforma.

### 2. Controllers Implementan Lógica

El controlador observa cambios y actúa automáticamente.

**Patrón**: Watch → Compare → Act (reconcile loop)

### 3. RBAC Es Necesario

Sin RBAC configurado correctamente, el controlador no puede acceder a la API.

**Principio**: Least privilege - solo los permisos necesarios

### 4. API Client Libraries

Las bibliotecas cliente (como @kubernetes/client-node) abstractionan los detalles REST.

**Ventaja**: No necesitas hacer llamadas HTTP directas

### 5. Integración Declarativa

Todo está en YAML y controlado por Git.

**Resultado**: Infrastructure as Code (IaC) completo

## Referencias

- [Kubernetes API Documentation](https://kubernetes.io/docs/reference/kubernetes-api/)
- [Custom Resources API Reference](https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/)
- [Kubernetes Client Node Library](https://github.com/kubernetes-client/javascript)
- [Custom Controller Example - Go](https://github.com/kubernetes/sample-controller)
- [Operator Pattern](https://kubernetes.io/docs/concepts/extend-kubernetes/operator/)

## Comparación con Ejercicios Anteriores

| Aspecto | 4.10 (Separate Repos) | 5.1 (DIY CRD) |
|--------|----------------------|---------------|
| Extend Kubernetes | No | **Sí** |
| Nuevo tipo recurso | No | **Sí** |
| Observa cambios | (ArgoCD) | **Sí (Controller)** |
| Actúa automáticamente | (ArgoCD) | **Sí** |
| Código controlador | No | **Sí** |
| Patrón | GitOps | **Controller** |
| Complejidad | Media | **Alta** |

## Conclusión

Este ejercicio introduce el patrón de **Controllers** - el patrón fundamental para extender Kubernetes. Los Operators (aplicaciones que implementan domain knowledge como Controllers) son cada vez más importantes en el ecosistema Kubernetes.

Conceptos aplicados:
- ✅ Custom Resource Definitions (CRD)
- ✅ Controller Pattern (Watch → Compare → Act)
- ✅ Kubernetes API Client (Node.js)
- ✅ RBAC Configuration
- ✅ Dynamic Resource Creation
- ✅ Event-Driven Architecture

**Siguientes pasos:**
- Explorar Operators (etcd operator, Prometheus operator, etc.)
- Implementar controladores en Go (más performante)
- Agregar status fields y conditions al CRD
- Implementar finalizers para cleanup ordenado
