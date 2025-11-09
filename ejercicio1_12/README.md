# Exercise 1.12: The Project, Step 6

## Description

Extensión del proyecto con funcionalidades adicionales:

1. **Log Output**: Genera un ID aleatorio y muestra log con timestamp cada 5 segundos
2. **Ping Pong**: Contador de solicitudes
3. **Image Caching**: Descarga una imagen aleatoria de Lorem Picsum y la cachea por 10 minutos

## Features

- 📸 **Caché de Imagen (10 minutos)**: 
  - Descarga imágenes aleatorias de https://picsum.photos/1200
  - Las almacena en un volumen
  - Después de 10 minutos, descarga una nueva imagen
  - Persiste a través de reinicios de contenedores

- 📝 **Log Output**:
  - ID aleatorio generado en el inicio
  - Timestamp y contador de pings cada 5 segundos
  - Persiste en volumen

- 🏓 **Ping Pong**:
  - Contador de solicitudes
  - Accesible en `/pingpong`

## Estructura de Archivos

```
ejercicio1_12/
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

### Local (sin Kubernetes)

```bash
cd ejercicio1_12

# Instalar dependencias
npm install

# Ejecutar
npm start

# Acceder a http://localhost:3000
```

### En Kubernetes

```bash
# Construir imagen
docker build -t project-app .

# Aplicar manifiestos
kubectl apply -f manifests/deployment.yaml
kubectl apply -f manifests/service.yaml
kubectl apply -f manifests/ingress.yaml

# Acceder a http://localhost:8081
```

## Cómo Funciona el Caché de Imagen

1. **Primera solicitud**: Descarga imagen de Lorem Picsum y la guarda en `/usr/src/app/data/image.jpg`
2. **Próximas 10 minutos**: Sirve la imagen cacheada sin descargar
3. **Después de 10 minutos**: En la siguiente solicitud, descarga una imagen nueva
4. **Persistencia**: Si el contenedor se reinicia, usa la imagen cacheada si aún está dentro del período de 10 minutos

## Endpoints

- `GET /`: Página principal con imagen, log output y contador
- `GET /image`: Imagen cacheada (JPEG)
- `GET /pingpong`: Incrementa y devuelve el contador de pings
- `GET /health`: Health check

## Volúmenes Requeridos

La aplicación requiere un volumen compartido montado en `/usr/src/app/data` para:
- Cachear la imagen
- Almacenar el log
- Guardar metadata de la imagen (timestamp de descarga)

## Technical Notes

- Las imágenes se cachean por un período de 10 minutos basado en timestamps
- La metadata de la imagen se almacena en `image-metadata.json` para persistencia
- El contenedor puede ser reiniciado sin perder la imagen cacheada
- Si el servidor no puede descargar la imagen (sin conexión), usará la versión cacheada si existe
