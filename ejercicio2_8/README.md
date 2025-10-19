# Ejercicio 2.8: The Project, Step 11 - TODO App with Database

## Descripción

En este ejercicio completamos la aplicación TODO con **persistencia en base de datos**. Los TODOs ahora se almacenan en PostgreSQL en lugar de memoria, lo que significa:

- ✅ Los TODOs persisten entre reinicios de pods
- ✅ Los TODOs se comparten entre múltiples instancias del backend
- ✅ Usamos Secrets para credenciales sensibles
- ✅ Usamos ConfigMaps para configuración no-sensible
- ✅ El backend se conecta automáticamente a PostgreSQL

## Arquitectura

```
NAMESPACE: project
├── StatefulSet: todos-db-stset (PostgreSQL)
│   └── Pod: todos-db-stset-0
│       ├── Image: postgres:15-alpine
│       ├── PVC: todos-db-data-storage-todos-db-stset-0 (1Gi)
│       └── Service: todos-db-svc (Headless, clusterIP: None)
│
├── Deployment: todo-backend-db-dep
│   └── Pod: todo-backend-db-dep-*
│       ├── Image: todo-backend-app
│       ├── conecta a: PostgreSQL via todos-db-svc
│       └── Service: todo-backend-db-svc (ClusterIP)
│
└── Deployment: todo-app-db-dep
    └── Pod: todo-app-db-dep-*
        ├── Image: todo-app-app
        ├── conecta a: Backend via todo-backend-db-svc
        └── Service: todo-app-db-svc (NodePort 30008)

ConfigMaps & Secrets:
├── ConfigMap: todos-db-config
│   ├── DB_HOST: "todos-db-stset-0.todos-db-svc"
│   ├── DB_PORT: "5432"
│   ├── DB_NAME: "todos_db"
│   └── DB_USER: "todos_user"
└── Secret: todos-db-secret
    └── DB_PASSWORD: (base64 encoded)
```

## Concepto: Secrets vs ConfigMaps

| Aspecto | ConfigMap | Secret |
|---------|-----------|--------|
| **Objetivo** | Configuración no-sensible | Datos sensibles |
| **Encoding** | Texto plano | Base64 (no encriptado por defecto) |
| **Ejemplo** | DB_HOST, DB_PORT | DB_PASSWORD, API_KEYS |
| **Tamaño máximo** | 1MB | 1MB |
| **Buena práctica** | Variables de entorno | Encriptar en transit/at-rest |

**Nota:** En producción, los Secrets deben estar encriptados. K3s lo permite configurando `--secrets-encryption` en la API server.

### Crear Secret desde línea de comandos:

```bash
# Método 1: Base64 manualmente
echo -n "todos_db_password123" | base64
# Resultado: dG9kb3NfZGJfcGFzc3dvcmQxMjM=

# Método 2: Kubectl (recomendado en scripts)
kubectl create secret generic todos-db-secret \
  --from-literal=DB_PASSWORD=todos_db_password123 \
  -n project --dry-run=client -o yaml | kubectl apply -f -
```

## Cambios en el Backend TODO

### Antes (en-memoria):

```javascript
let todos = [
  { id: 1, content: 'Learn Kubernetes', created: new Date().toISOString() },
  ...
];

app.get('/todos', (req, res) => {
  res.json(todos);
});

app.post('/todos', (req, res) => {
  const newTodo = { id: nextId++, content, created: new Date().toISOString() };
  todos.push(newTodo);
  res.json(newTodo);
});
```

### Ahora (PostgreSQL):

```javascript
const { Pool } = require('pg');
const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

app.get('/todos', async (req, res) => {
  const client = await pool.connect();
  const result = await client.query(
    'SELECT id, content, created FROM todos ORDER BY created DESC'
  );
  client.release();
  res.json(result.rows.map(row => ({
    id: row.id,
    content: row.content,
    created: row.created.toISOString()
  })));
});

app.post('/todos', async (req, res) => {
  const client = await pool.connect();
  const result = await client.query(
    'INSERT INTO todos (content) VALUES ($1) RETURNING id, content, created',
    [content.trim()]
  );
  client.release();
  res.json({
    id: result.rows[0].id,
    content: result.rows[0].content,
    created: result.rows[0].created.toISOString()
  });
});
```

### Tabla de Base de Datos:

```sql
CREATE TABLE IF NOT EXISTS todos (
  id SERIAL PRIMARY KEY,
  content VARCHAR(140) NOT NULL,
  created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Inyección de Credenciales con envFrom

### Método 1: envFrom configMapRef (ConfigMap completo como variables)

```yaml
containers:
- name: app
  envFrom:
  - configMapRef:
      name: todos-db-config
  # Resultado: DB_HOST, DB_PORT, DB_NAME, DB_USER disponibles como env vars
```

### Método 2: envFrom secretRef (Secret completo como variables)

```yaml
containers:
- name: app
  envFrom:
  - secretRef:
      name: todos-db-secret
  # Resultado: DB_PASSWORD disponible como env var
```

### Método 3: valueFrom (variable individual desde ConfigMap/Secret)

```yaml
containers:
- name: app
  env:
  - name: DB_PASSWORD
    valueFrom:
      secretKeyRef:
        name: todos-db-secret
        key: DB_PASSWORD
```

**En este ejercicio usamos Método 1 + 2 para mayor claridad:**

```yaml
envFrom:
- configMapRef:
    name: todos-db-config
- secretRef:
    name: todos-db-secret
```

## Estructura de Archivos

```
ejercicio2_8/
├── README.md
└── manifests/
    ├── configmap.yaml         # Configuración no-sensible
    ├── secret.yaml            # Contraseña (base64)
    ├── service.yaml           # Headless Service para PostgreSQL
    ├── statefulset.yaml       # StatefulSet de PostgreSQL
    ├── deployment-backend.yaml # Backend TODO con DB
    └── deployment-frontend.yaml # Frontend TODO
```

## Despliegue Paso a Paso

### 1. Aplicar ConfigMap, Secret y Headless Service

```bash
kubectl apply -f manifests/configmap.yaml
kubectl apply -f manifests/secret.yaml
kubectl apply -f manifests/service.yaml
```

### 2. Aplicar StatefulSet de PostgreSQL

```bash
kubectl apply -f manifests/statefulset.yaml
kubectl wait --for=condition=ready pod -l app=todos-db -n project --timeout=300s
```

### 3. Construir e importar imagen del backend

```bash
cd ejercicio2_2/todo-backend
docker build -t todo-backend-app .
docker save todo-backend-app > app.tar
k3d image import app.tar -c k3s-default
```

### 4. Aplicar Deployments

```bash
kubectl apply -f manifests/deployment-backend.yaml
kubectl apply -f manifests/deployment-frontend.yaml
kubectl wait --for=condition=ready pod -l app=todo-backend-db -n project --timeout=300s
```

### 5. Verificar Conexión a Base de Datos

```bash
# Ver logs del backend
kubectl logs -n project deployment/todo-backend-db-dep

# Esperar que muestre: "Connected to PostgreSQL at..."
```

## Pruebas Realizadas

### 1. Obtener TODOs iniciales

```bash
kubectl exec -n project deployment/todo-backend-db-dep -- node -e "
const http = require('http');
http.get('http://localhost:3000/todos', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log(JSON.parse(data)));
}).on('error', err => console.error(err.message));
"

# Resultado:
# [
#   { id: 1, content: 'Learn Kubernetes', created: '2025-10-19T...' },
#   { id: 2, content: 'Build microservices', created: '2025-10-19T...' },
#   { id: 3, content: 'Master Docker', created: '2025-10-19T...' },
#   { id: 4, content: 'Deploy to cluster', created: '2025-10-19T...' }
# ]
```

### 2. Crear nuevo TODO

```bash
kubectl exec -n project deployment/todo-backend-db-dep -- node -e "
const http = require('http');
const data = JSON.stringify({ content: 'Setup monitoring' });
const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/todos',
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Content-Length': data.length }
};
const req = http.request(options, (res) => {
  let responseData = '';
  res.on('data', chunk => responseData += chunk);
  res.on('end', () => console.log(JSON.parse(responseData)));
});
req.write(data);
req.end();
"

# Resultado:
# { id: 5, content: 'Setup monitoring', created: '2025-10-19T...' }
```

### 3. Verificar Persistencia Después de Reinicio

```bash
# Eliminar pod del backend
kubectl delete pods -n project -l app=todo-backend-db

# Esperar a que se recree
sleep 10

# Verificar que los 5 TODOs persisten
kubectl exec -n project deployment/todo-backend-db-dep -- node -e "
const http = require('http');
http.get('http://localhost:3000/todos', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const todos = JSON.parse(data);
    console.log('TODOs persisted after restart. Count:', todos.length);
  });
});
"

# Resultado: ✅ TODOs persisted after restart. Count: 5
```

## Datos Finales en PostgreSQL

```sql
SELECT * FROM todos;

 id |       content        |           created            
----+----------------------+------------------------------
  1 | Learn Kubernetes     | 2025-10-19 21:11:33.527
  2 | Build microservices  | 2025-10-19 21:11:33.527
  3 | Master Docker        | 2025-10-19 21:11:33.527
  4 | Deploy to cluster    | 2025-10-19 21:11:33.527
  5 | Setup monitoring     | 2025-10-19 21:11:50.320
```

## Buenas Prácticas Aplicadas

✅ **Separación de responsabilidades:**
- ConfigMap para valores no-sensibles
- Secret para credenciales
- Deployment para aplicación sin estado (stateless)
- StatefulSet para base de datos con estado (stateful)

✅ **Configuración inyectable:**
- Todas las variables de entorno vienen de ConfigMap/Secret
- No hay hardcodeos en la imagen Docker
- Fácil cambiar configuración sin reconstruir imagen

✅ **Disponibilidad:**
- Headless Service permite acceso directo a pods específicos
- StatefulSet garantiza identidad persistente del pod de BD
- Probes monitorean salud del backend y BD

✅ **Seguridad:**
- Password en Secret (no en ConfigMap)
- Base64 encoding en Secret (aunque se debe encriptar en producción)
- Credenciales no aparecen en logs

## Pasos Siguientes

1. **Escalabilidad:** StatefulSet con múltiples replicas de PostgreSQL (con replicación)
2. **Backups:** Snapshots automáticos de PVC
3. **Monitoreo:** Prometheus + Grafana para métricas de BD
4. **Operadores:** CloudNativePG o Zalando postgres-operator
5. **Migraciones:** Flyway o Liquibase para versionado de schema

## Conclusión

El ejercicio 2.8 integra todos los conceptos anteriores:
- ✅ **Deployments** (aplicaciones sin estado)
- ✅ **StatefulSets** (base de datos con estado)
- ✅ **ConfigMaps** (configuración)
- ✅ **Secrets** (credenciales)
- ✅ **Headless Services** (identidad de red)
- ✅ **Persistencia** (PersistentVolumes)
- ✅ **Inicialización automática** (migrations en startup)

La aplicación TODO ahora es **completamente funcional**, **escalable** y **resiliente** con persistencia garantizada en PostgreSQL.
