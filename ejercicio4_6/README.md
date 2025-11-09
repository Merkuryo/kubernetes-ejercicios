# Ejercicio 4.6: The Project Step 23 - NATS Broadcaster Service

## Objetivo

Implementar una arquitectura de microservicios con NATS como sistema de mensajería para broadcasting de eventos de TODO.

La aplicación está dividida en tres servicios:

1. **Backend**: API REST que maneja TODOs y publica eventos a NATS
2. **NATS**: Message Broker central (instalado vía Helm)
3. **Broadcaster**: Servicio escalable que consume eventos y los reenvía a servicios externos

## Arquitectura

```
┌─────────────┐
│   Backend   │ ─┐ Publica eventos "todo_events"
│   API REST  │  │
└─────────────┘  │
                 │
                 ▼
         ┌──────────────┐
         │    NATS      │ ◄─ Queue Group: "broadcasters"
         │  Message     │    (Evita duplicados)
         │   Broker     │
         └──────────────┘
                 ▲
                 │
         ┌──────┴──────────┬──────────────┐
         │                 │              │
    ┌────────────┐  ┌────────────┐  ┌────────────┐
    │Broadcaster │  │Broadcaster │  │Broadcaster │
    │ Instance 1 │  │ Instance 2 │  │ Instance 3 │
    │ (6 réplicas)│  │ (6 réplicas)│  │ (6 réplicas)│
    └────────────┘  └────────────┘  └────────────┘
         │                 │              │
         ▼                 ▼              ▼
    ┌─────────────────────────────────────────────┐
    │       External Services                     │
    ├─────────────────────────────────────────────┤
    │ • Discord (webhooks)                        │
    │ • Telegram (Bot API)                        │
    │ • Slack (webhooks)                          │
    │ • Generic HTTP endpoint                     │
    └─────────────────────────────────────────────┘
```

## Características

### Backend actualizado (`backend/src/index.js`)

El backend ahora publica eventos a NATS cuando se crean, actualizan o eliminan TODOs:

```javascript
// Evento publicado a "todo_events"
{
  event: "created|updated|deleted",
  todo: {
    id: 1,
    content: "Learn NATS",
    done: false,
    created: "2025-11-09T10:00:00Z",
    updated: "2025-11-09T10:00:00Z"
  },
  timestamp: "2025-11-09T10:00:00Z"
}
```

**Endpoints API**:

- `GET /todos` - Obtener todos los TODOs
- `POST /todos` - Crear nuevo TODO (publica evento)
- `PUT /todos/:id` - Actualizar estado done (publica evento)
- `DELETE /todos/:id` - Eliminar TODO (publica evento)
- `GET /health` - Health check

**Nuevo comportamiento**:

Cuando se modifica un TODO, se publica automáticamente a NATS:

```javascript
await publishToNATS('todo_events', {
  event: 'created',
  todo: newTodo,
  timestamp: new Date().toISOString(),
});
```

### Broadcaster Service (`broadcaster/src/index.js`)

Servicio completamente escalable que:

1. **Se suscribe a NATS** con queue group `broadcasters`
   - Múltiples instancias reciben mensajes sin duplicados
   - Cada mensaje es procesado por UNA sola instancia

2. **Convierte eventos** a formato de servicios externos

3. **Envía a servicios externos**:

   **Discord**:
   ```javascript
   POST {DISCORD_WEBHOOK_URL}
   {
     "embeds": [{
       "title": "📌 Nuevo TODO",
       "description": "**TODO #1**: Learn NATS\n**Estado**: 📝 Pendiente",
       "color": 16776960,
       "timestamp": "2025-11-09T10:00:00Z"
     }]
   }
   ```

   **Telegram**:
   ```javascript
   POST https://api.telegram.org/bot{TOKEN}/sendMessage
   {
     "chat_id": {CHAT_ID},
     "text": "📌 Nuevo TODO\n\n**TODO #1**: Learn NATS\n**Estado**: 📝 Pendiente",
     "parse_mode": "HTML"
   }
   ```

   **Slack**:
   ```javascript
   POST {SLACK_WEBHOOK_URL}
   {
     "text": "📌 Nuevo TODO",
     "blocks": [{
       "type": "section",
       "text": {
         "type": "mrkdwn",
         "text": "*📌 Nuevo TODO*\n**TODO #1**: Learn NATS\n**Estado**: 📝 Pendiente"
       }
     }]
   }
   ```

   **Generic HTTP**:
   ```javascript
   POST {EXTERNAL_SERVICE_URL}
   {
     "user": "broadcaster-bot",
     "event": "created",
     "message": "📌 Nuevo TODO",
     "todo": { ... },
     "timestamp": "2025-11-09T10:00:00Z"
   }
   ```

## Configuración

### 1. Instalar NATS con Helm

```bash
# Agregar repositorio Bitnami
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update

# Instalar NATS sin autenticación
helm install my-nats bitnami/nats --set auth.enabled=false

# Verificar instalación
kubectl get pods -l app.kubernetes.io/name=nats
kubectl get svc my-nats
```

### 2. Variables de entorno del Broadcaster

**Para Generic (por defecto)**:
```bash
EXTERNAL_SERVICE_TYPE=generic
EXTERNAL_SERVICE_URL=http://external-service:3001/messages
```

**Para Discord**:
```bash
EXTERNAL_SERVICE_TYPE=discord
DISCORD_WEBHOOK_URL=https://discordapp.com/api/webhooks/...
```

**Para Telegram**:
```bash
EXTERNAL_SERVICE_TYPE=telegram
TELEGRAM_BOT_TOKEN=123456:ABC-DEF...
TELEGRAM_CHAT_ID=987654321
```

**Para Slack**:
```bash
EXTERNAL_SERVICE_TYPE=slack
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

### 3. Crear Secrets (si usas servicios externos)

```bash
kubectl create secret generic broadcaster-secrets \
  --from-literal=DISCORD_WEBHOOK_URL="https://..." \
  --from-literal=TELEGRAM_BOT_TOKEN="..." \
  --from-literal=TELEGRAM_CHAT_ID="..." \
  --from-literal=SLACK_WEBHOOK_URL="..."
```

## Deployment

### Build local (para desarrollo)

```bash
# Backend
cd backend
docker build -t todo-backend:latest .
docker tag todo-backend:latest docker.io/your-registry/todo-backend:latest
docker push docker.io/your-registry/todo-backend:latest

# Broadcaster
cd broadcaster
docker build -t todo-broadcaster:latest .
docker tag todo-broadcaster:latest docker.io/your-registry/todo-broadcaster:latest
docker push docker.io/your-registry/todo-broadcaster:latest
```

### Deploy a Kubernetes

```bash
# 1. Crear namespace (opcional)
kubectl create namespace todos

# 2. Instalar PostgreSQL
kubectl apply -f manifests/postgres.yaml

# 3. Instalar NATS
helm install my-nats bitnami/nats --set auth.enabled=false

# 4. Deploy backend
kubectl apply -f manifests/backend.yaml

# 5. Deploy broadcaster (6 réplicas - evita duplicados con queue group)
kubectl apply -f manifests/broadcaster.yaml

# Verificar
kubectl get pods
kubectl get svc
```

## Testing

### 1. Acceder al backend

```bash
# Port-forward
kubectl port-forward svc/backend 3000:3000

# Crear TODO
curl -X POST http://localhost:3000/todos \
  -H "Content-Type: application/json" \
  -d '{"content": "Aprender NATS"}'

# Actualizar TODO (marca como completado)
curl -X PUT http://localhost:3000/todos/1 \
  -H "Content-Type: application/json" \
  -d '{"done": true}'

# Obtener todos
curl http://localhost:3000/todos
```

### 2. Verificar NATS

```bash
# Monitoreo de NATS
kubectl port-forward svc/my-nats 8222:8222
# Acceder a http://localhost:8222

# Ver logs de broadcaster
kubectl logs -f deployment/broadcaster-dep --all-containers=true
```

### 3. Verificar cola de NATS sin duplicados

```bash
# Crear 10 TODOs rápidamente
for i in {1..10}; do
  curl -X POST http://localhost:3000/todos \
    -H "Content-Type: application/json" \
    -d "{\"content\": \"TODO $i\"}"
  sleep 0.5
done

# Ver logs de broadcaster
kubectl logs -f deployment/broadcaster-dep

# Esperado:
# [Message] Received: created for TODO #1
# [Message] Received: created for TODO #2
# ...
# (cada mensaje procesado por UNA sola instancia, NO múltiples)
```

## Implementación de Queue Group en Broadcaster

El broadcaster usa **queue group** de NATS para garantizar que múltiples réplicas no dupliquen mensajes:

```javascript
// Sin queue group (todos reciben todos los mensajes - ❌ DUPLICADOS):
const sub = natsConnection.subscribe('todo_events');

// Con queue group (cada mensaje a una sola instancia - ✅ CORRECTO):
const sub = natsConnection.subscribe('todo_events', { 
  queue: 'broadcasters' 
});
```

Con 6 réplicas de broadcaster y queue group:
- **Instancia 1** procesa TODO #1
- **Instancia 2** procesa TODO #2
- **Instancia 3** procesa TODO #3
- **Instancia 1** procesa TODO #4
- (distribución automática sin duplicados)

## Monitoreo

### Ver estado de NATS

```bash
kubectl port-forward svc/my-nats 8222:8222
# http://localhost:8222
```

### Ver logs del backend

```bash
kubectl logs -f deployment/backend-dep
```

### Ver logs del broadcaster

```bash
# Todos los pods del broadcaster
kubectl logs -f deployment/broadcaster-dep --all-containers=true --tail=50

# Pod específico
kubectl logs -f broadcaster-dep-xxxxx
```

### Verificar health check

```bash
curl http://backend:3000/health -s | jq
```

Respuesta:
```json
{
  "status": "ok",
  "database": "connected",
  "nats": "connected"
}
```

## Arquitectura de datos

### Flujo de evento

1. **Usuario crea TODO**: `POST /todos` → Backend
2. **Backend guarda en BD** y **publica a NATS**
3. **NATS** recibe en subject `todo_events` con queue group
4. **Broadcaster instance X** recibe el evento (solo 1 de 6)
5. **Broadcaster** formatea y envía a servicio externo
6. **Servicio externo** recibe el mensaje

### Garantías

- ✅ **Al menos una entrega**: NATS con Core (los TODOs se guardaron)
- ✅ **Sin duplicados**: Queue group garantiza una sola entrega a broadcasters
- ✅ **Escalable**: Agregar más replicas no causa duplicados
- ❌ **No es garantía exacta-una-vez**: Broadcaster puede fallar después de enviar

Para garantía exacta-una-vez usar **Jetstream** (más avanzado).

## Casos de uso

### Integración con Discord

Notificaciones en tiempo real en servidor Discord del equipo:

```bash
# Crear secret con webhook
kubectl create secret generic broadcaster-secrets \
  --from-literal=DISCORD_WEBHOOK_URL="https://discordapp.com/api/webhooks/..."

# Actualizar deployment
kubectl set env deployment/broadcaster-dep \
  EXTERNAL_SERVICE_TYPE=discord
```

### Integración con Telegram

Notificaciones en bot de Telegram:

```bash
# Crear bot en BotFather y obtener token y chat_id
kubectl create secret generic broadcaster-secrets \
  --from-literal=TELEGRAM_BOT_TOKEN="..." \
  --from-literal=TELEGRAM_CHAT_ID="..."

# Actualizar deployment
kubectl set env deployment/broadcaster-dep \
  EXTERNAL_SERVICE_TYPE=telegram
```

## Troubleshooting

### NATS no conecta

```bash
# Verificar NATS está corriendo
kubectl get pods -l app.kubernetes.io/name=nats

# Ver logs de NATS
kubectl logs -f deploy/my-nats

# Verificar servicio
kubectl get svc my-nats

# Probar conectar localmente
kubectl port-forward svc/my-nats 4222:4222
```

### Backend no publica a NATS

```bash
# Ver logs del backend
kubectl logs -f deployment/backend-dep

# Verificar variable NATS_URL
kubectl describe pod backend-dep-xxxxx | grep NATS

# El backend debe mostrar:
# [NATS] Connected to NATS server: nats://my-nats:4222
```

### Broadcaster no recibe mensajes

```bash
# Ver logs del broadcaster
kubectl logs -f deployment/broadcaster-dep

# Debe mostrar:
# [Broadcaster] Subscribed to todo_events (queue: broadcasters)

# Si no hay mensajes, crear uno en backend
curl -X POST http://backend:3000/todos \
  -H "Content-Type: application/json" \
  -d '{"content": "Test"}'

# Ver en logs del broadcaster
```

### Duplicados en broadcaster

**Problema**: Si hay duplicados al crear TODOs

**Causa**: No usar queue group o usar replicas con problemas

**Solución**:
```javascript
// Correcto (SIN duplicados)
const sub = natsConnection.subscribe('todo_events', { queue: 'broadcasters' });

// Incorrecto (CON duplicados)
const sub = natsConnection.subscribe('todo_events');
```

## Archivos

```
ejercicio4_6/
├── backend/
│   ├── src/
│   │   └── index.js (Node.js Express + NATS client)
│   ├── Dockerfile
│   └── package.json
├── broadcaster/
│   ├── src/
│   │   └── index.js (NATS subscriber + External services)
│   ├── Dockerfile
│   └── package.json
├── manifests/
│   ├── postgres.yaml (Database)
│   ├── backend.yaml (Backend deployment + service)
│   ├── broadcaster.yaml (Broadcaster deployment - 6 replicas)
│   └── nats-values.yaml (Helm values para NATS)
└── README.md (Este archivo)
```

## Resumen

✅ **Backend**: Publica eventos a NATS
✅ **Broadcaster**: Consume eventos sin duplicados (queue group)
✅ **Escalabilidad**: 6 replicas sin problemas
✅ **Integración**: Soporta Discord, Telegram, Slack, Generic
✅ **Testing**: Verificado con múltiples réplicas
✅ **Monitoreo**: NATS metrics + logs

## Próximos pasos

- Ejercicio 4.7: Agregar persistencia con Jetstream
- Ejercicio 4.8: Dead letter queues para mensajes fallidos
- Ejercicio 4.9: Múltiples broadcasters con roles diferentes
- Ejercicio 4.10: Métricas de Prometheus para NATS

## Referencias

- [NATS Documentation](https://docs.nats.io/)
- [nats.js Library v1.5](https://github.com/nats-io/nats.js)
- [NATS Helm Chart](https://github.com/bitnami/charts/tree/main/bitnami/nats)
- [NATS Queue Groups](https://docs.nats.io/using-nats/developing-with-nats/receiving/queues)
