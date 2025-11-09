# Ejercicio 4.5 — The Project, Step 22 — "Done" Field Implementation

## Objetivo

Añadir funcionalidad de marcar todos como "completados" implementando:
- Campo booleano `done` en la tabla de base de datos
- Endpoint PUT `/todos/<id>` para actualizar el estado
- Migración automática de base de datos existente

## Cambios Implementados

### 1. Schema de Base de Datos

Se añadió el campo `done` a la tabla `todos`:

```sql
ALTER TABLE todos ADD COLUMN done BOOLEAN DEFAULT FALSE;
```

**Estructura completa de tabla:**
```
todos
├── id (SERIAL PRIMARY KEY)
├── content (VARCHAR(140))
├── done (BOOLEAN DEFAULT FALSE) ← NUEVO
├── created (TIMESTAMP DEFAULT NOW())
└── updated (TIMESTAMP DEFAULT NOW())
```

### 2. Migración Automática

El servidor intenta añadir la columna `done` automáticamente en el inicio:

```javascript
try {
  await client.query('ALTER TABLE todos ADD COLUMN done BOOLEAN DEFAULT FALSE');
  console.log('Added "done" column to todos table');
} catch (err) {
  if (!err.message.includes('column "done" of relation "todos" already exists')) {
    throw err;
  }
}
```

**Ventajas:**
- ✅ Compatibilidad con bases de datos existentes
- ✅ Sin scripts SQL manuales
- ✅ Idempotente (puede ejecutarse múltiples veces)

### 3. Endpoint PUT `/todos/:id`

Actualiza el estado `done` de un todo existente.

**Request:**
```bash
curl -X PUT http://localhost:3000/todos/1 \
  -H "Content-Type: application/json" \
  -d '{"done": true}'
```

**Response (201 OK):**
```json
{
  "id": 1,
  "content": "Learn Kubernetes",
  "done": true,
  "created": "2025-11-09T12:00:00.000Z",
  "updated": "2025-11-09T12:15:00.000Z"
}
```

**Validaciones:**
- ✅ ID debe ser numérico válido
- ✅ Done debe ser booleano
- ✅ Todo debe existir (404 si no)
- ✅ Registra timestamp `updated`

### 4. Actualización de Endpoints Existentes

#### GET /todos
Ahora retorna el campo `done`:

```json
[
  {
    "id": 1,
    "content": "Learn Kubernetes",
    "done": false,
    "created": "2025-11-09T12:00:00.000Z"
  }
]
```

#### POST /todos
Crea nuevos todos con `done = FALSE`:

```bash
curl -X POST http://localhost:3000/todos \
  -H "Content-Type: application/json" \
  -d '{"content": "Implement Done field"}'
```

## Ejemplos de Uso

### Crear un nuevo todo

```bash
curl -X POST http://localhost:3000/todos \
  -H "Content-Type: application/json" \
  -d '{"content": "Complete this exercise"}'
```

### Obtener todos los todos

```bash
curl http://localhost:3000/todos
```

### Marcar un todo como completado

```bash
curl -X PUT http://localhost:3000/todos/1 \
  -H "Content-Type: application/json" \
  -d '{"done": true}'
```

### Marcar un todo como no completado (deshacer)

```bash
curl -X PUT http://localhost:3000/todos/1 \
  -H "Content-Type: application/json" \
  -d '{"done": false}'
```

## Despliegue en Kubernetes

### Construir imagen Docker

```bash
cd ejercicio4_5
docker build -t todos-backend-v2:latest .
```

### Desplegar manifests

```bash
kubectl apply -f manifests/
```

**Recursos creados:**
- StatefulSet: PostgreSQL database
- Service: Database (headless)
- Service: Backend API (ClusterIP)
- Deployment: Backend API pods
- ConfigMap: Database configuration
- Secret: Database credentials

### Verificar despliegue

```bash
# Ver pods
kubectl get pods -l app=todos-backend

# Ver logs
kubectl logs -l app=todos-backend -f

# Health check
curl http://localhost:3000/health
```

## Cambios de Código

### Backend (Node.js/Express)

**Antes:**
```javascript
const result = await client.query('SELECT id, content, created FROM todos');
```

**Después:**
```javascript
const result = await client.query('SELECT id, content, done, created FROM todos');
```

## API Summary

| Método | Endpoint | Descripción | Status |
|--------|----------|-------------|--------|
| GET | `/todos` | Obtener todos | 200 |
| POST | `/todos` | Crear todo | 201 |
| PUT | `/todos/:id` | Actualizar done status | 200 |
| GET | `/health` | Health check | 200 |

## Errores Comunes

### 400 - Invalid todo ID
```json
{"error": "Invalid todo ID"}
```
**Solución:** Verificar que el ID sea numérico.

### 400 - Done field must be a boolean
```json
{"error": "Done field must be a boolean"}
```
**Solución:** `done` debe ser `true` o `false`, no string.

### 404 - Todo not found
```json
{"error": "Todo not found"}
```
**Solución:** El ID especificado no existe en la base de datos.

## Testing

### Con curl

```bash
# Crear un todo
TODO_ID=$(curl -s -X POST http://localhost:3000/todos \
  -H "Content-Type: application/json" \
  -d '{"content": "Test todo"}' | jq -r '.id')

# Marcar como completado
curl -X PUT http://localhost:3000/todos/$TODO_ID \
  -H "Content-Type: application/json" \
  -d '{"done": true}'

# Verificar
curl http://localhost:3000/todos | jq ".[] | select(.id==$TODO_ID)"
```

### Con JavaScript

```javascript
// Obtener todos
const todos = await fetch('http://localhost:3000/todos').then(r => r.json());

// Marcar todo como completado
await fetch('http://localhost:3000/todos/1', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ done: true })
});
```

## Versiones

- **v4.5**: Implementación inicial del campo "Done"
- Base de datos: PostgreSQL
- API: Express.js
- Node.js: 20 (Alpine)

## Referencias

- [Express.js PUT Method](https://expressjs.com/en/api/app.html#app.put)
- [PostgreSQL ALTER TABLE](https://www.postgresql.org/docs/current/sql-altertable.html)
- [HTTP PUT Method](https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods/PUT)

