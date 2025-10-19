# Ejercicio 2.2: The Project - Step 8 - Todo Backend Service

## Descripción

En este ejercicio implementamos la separación del la aplicación de TODOs en dos servicios:

1. **todo-app**: Frontend SPA (Single Page Application) que sirve HTML/CSS/JS al navegador
2. **todo-backend**: Backend que gestiona la persistencia de TODOs vía API HTTP

El frontend se comunica con el backend a través de HTTP usando Service DNS para descubrimiento de servicios.

## Arquitectura

```
┌─────────────────┐
│   Browser       │
└────────┬────────┘
         │ HTTP
         ▼
┌─────────────────────┐
│   todo-app Pod      │
│  (Frontend SPA)     │
└────────┬────────────┘
         │ HTTP
         │ to: todo-backend-svc:3000
         ▼
┌─────────────────────┐
│  todo-backend Pod   │
│   (Backend API)     │
│ GET/POST /todos     │
└─────────────────────┘
```

## Componentes

### todo-app (Frontend)
- **Puerto**: 3000
- **Servicio**: NodePort 30003 (acceso externo)
- **Características**:
  - SPA que renderiza HTML dinámico
  - Obtiene la lista de TODOs del backend vía HTTP
  - Permite crear nuevos TODOs con validación (140 caracteres)
  - Auto-refresca cada 5 segundos
  - Incluye generador de imágenes aleatorias
  - Contador de pings local

### todo-backend (Backend API)
- **Puerto**: 3000
- **Servicio**: ClusterIP (solo acceso interno)
- **Endpoints**:
  - `GET /todos` - Obtiene lista de TODOs
  - `POST /todos` - Crea un nuevo TODO
  - `GET /health` - Health check
- **Características**:
  - TODOs almacenados en memoria
  - Validación de contenido (máximo 140 caracteres)
  - Inicializa con 4 TODOs predeterminados
  - Logging de operaciones

## Uso

### Construcción de imágenes

```bash
cd ejercicio2_2

# Construir imagen del backend
docker build -t todo-backend-app todo-backend/

# Construir imagen del frontend
docker build -t todo-app-app todo-app/
```

### Importar en k3d

```bash
# Guardar imágenes en tar
docker save todo-backend-app todo-app-app > apps.tar

# Importar en cluster k3d
k3d image import apps.tar
```

### Desplegar en Kubernetes

```bash
# Aplicar manifiestos
kubectl apply -f manifests/

# Verificar pods
kubectl get pods

# Verificar servicios
kubectl get svc

# Ver logs del backend
kubectl logs -f deployment/todo-backend-dep

# Ver logs del frontend
kubectl logs -f deployment/todo-app-dep
```

### Acceso

```bash
# Port-forward al frontend (en otra terminal)
kubectl port-forward svc/todo-app-svc 3000:3000

# O directamente via NodePort en la máquina host
http://localhost:30003
```

## Validación

1. Abrir `http://localhost:3000` en el navegador
2. Ver los 4 TODOs predeterminados
3. Crear un nuevo TODO con el formulario
4. Verificar que aparece inmediatamente en la lista
5. Recargar la página - debe mantener los TODOs creados
6. Ver logs con `kubectl logs -f deployment/todo-backend-dep`

## Conceptos Kubernetes

- **Deployment**: Para desplegar los dos servicios
- **Service (ClusterIP)**: Para comunicación interna (backend)
- **Service (NodePort)**: Para acceso externo (frontend)
- **Service DNS Discovery**: `todo-backend-svc:3000`
- **Environment Variables**: Para configurar URL del backend
- **Inter-pod Communication**: HTTP entre los dos servicios

## Diferencias respecto a ejercicios anteriores

- Separación de frontend y backend
- API HTTP en lugar de archivos compartidos
- Almacenamiento en memoria (paso previo a base de datos)
- SPA completo con JavaScript vanilla
- Múltiples servicios comunicándose entre sí

## Siguiente paso

En ejercicios posteriores se agregaría:
- Base de datos persistente (PostgreSQL, MongoDB, etc.)
- Almacenamiento en PersistentVolume
- Mejor manejo de errores
- Autenticación/Autorización
