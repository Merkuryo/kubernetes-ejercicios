# Exercise 2.1: Connecting Pods

## Description

Este ejercicio demuestra la comunicación entre pods usando HTTP en lugar de compartir volúmenes. El objetivo es conectar la aplicación Log Output con la aplicación Ping Pong mediante un endpoint HTTP.

### Arquitectura

```
Log Output Pod (puerto 3000)
        ↓
    HTTP GET
        ↓
Ping Pong Service (pingpong-svc:3000)
        ↓
Ping Pong Pod (puerto 3000)
```

## Aplicaciones

### Ping Pong Application
- **Propósito**: Expone un contador de pings vía HTTP
- **Endpoint GET /**: Incrementa y devuelve el contador
- **Endpoint GET /count**: Devuelve el contador sin incrementar
- **Puerto**: 3000

### Log Output Application
- **Propósito**: Muestra información de sesión y consulta el contador de pings
- **Consulta**: Realiza HTTP GET a `http://pingpong-svc:3000/count`
- **Endpoints**:
  - `GET /`: Página principal HTML
  - `GET /raw`: Datos en formato texto
  - `GET /api/data`: Datos en JSON
- **Puerto**: 3000

## Estructura de Archivos

```
ejercicio2_1/
├── ping-pong/
│   ├── Dockerfile
│   ├── package.json
│   └── src/index.js
├── log-output/
│   ├── Dockerfile
│   ├── package.json
│   └── src/index.js
├── manifests/
│   ├── pingpong.yaml      # Service + Deployment para ping-pong
│   └── logoutput.yaml     # Service + Deployment para log-output
└── README.md
```

## Instalación y Uso

### Local (sin Kubernetes)

```bash
# Terminal 1: Ping Pong
cd ping-pong
npm install
npm start

# Terminal 2: Log Output
cd log-output
npm install
PING_PONG_URL=http://localhost:3001 npm start

# Luego cambiar puerto de ping-pong a 3001
```

### En Kubernetes

```bash
# Construir imágenes
docker build -t pingpong-app ping-pong/
docker build -t logoutput-app log-output/

# Cargar en k3d
docker save pingpong-app > manifests/pingpong.tar
docker save logoutput-app > manifests/logoutput.tar
k3d image import manifests/pingpong.tar manifests/logoutput.tar

# Aplicar manifiestos
kubectl apply -f manifests/pingpong.yaml
kubectl apply -f manifests/logoutput.yaml

# Acceder
kubectl port-forward svc/logoutput-svc 3000:3000
# Luego: http://localhost:3000
```

## Flujo de Comunicación

1. **Usuario accede a Log Output**: `http://localhost:3000/`
2. **Log Output recibe solicitud** y hace:
   ```javascript
   GET http://pingpong-svc:3000/count
   ```
3. **Ping Pong Service** enruta la solicitud a su pod
4. **Ping Pong Pod** devuelve:
   ```json
   { "pongs": 3 }
   ```
5. **Log Output** integra el dato y devuelve HTML con la información

## Descubrimiento de Servicios

Kubernetes proporciona DNS automático:
- **Nombre del servicio**: `pingpong-svc`
- **Namespace**: `default`
- **FQDN completo**: `pingpong-svc.default.svc.cluster.local`
- **URL**: `http://pingpong-svc:3000`

## Resolución de Problemas

### Verificar conectividad con busybox

```bash
# Crear pod de debug
kubectl run -it --rm debug --image=busybox --restart=Never -- sh

# Dentro del pod
wget -qO - http://pingpong-svc:3000/count
```

### Ver logs

```bash
kubectl logs -l app=logoutput
kubectl logs -l app=pingpong
```

### Describir servicios

```bash
kubectl get svc
kubectl describe svc pingpong-svc
```

## Conceptos Clave

- **Service Discovery**: Kubernetes DNS automático
- **Inter-pod Communication**: HTTP entre pods
- **ClusterIP Service**: Para comunicación interna
- **NodePort Service**: Para acceso externo
- **Deployment**: Gestión automática de pods
