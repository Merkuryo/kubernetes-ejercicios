# Ejercicio 1.13: The Project, Step 7

## Descripción

Extensión del proyecto agregando funcionalidad de TODO app. El proyecto ahora incluye:

1. **Log Output**: ID aleatorio con timestamps
2. **Ping Pong**: Contador de solicitudes
3. **Image Caching**: Imágenes cacheadas por 10 minutos
4. **TODO App**: ✨ **NUEVO** - Gestión de tareas con validación

## Características Nuevas

- 📝 **Campo de entrada de TODO**:
  - Límite de 140 caracteres
  - Indicador de caracteres usado
  - Validación en tiempo real

- ✅ **Lista de TODOs**:
  - TODOs predeterminados al iniciar
  - Interfaz visual clara
  - Estados completado/pendiente
  - Estilos responsivos

- 🔘 **Botón Enviar**:
  - Validación de entrada
  - Soporte para Enter
  - Retroalimentación visual

- 🎨 **Interfaz Mejorada**:
  - Diseño moderno con gradientes
  - Layout responsivo
  - Estadísticas actualizadas

## Estructura de Archivos

```
ejercicio1_13/
├── Dockerfile
├── package.json
├── README.md
├── src/
│   └── index.js
└── manifests/
    ├── deployment.yaml
    ├── service.yaml
    └── ingress.yaml
```

## Instalación y Uso

### Local

```bash
cd ejercicio1_13
npm install
npm start

# Acceder a http://localhost:3000
```

### En Kubernetes

```bash
# Construir imagen
docker build -t project-app:1.13 .

# Aplicar manifiestos
kubectl apply -f manifests/deployment.yaml
kubectl apply -f manifests/service.yaml
kubectl apply -f manifests/ingress.yaml

# Acceder a http://localhost:8081
```

## TODOs Predeterminados

La aplicación inicia con 4 TODOs de ejemplo:
- ✅ Implement TODO app functionality
- ✅ Add image caching feature
- ⬜ Create responsive HTML interface
- ✅ Deploy to Kubernetes

## Endpoints

- `GET /`: Página principal con TODO app
- `GET /image`: Imagen cacheada (JPEG)
- `GET /pingpong`: Incrementa contador de pings
- `GET /api/todos`: Obtiene lista de TODOs (JSON)
- `POST /api/todos`: Agrega nuevo TODO
- `GET /health`: Health check

## Validaciones

- **TODO máximo 140 caracteres**: 
  - Indicador visual en la página
  - Validación en backend
  - Prevención de envíos inválidos

- **No TODOs vacíos**:
  - Campo requerido
  - Validación en JS y backend

## Notas Técnicas

- Frontend validación con contador de caracteres
- Backend API RESTful para TODOs
- Persistencia en volumen (`todos.json`)
- Interfaz HTML5 completa
- Estilos CSS3 modernos con responsive design
- TODOs se cargan al iniciar la aplicación
