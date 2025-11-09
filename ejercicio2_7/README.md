# Exercise 2.7: Stateful Applications with PostgreSQL

## Description

En este ejercicio aprendemos a usar **StatefulSets** en Kubernetes para aplicaciones con estado (como bases de datos) y hacer que la aplicación **ping-pong** guarde su contador en PostgreSQL en lugar de mantenerlo en memoria.

## Concepto: StatefulSet vs Deployment

| Característica | Deployment | StatefulSet |
|---|---|---|
| **Identidad de pods** | Efímera, se crean/eliminan sin identidad fija | Permanente (ej: postgres-0, postgres-1) |
| **Nombre de red** | Balanceado por load balancer | Individualmente direccionable (headless service) |
| **Almacenamiento** | Volumen compartido entre replicas | Volumen individual por replica |
| **Caso de uso** | Aplicaciones sin estado | Bases de datos, brokers de mensajes |
| **Garantías** | Mejor esfuerzo | Identidad y almacenamiento garantizados |

## Headless Service

Un **Headless Service** (clusterIP: None) no utiliza load balancing. En lugar de ello:
- Devuelve las IPs individuales de cada pod
- Permite acceso directo a pods específicos por su nombre
- Es requisito para StatefulSets

```yaml
apiVersion: v1
kind: Service
metadata:
  name: postgres-svc
  namespace: project
spec:
  ports:
  - port: 5432
    name: postgres
  clusterIP: None  # ← Headless service
  selector:
    app: postgres
```

### DNS en StatefulSet

Con el StatefulSet `postgres-stset` y servicio `postgres-svc`, se crean los siguientes nombres DNS:

- `postgres-stset-0.postgres-svc` → Pod 0
- `postgres-stset-1.postgres-svc` → Pod 1 (si hubiera)
- `postgres-stset-0.postgres-svc.project.svc.cluster.local` → FQDN completo

## StatefulSet de PostgreSQL

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres-stset
  namespace: project
spec:
  serviceName: postgres-svc  # ← Servicio headless requerido
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:15-alpine
        env:
        - name: POSTGRES_DB
          value: "pingpong"
        - name: POSTGRES_USER
          valueFrom:
            configMapKeyRef:
              name: postgres-config
              key: DB_USER
        volumeMounts:
        - name: postgres-data-storage
          mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:  # ← Crea PVC individual para cada replica
  - metadata:
      name: postgres-data-storage
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: local-path
      resources:
        requests:
          storage: 1Gi
```

### volumeClaimTemplates

- **¿Qué es?** Template para crear PersistentVolumeClaims dinámicamente
- **Cada replica obtiene:** Su propio PVC (ej: postgres-data-storage-postgres-stset-0)
- **Ventaja:** Datos persistentes por pod, aislados entre replicas
- **Sin StatefulSet:** Todos los replicas compartirían el mismo volumen (problema para BD)

## Actualización de Ping-Pong para usar PostgreSQL

### Cambios en el código

**Antes (almacenamiento en memoria):**
```javascript
let pingCounter = 0;

app.get('/', (req, res) => {
  pingCounter++;
  res.json({ pongs: pingCounter });
});
```

**Ahora (almacenamiento en PostgreSQL):**
```javascript
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

app.get('/', async (req, res) => {
  const client = await pool.connect();
  const result = await client.query(
    'UPDATE pings SET count = count + 1 RETURNING count'
  );
  const count = result.rows[0]?.count;
  client.release();
  res.json({ pongs: count });
});
```

### Inicialización de Base de Datos

La aplicación crea la tabla automáticamente en el primer inicio:

```javascript
async function initializeDatabase() {
  const client = await pool.connect();
  await client.query(`
    CREATE TABLE IF NOT EXISTS pings (
      id SERIAL PRIMARY KEY,
      count INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await client.query('INSERT INTO pings (count) VALUES (0)');
  client.release();
}
```

Con `CREATE TABLE IF NOT EXISTS`, es seguro ejecutar en cada reinicio.

## ConfigMap para PostgreSQL

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: postgres-config
  namespace: project
data:
  DB_HOST: "postgres-stset-0.postgres-svc"
  DB_PORT: "5432"
  DB_NAME: "pingpong"
  DB_USER: "pingpong"
  DB_PASSWORD: "pingpong123"
```

Inyectado en la aplicación ping-pong:
```yaml
env:
- name: DB_HOST
  valueFrom:
    configMapKeyRef:
      name: postgres-config
      key: DB_HOST
```

## Estructura de Archivos

```
ejercicio2_7/
├── README.md
└── manifests/
    ├── configmap.yaml          # Configuración de PostgreSQL
    ├── service.yaml            # Headless Service
    ├── statefulset.yaml        # StatefulSet de PostgreSQL
    └── deployment-pingpong.yaml # Deployment de ping-pong con DB
```

## Despliegue y Prueba

### 1. Aplicar manifests
```bash
cd ejercicio2_7
kubectl apply -f manifests/
```

### 2. Verificar PostgreSQL
```bash
kubectl get pods -n project | grep postgres
kubectl get pvc -n project | grep postgres-data
kubectl exec -it postgres-stset-0 -n project -- psql -U pingpong -d pingpong
```

### 3. Probar ping-pong con PostgreSQL
```bash
# Hacer requests para incrementar contador
for i in {1..5}; do
  kubectl exec -n project deployment/pingpong-db-dep -- node -e "
    const http = require('http');
    http.get('http://localhost:3000/', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => console.log(data));
    });
  "
done

# Resultado esperado:
# {"pongs":1}
# {"pongs":2}
# {"pongs":3}
# {"pongs":4}
# {"pongs":5}
```

### 4. Verificar persistencia
```bash
# Eliminar pod
kubectl delete pods -n project -l app=pingpong-db

# Esperar a que se recree
sleep 10

# Verificar que el contador se mantiene
kubectl exec -n project deployment/pingpong-db-dep -- node -e "
  const http = require('http');
  http.get('http://localhost:3000/count', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => console.log(data));
  });
"

# Resultado: {"pongs":5} ← ¡Se mantuvo el valor!
```

## Ventajas de StatefulSet para PostgreSQL

1. **Identidad permanente:** `postgres-stset-0` siempre es el mismo pod
2. **Almacenamiento persistente:** Cada pod tiene su propio volumen
3. **Escalabilidad:** Agregar replicas crea automáticamente nuevos PVCs
4. **Seguridad de datos:** Los volúmenes NO se eliminan cuando se elimina el StatefulSet

```bash
# Ver volúmenes creados
kubectl get pvc -n project
# NAME                           STATUS   VOLUME                   CAPACITY
# postgres-data-storage-postgres-stset-0   Bound    pvc-xxx...   1Gi
```

## Lifespan de Datos

| Acción | Deployment | StatefulSet |
|--------|-----------|-------------|
| Pod muere/reinicia | Volumen comparte entre replicas | **Pod obtiene el mismo volumen** |
| Eliminar Deployment | PVC se elimina | PVC **se mantiene** |
| Scale up | Comparte volumen anterior | **Nuevo volumen por replica** |

## Concepto: readinessProbe y livenessProbe

Se agregaron probes para monitorear la salud de PostgreSQL:

```yaml
readinessProbe:
  exec:
    command:
    - /bin/sh
    - -c
    - pg_isready -U $POSTGRES_USER -d $POSTGRES_DB
  initialDelaySeconds: 5
  periodSeconds: 5
```

- **readinessProbe:** Verifica si la BD está lista para recibir conexiones
- **livenessProbe:** Verifica si la BD sigue viva, reinicia si falla

## Siguientes Pasos

1. **StatefulSets con múltiples replicas** - PostgreSQL con replicación
2. **Backups automáticos** - Snapshots de PVC
3. **Monitoreo de bases de datos** - Prometheus + Grafana
4. **Operadores de Kubernetes** - CloudNativePG, Zalando postgres-operator

## Conclusión

El ejercicio 2.7 demuestra:
- ✅ **StatefulSets** para aplicaciones con estado
- ✅ **Headless Services** para identidad de red
- ✅ **volumeClaimTemplates** para almacenamiento persistente por pod
- ✅ **Integración de aplicación con base de datos**
- ✅ **Persistencia de datos** entre reinicios de pods
- ✅ **Principios de 12-Factor App** (configuración externa)

Con esto, tenemos una arquitectura robusta donde:
- El contador persiste en PostgreSQL
- Los datos sobreviven a reinicios de pods
- La configuración es externa (ConfigMap)
- La aplicación es stateless pero respalda estado en BD
