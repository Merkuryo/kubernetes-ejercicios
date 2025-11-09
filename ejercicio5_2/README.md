# Ejercicio 5.2 - Getting Started with Istio Service Mesh

## Objetivo

Introducirse a **Istio Service Mesh** y su nuevo paradigma **Ambient Mode**:

1. **Entender** qué es un service mesh y por qué es importante
2. **Instalar** Istio Ambient Mode en un cluster k3d
3. **Desplegar** la aplicación de ejemplo Bookinfo
4. **Observar** cómo Istio gestiona la comunicación entre servicios
5. **Explorar** características de seguridad, observabilidad y traffic management

Este ejercicio marca la transición desde "¿Cómo hago X?" a "¿Cómo el sistema automáticamente hace X por mí?"

## ¿Qué es un Service Mesh?

### El Problema

En arquitectura de microservicios, aplicaciones constan de múltiples servicios independientes que se comunican entre sí. Sin una capa intermediaria:

```
┌─────────────────────────────────────────────────────────┐
│               Aplicación distribuida                    │
│  (cada servicio responsable de su propia comunicación)  │
└─────────────────────────────────────────────────────────┘

Service A ────X──── Service B  (Sin encriptación)
              ↓
          ¿Error? (Sin retry lógico)
          ¿Timeout? (Sin circuito breaker)
          ¿Seguridad? (Sin autenticación/autorización)
          ¿Observabilidad? (Sin rastreo distribuido)
```

Esto requiere:
- **Código complejo** en cada servicio (librerías, middleware)
- **Repetición** del mismo patrón en todos lados
- **Desacoplamiento difícil** entre lógica de negocio y operacional
- **Testing complicado** por dependencias en tiempo de ejecución

### La Solución: Service Mesh

```
┌─────────────────────────────────────────────────────────┐
│           Service Mesh (Istio)                         │
│  (gestiona toda la comunicación entre servicios)       │
└─────────────────────────────────────────────────────────┘

                  ┌─────────────────────┐
                  │    Control Plane    │
                  │  (istiod)           │
                  │  Configuration      │
                  └─────────────────────┘
                           ▲
                           │ Program
                           │
    ┌──────────┐    ┌──────────────┐    ┌──────────┐
    │ Service  │───▶│  Data Plane  │◀───│ Service  │
    │    A     │    │  (ztunnel)   │    │    B     │
    └──────────┘    └──────────────┘    └──────────┘

    ✅ Encriptación (mTLS)
    ✅ Retries automáticos
    ✅ Circuit breaker
    ✅ Autenticación/Autorización
    ✅ Métricas, logs, traces
    ✅ Traffic management
```

Un service mesh es una **capa de infraestructura** dedicada que:
- **Intercepta** toda comunicación entre servicios
- **Aplica** políticas de seguridad, resiliencia y observabilidad
- **No requiere** cambios en el código de la aplicación
- **Funciona transparentemente** para los desarrolladores

## Conceptos Clave

### 1. Data Plane vs Control Plane

**Data Plane:**
- Componentes que procesan el tráfico entre servicios
- En sidecar mode: proxy Envoy en cada pod
- En ambient mode: **ztunnel** (per-node Layer 4) + **waypoint** (per-namespace Layer 7)

**Control Plane:**
- Gestiona la configuración del data plane
- Istiod: servidor de control central
- Distribuye políticas, certificates, configuración

### 2. Sidecar Mode vs Ambient Mode

**Sidecar Mode (Tradicional):**
```
Pod 1                          Pod 2
┌──────────────┐              ┌──────────────┐
│ App          │              │ App          │
│ + Envoy      │ ──────────▶  │ + Envoy      │
│  (proxy)     │              │  (proxy)     │
└──────────────┘              └──────────────┘

✓ Full Istio features
✓ Per-request policies
✗ Resource overhead (CPU, memory per pod)
✗ Require pod restart to inject sidecar
✗ Complex lifecycle management
```

**Ambient Mode (Nuevo - Producción desde 1.22):**
```
Pod 1                          Pod 2
┌──────────────┐              ┌──────────────┐
│ App          │  ┌─────────┐ │ App          │
│ (limpio)     │──▶ ztunnel │──▶(limpio)     │
│              │  │ (L4)    │ │              │
└──────────────┘  └─────────┘ └──────────────┘
                  (per-node, shared)

Optional:
                 ┌─────────────┐
                 │   Waypoint  │
                 │   (L7)      │
                 │   Envoy     │
                 │ (per-ns)    │
                 └─────────────┘

✓ Sidecar-less (no injection needed)
✓ Lower resource consumption
✓ Gradual adoption (L4 always, L7 optional)
✗ Multi-cluster not yet supported (alpha)
```

### 3. Ztunnel (Zero Trust Tunnel)

Proxy propósito-específico escrito en **Rust** que:

- **Capa 3-4** (network + transport layer)
- **mTLS automático** - todo tráfico encriptado
- **Zero-trust security** - autenticación obligatoria
- **L4 authorization** - control basado en identidad
- **Bajo overhead** - optimizado para rendimiento
- **Por-node** - un ztunnel por nodo, compartido por todos los pods

### 4. Waypoint Proxies

Deployment de **Envoy** opcional para características **Capa 7**:

- **HTTP/gRPC routing** avanzado
- **L7 authorization** - políticas basadas en métodos, paths
- **Request-level policies** - retries, timeouts, fault injection
- **Observability L7** - métricas por-request
- **Escalable** - se auto-escala como cualquier deployment
- **Opt-in por namespace** - solo donde se necesitan features L7

### 5. HBONE (Istio QUIC)

Protocolo de túneling basado en **HTTP CONNECT** que:
- Encapsula tráfico TCP dentro de HTTP
- Permite nat traversal
- Compatible con L4 proxies
- Transporte subyacente para ztunnel

## Comparativa: Sidecar vs Ambient

| Característica | Sidecar | Ambient (L4) | Ambient + Waypoint |
|---|---|---|---|
| **Inyección de sidecar** | Requerida | ❌ No | ❌ No |
| **Recursos por pod** | Alto (CPU, memory) | Bajo | Bajo |
| **Latencia** | 0.63-0.88ms | 0.16-0.20ms ✅ | 0.40-0.50ms |
| **mTLS automático** | ✅ Sí | ✅ Sí | ✅ Sí |
| **L4 Authorization** | ✅ Sí | ✅ Sí | ✅ Sí |
| **L7 Features** | ✅ Completo | ❌ No | ✅ Sí |
| **L7 Authorization** | ✅ Sí | ❌ No | ✅ Sí |
| **Métricas L7** | ✅ Sí | ❌ Básicas | ✅ Sí |
| **Traffic management** | ✅ Full | ❌ Connection-only | ✅ Full |
| **Circuit breaking** | ✅ L4+L7 | ❌ L4 solo | ✅ Full |
| **Startup overhead** | Alto | Bajo | Bajo |
| **Overhead total** | ~50MB por pod | Compartido | Compartido |
| **Requerimientos** | Any CNI | Any CNI | Any CNI |
| **Multi-cluster** | ✅ Stable | ❌ No (yet) | ❌ No (yet) |
| **Multi-network** | ✅ Stable | ❌ No | ❌ No |
| **VM Support** | ✅ Sí | ❌ No | ❌ No |

## Flujo de Traffic en Ambient Mode

```
1. Pod A ─────────────► Pod B
         └──────┬──────┘
                │
         ┌──────▼────────┐
         │   ztunnel A   │
         │   (node A)    │
         │   • Intercepta│
         │   • Autentica │
         │   • Encripta  │
         └──────┬────────┘
                │
         [Red segura (HBONE/mTLS)]
                │
         ┌──────▼────────┐
         │   ztunnel B   │
         │   (node B)    │
         │   • Desencripta
         │   • Verifica  │
         │   • Ruteaaa   │
         └──────┬────────┘
                │
              Pod B
```

Con **Waypoint** (L7):
```
1. Pod A ─► ztunnel A ─► HBONE ─► ztunnel B ─► Waypoint ─► Pod B
                          (L4)                    (L7)
                                                  • HTTP routing
                                                  • Retries
                                                  • Fault injection
```

## Bookinfo Sample Application

La aplicación de ejemplo que deployaremos:

```
┌──────────────────────────────────────────────────────┐
│          User's Browser                             │
└────────────────┬─────────────────────────────────────┘
                 │
         ┌───────▼────────┐
         │  productpage   │ (Port 9080)
         │  (Python)      │ Renderiza página principal
         └───────┬────────┘
                 │
         ┌───────┴────────┬──────────────┐
         │                │              │
    ┌────▼────┐    ┌────────────┐  ┌────────────┐
    │ details │    │  reviews   │  │  ratings   │
    │ (Ruby)  │    │  (Java)    │  │  (Node.js) │
    │         │    │            │  │            │
    │ Books   │    │ Book       │  │ Ratings    │
    │ info    │    │ reviews    │  │ for books  │
    └─────────┘    │ v1, v2, v3 │  └────────────┘
                   └────────────┘
```

**Características educativas:**
- ✅ Múltiples lenguajes (Python, Ruby, Java, Node.js)
- ✅ Múltiples versiones (reviews: v1, v2, v3)
- ✅ Demostración de traffic management
- ✅ Observabilidad integrada

## Instalación

### Prerequisites

```bash
# Requisitos mínimos
• kubectl (1.24+)
• k3d (5.0+) o cualquier cluster Kubernetes
• Docker (para k3d)
• istioctl CLI (se instala automáticamente)
```

### Opción 1: Installation Automática

```bash
# Hacer script ejecutable
chmod +x scripts/install-istio.sh

# Ejecutar instalación completa
./scripts/install-istio.sh

# Esto hará:
# 1. Verificar prerequisites
# 2. Crear k3d cluster (si no existe)
# 3. Instalar istioctl CLI
# 4. Instalar Istio Ambient Mode
# 5. Desplegar Bookinfo app
# 6. Configurar Gateway y VirtualService
```

### Opción 2: Installation Manual

#### Paso 1: Setup k3d Cluster

```bash
# Crear cluster
k3d cluster create istio-lab \
  --servers 1 \
  --agents 2 \
  --port "80:80@loadbalancer" \
  --port "443:443@loadbalancer" \
  --wait

# Verificar
kubectl cluster-info
kubectl get nodes
```

#### Paso 2: Instalar Istio CLI

```bash
# Descargar última versión
curl -L https://istio.io/downloadIstio | sh -

# Instalar CLI
cd istio-*
sudo cp bin/istioctl /usr/local/bin/
istioctl version

# Exportar ubicación (opcional)
export PATH=$PWD/bin:$PATH
```

#### Paso 3: Instalar Istio Ambient Mode

```bash
# Crear namespace
kubectl create namespace istio-system

# Instalar Istio Ambient Mode
istioctl install --set profile=ambient -y

# Verificar instalación
kubectl get pods -n istio-system
kubectl get daemonset -n istio-system  # ztunnel
```

Esto despliega:
- **istiod** (control plane, 2+ replicas)
- **ztunnel** (DaemonSet en cada nodo)
- **Ingress Gateway** (para entrada externa)

#### Paso 4: Preparar Namespace

```bash
# Crear/preparar namespace
kubectl create namespace default

# Habilitar ambient mode
kubectl label namespace default istio.io/dataplane-mode=ambient --overwrite

# Verificar
kubectl get namespace -L istio.io/dataplane-mode
```

#### Paso 5: Desplegar Bookinfo

```bash
# Opción A: Desde manifests locales
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.24/samples/bookinfo/platform/kube/bookinfo.yaml

# Opción B: Desde Istio installation
ISTIO_VERSION=1.24
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-${ISTIO_VERSION}/samples/bookinfo/platform/kube/bookinfo.yaml

# Esperar a que pods estén ready
kubectl wait --for=condition=ready pod -l app=productpage --timeout=120s

# Verificar
kubectl get pods
kubectl get svc
```

#### Paso 6: Configurar Ingress

```bash
# Aplicar Gateway
kubectl apply -f manifests/gateway.yaml

# Aplicar VirtualService
kubectl apply -f manifests/virtualservice.yaml

# Verificar
kubectl get gateway
kubectl get virtualservice
```

#### Paso 7: Acceder a la Aplicación

```bash
# Opción A: Port forwarding (k3d local)
kubectl port-forward svc/istio-ingressgateway -n istio-system 8080:80

# Luego acceder a: http://localhost:8080/productpage

# Opción B: Si tienes LoadBalancer externo
kubectl get svc istio-ingressgateway -n istio-system
# Acceder a la IP externa en puerto 80
```

## Exploración de Características

### 1. Observar Tráfico Encriptado

```bash
# Verificar mTLS automático
kubectl exec -it <pod-productpage> -- bash
# Dentro del pod:
curl -v http://details:9080/details/1 2>&1 | grep "SSL/TLS"
# Verás CONNECT tunnel (HBONE)

# Ver certificates
kubectl get secret -A | grep istio
```

### 2. Ztunnel Logs

```bash
# Ver logs de ztunnel en cada nodo
kubectl logs -n istio-system -l app=ztunnel --tail=50

# Observar conexiones encriptadas
```

### 3. Visualizar Topología

Instalar Kiali (dashboard opcional):

```bash
# Istio incluye Kiali
kubectl port-forward svc/kiali -n istio-system 20000:20000
# Acceder: http://localhost:20000

# Sin Kiali:
kubectl logs -f svc/productpage | grep -i reviews
```

### 4. Generar Tráfico

```bash
# Loop que accede a productpage constantemente
kubectl exec -it <pod> -- bash
while true; do curl http://productpage:9080/productpage; sleep 1; done

# O desde tu máquina:
while true; do curl http://localhost:8080/productpage; sleep 1; done
```

### 5. Monitoring con Prometheus

```bash
# Port forward Prometheus
kubectl port-forward svc/prometheus -n istio-system 9090:9090

# Acceder: http://localhost:9090

# Queries útiles:
# - envoy_cluster_upstream_rq{cluster_name=~"outbound.*"}
# - istio_request_total
# - istio_request_duration_milliseconds_bucket
```

## Configuración Avanzada

### Habilitar L7 Features (Waypoint)

Si necesitas traffic management L7 avanzado:

```bash
# Crear Waypoint proxy (namespace istio-system lo hace automáticamente)
istioctl waypoint generate --for service -n default | kubectl apply -f -

# O manual:
kubectl apply -f - << 'EOF'
apiVersion: gateway.networking.k8s.io/v1beta1
kind: Gateway
metadata:
  name: productpage-waypoint
  namespace: default
  annotations:
    istio.io/service-account: default
spec:
  gatewayClassName: istio-waypoint
  listeners:
  - name: mesh
    port: 15008
    protocol: HBONE
EOF

# Habilitar para un servicio
kubectl label service productpage istio.io/use-waypoint=productpage-waypoint
```

### Authorization Policy (L4)

Configurar quién puede conectarse a qué:

```bash
# Denegar todo excepto específico
kubectl apply -f - << 'EOF'
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: deny-all
  namespace: default
spec:
  {}
---
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: allow-productpage
  namespace: default
spec:
  selector:
    matchLabels:
      app: productpage
  rules:
  - from:
    - source:
        principals: ["cluster.local/ns/default/sa/default"]
    to:
    - operation:
        ports: ["9080"]
EOF
```

### PeerAuthentication (mTLS)

```bash
# Configuración automática (recomendado)
kubectl apply -f manifests/peerauthentication.yaml

# Mode: AUTO = mTLS cuando ambos lados lo soportan
# Mode: STRICT = mTLS obligatorio
# Mode: DISABLE = sin mTLS
```

## Limpiar Recursos

```bash
# Eliminar aplicación de ejemplo
kubectl delete -f https://raw.githubusercontent.com/istio/istio/release-1.24/samples/bookinfo/platform/kube/bookinfo.yaml

# Eliminar configuración Istio
kubectl delete gateway bookinfo-gateway
kubectl delete virtualservice bookinfo

# Desinstalar Istio
istioctl uninstall --purge -y

# Eliminar namespace
kubectl delete namespace istio-system

# Eliminar k3d cluster (opcional)
k3d cluster delete istio-lab
```

## Ventajas de Ambient Mode

### ✅ vs Sidecar

| Ventaja | Beneficio |
|---------|-----------|
| **No injection needed** | Namespace label simplemente habilita mesh |
| **Lower resource consumption** | 50-60% menos memory/CPU |
| **Better latency** | 0.16ms vs 0.63ms |
| **Easier operations** | Sin gestión de sidecar lifecycle |
| **Gradual adoption** | L4 default, L7 opt-in por servicio |
| **Auto-scaling waypoint** | Compartido entre muchos pods |
| **No node affinity** | ztunnel puede cambiar de nodo |

### ✅ vs sin Mesh

| Característica | sin Mesh | con Mesh |
|---|---|---|
| **mTLS/Encryption** | ❌ Código | ✅ Automático |
| **Authentication** | ❌ Código | ✅ Automático |
| **Authorization** | ❌ Código | ✅ Política |
| **Retries** | ❌ Código | ✅ Automático |
| **Circuit breaking** | ❌ Código | ✅ Automático |
| **Metrics** | ❌ Instrumentación | ✅ Automático |
| **Distributed tracing** | ❌ Instrumentación | ✅ Automático |
| **Service discovery** | ❌ App logic | ✅ Automático |

## Limitaciones Actuales

⚠️ Ambient Mode (vs Sidecar) **no soporta:**
- Multi-cluster (alpha support)
- Multi-network communication
- VMs/non-Kubernetes endpoints
- Algunos casos edge de extensibilidad

**Recomendación**: Para single-cluster, Ambient Mode es la mejor opción.

## Lecciones Aprendidas

### 1. Service Mesh es Infraestructura, no Aplicación

Los meshes manejan:
- Seguridad (mTLS, identidad, autorización)
- Resiliencia (retries, circuit breakers)
- Observabilidad (métricas, traces, logs)
- Tráfico (routing, balanceo, canary)

**Sin cambios en el código de la aplicación.**

### 2. Ambient Mode es el Futuro

- Menos complejidad que sidecar
- Mejor performance
- Operaciones simplificadas
- Adopción gradual de features

### 3. Zero-Trust por Defecto

mTLS automático significa:
- Todo tráfico encriptado
- Identidad de servicio automática
- Autorización basada en identidad
- Compliance facilitado

### 4. Observabilidad Integrada

- Métricas automáticas (L4)
- Distributed tracing opcional
- Logs de acceso
- Performance dashboards

### 5. L4 vs L7 Trade-off

- **L4 (ztunnel)**: Rápido, seguro, simple
- **L7 (waypoint)**: Flexible, políticas finas, complejo
- **Elegir según necesidad**: No pagues por lo que no usas

## Seguimiento

### Ejercicios Relacionados

- **4.1-4.6**: Implementamos manualmente lo que Istio automatiza
- **4.7-4.10**: GitOps para gestionar aplicaciones
- **5.1**: DIY controller - patrón que Istio también usa
- **5.2** (this): El siguiente nivel - service mesh completo

### Próximos Ejercicios (5.3+)

- Canary deployments con Istio
- Advanced traffic management
- Security policies
- Multi-cluster communication
- Custom resources y extensiones

## Referencias

- [Istio Documentation](https://istio.io/latest/docs/)
- [Ambient Mode Overview](https://istio.io/latest/docs/ambient/overview/)
- [Data Plane Modes](https://istio.io/latest/docs/overview/dataplane-modes/)
- [Bookinfo Example](https://istio.io/latest/docs/examples/bookinfo/)
- [Istio Architecture](https://istio.io/latest/docs/ambient/architecture/)
- [HBONE Protocol](https://istio.io/latest/docs/concepts/security/#hbone)

## Conclusión

Este ejercicio introduce **Istio Ambient Mode** - el próximo paso en la evolución de Kubernetes:

- ✅ De pods aislados → Servicios comunicados
- ✅ De HTTP directo → Tráfico encriptado
- ✅ De código de resiliencia → Políticas
- ✅ De observabilidad manual → Automática
- ✅ De operaciones complejas → Infraestructura transparente

**Istio Ambient Mode es la forma moderna de construir microservicios seguros, resilientes y observables en Kubernetes.**
