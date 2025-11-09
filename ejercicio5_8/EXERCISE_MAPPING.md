# CNCF Landscape: Exercise-by-Exercise Technology Mapping

## Series 1: Basic Kubernetes

### Exercise 1.1-1.2: Log Output & Todo Applications
**Direct Technologies:**
- Kubernetes (POD, Deployment, Service)
- kubectl (CLI)
- Docker (container images)
- k3d (cluster)
- Node.js (runtime)
- Express.js (framework)

**Indirect Technologies:**
- k3s (via k3d)
- containerd (runtime)
- Flannel (networking via k3s)
- CoreDNS (DNS)

**Landscape Categories Introduced:**
- Provisioning: k3d, Docker
- Runtime: Docker, containerd
- Orchestration: Kubernetes, kubectl

---

### Exercise 1.3-1.4: Declarative Configuration
**New Direct Technologies:**
- (No new technologies)

**Learning:** YAML-based declarative approach (Kubernetes standard)

---

### Exercise 1.5: Todo Web Interface
**Direct Technologies:**
- (Same as 1.1, but frontend added)

**Learning:** Multi-tier application architecture

---

### Exercise 1.6-1.8: Networking
**New Direct Technologies:**
- **Traefik** (Ingress controller)
- **NodePort Service**

**Landscape Category:** Networking/Ingress

---

### Exercise 1.9-1.11: Storage
**New Direct Technologies:**
- **Persistent Volumes (PV)**
- **Persistent Volume Claims (PVC)**
- **emptyDir volumes**

**Landscape Category:** Storage

---

### Exercise 1.12-1.13: Image Caching & Todo App
**Direct Technologies:**
- (Integration of previous concepts)

---

## Series 2: Intermediate Kubernetes

### Exercise 2.1: Pod-to-Pod Communication
**Learning:**
- Service discovery via DNS (CoreDNS)
- Pod-to-pod networking

---

### Exercise 2.2: Todo Backend Service
**Direct Technologies:**
- Service abstraction
- Multiple deployment coordination

---

### Exercise 2.3-2.4: Namespaces
**New Direct Technologies:**
- **RBAC** (Role-Based Access Control)
- **NetworkPolicy** (network segmentation)

**Landscape Category:** Security & Compliance

---

### Exercise 2.5-2.6: ConfigMaps
**Learning:**
- Configuration management
- Environment variable injection

---

### Exercise 2.7: StatefulSet with PostgreSQL
**New Direct Technologies:**
- **PostgreSQL** (stateful database)
- **StatefulSet** (ordered pod management)
- **Persistent Storage** (data persistence)

**Landscape Categories:**
- Storage: PostgreSQL, PV/PVC
- Orchestration: StatefulSet

---

### Exercise 2.8: Todo App with Database
**Learning:**
- Multi-tier application with persistent data
- Database connectivity from pods

---

### Exercise 2.9: CronJobs
**Learning:**
- Time-based scheduling
- Batch job patterns

---

### Exercise 2.10: Monitoring with Prometheus, Grafana & Loki
**New Direct Technologies:**
- **Prometheus** (metrics collection)
- **Grafana** (visualization)
- **Loki** (log aggregation)
- **Promtail** (indirect - log shipper via Loki)

**Landscape Category:** Observability & Analysis

**Total Series 2 New:** 3 direct + 1 indirect

---

## Series 3: Cloud & CI/CD

### Exercise 3.1-3.4: Google Kubernetes Engine (GKE)
**New Direct Technologies:**
- **Google Kubernetes Engine** (managed K8s)
- **Google Container Registry** (image storage)

**Learning:**
- Cloud-native Kubernetes
- Multi-cluster management

**Landscape Categories:**
- Platform: GKE
- Container Registry: GCR

---

### Exercise 3.5: Kustomize Deployment
**New Direct Technologies:**
- **Kustomize** (YAML configuration management)

**Landscape Category:** Orchestration & Management

---

### Exercise 3.6: GitHub Actions CI/CD Pipeline
**New Direct Technologies:**
- **GitHub** (repository hosting)
- **GitHub Actions** (CI/CD automation)
- **Git** (version control)

**Landscape Category:** CI/CD

---

### Exercise 3.7: Branch-per-Namespace Deployment
**Learning:**
- Multi-environment deployment patterns
- GitHub flow integration

---

### Exercise 3.8-3.9: Cleanup Workflow & Database Decisions
**New Direct Technologies:**
- **Google Cloud Storage** (backup destination)

**Learning:**
- GitOps cleanup automation
- DBaaS vs self-managed decisions

---

### Exercise 3.10: PostgreSQL Backup to GCS
**Learning:**
- Backup automation
- Cloud storage integration

---

### Exercise 3.11-3.12: Resource Management & Monitoring
**Learning:**
- Resource requests/limits
- GKE monitoring integration

---

## Series 4: Advanced Patterns

### Exercise 4.1-4.2: Health Probes
**Learning:**
- Liveness probes
- Readiness probes
- Health check patterns

---

### Exercise 4.3: Prometheus and PromQL
**Learning:**
- Advanced metrics querying
- Dashboard creation in Grafana

---

### Exercise 4.4: Canary Release with Argo Rollouts
**New Direct Technologies:**
- **Argo Rollouts** (progressive delivery)

**Landscape Category:** CI/CD / Deployment

---

### Exercise 4.5-4.6: Project Steps & NATS
**New Direct Technologies:**
- **NATS** (message broker / event system)

**Landscape Category:** Messaging/Event

---

### Exercise 4.7: GitOps with ArgoCD
**New Direct Technologies:**
- **ArgoCD** (GitOps deployment tool)

**Landscape Category:** CI/CD / Platform

---

### Exercise 4.8-4.9: GitOps at Scale & Kustomize Multi-Environment
**Learning:**
- Multi-environment management with ArgoCD
- Kustomize for complex overlays

---

### Exercise 4.10: Grande Finale - Separate Repos
**Learning:**
- Monorepo vs polyrepo patterns
- Multi-repository orchestration

---

## Series 5: Extending Kubernetes

### Exercise 5.1: DIY CRD & Custom Controller
**Learning:**
- Custom Resource Definitions
- Custom controllers
- Kubernetes extension mechanisms

---

### Exercise 5.2: Istio Service Mesh (Ambient Mode)
**New Direct Technologies:**
- **Istio** (service mesh)
- **Envoy** (indirect - proxy sidecar)

**Landscape Category:** Service Mesh / Networking

---

### Exercise 5.3: Log App Service Mesh Edition
**Learning:**
- Canary deployments with Istio
- Traffic splitting with service mesh

---

### Exercise 5.4: Wikipedia with Init & Sidecar
**Learning:**
- Init containers (setup phase)
- Sidecar containers (background tasks)
- Multi-container pod patterns

---

### Exercise 5.5: Platform Comparison
**Context Technology:**
- Mentioned but not used: Red Hat OpenShift, Rancher
- Analysis of Kubernetes ecosystem alternatives

---

### Exercise 5.6: Knative Serverless
**New Direct Technologies:**
- **Knative** (serverless platform)
- **Kourier** (indirect - Knative ingress)
- **sslip.io** (magic DNS)

**Landscape Category:** Serverless & FaaS

---

### Exercise 5.7: Ping-Pong Serverless
**Learning:**
- Serverless application patterns
- Stateless design
- Knative runtime contract

---

### Exercise 5.8: CNCF Landscape
**Retrospective:** Analysis of all 33 technologies used throughout the course

---

## Technology Introduction Timeline

### Week 1-2
1. Kubernetes
2. kubectl
3. k3d
4. Docker
5. Node.js
6. Express.js

### Week 3-4
7. Traefik (Ingress)
8. Persistent Volumes
9. PostgreSQL
10. Flannel (implicit)
11. CoreDNS (implicit)

### Week 5-6
12. RBAC
13. NetworkPolicy
14. StatefulSet
15. ConfigMaps

### Week 7-8
16. Prometheus
17. Grafana
18. Loki
19. Promtail (implicit)

### Week 9-10
20. Google Kubernetes Engine
21. Google Container Registry
22. Google Cloud Storage

### Week 11-12
23. Kustomize
24. GitHub
25. GitHub Actions
26. Git

### Week 13-14
27. Argo Rollouts
28. ArgoCD

### Week 15-16
29. NATS

### Week 17-18
30. Istio
31. Envoy (implicit via Istio)
32. Custom Controllers

### Week 19-20
33. Knative
34. Kourier (implicit)
35. sslip.io

---

## Key Architectural Layers

### Layer 1: Foundation (Series 1)
```
Applications (Node.js/Express)
        ↓
Kubernetes Cluster (k3d)
        ↓
Docker/Container Runtime
```

### Layer 2: Operations (Series 2)
```
Configuration Management (ConfigMaps)
        ↓
Data Persistence (PostgreSQL, PV/PVC)
        ↓
Observability (Prometheus, Grafana, Loki)
```

### Layer 3: Deployment (Series 3-4)
```
CI/CD Automation (GitHub Actions, ArgoCD, Argo Rollouts)
        ↓
Cloud Platforms (GKE, GCR, GCS)
        ↓
Git-driven Deployments (Kustomize, ArgoCD)
```

### Layer 4: Advanced (Series 5)
```
Service Mesh (Istio, Envoy)
        ↓
Serverless Platform (Knative, Kourier)
        ↓
Custom Extensions (CRDs, Controllers)
```

---

## Technology Adoption Pattern

### Stage 1: Container Orchestration
- Master: Kubernetes, kubectl, Docker
- Supporting: k3d, Traefik

### Stage 2: Data & Persistence
- Manage: PostgreSQL, StatefulSet, PV/PVC
- Configure: ConfigMaps, RBAC

### Stage 3: Observability
- Collect: Prometheus
- Visualize: Grafana
- Logs: Loki

### Stage 4: Deployment Automation
- Version Control: Git, GitHub
- Build: GitHub Actions, Docker
- Deploy: ArgoCD, Kustomize

### Stage 5: Advanced Patterns
- Distribution: Service Mesh (Istio)
- Scale-to-Zero: Serverless (Knative)
- Extension: Custom Resources

---

## Hands-On Learning Path

### Beginner (Series 1)
- Learn container basics with Docker
- Understand Kubernetes concepts
- Deploy simple applications with kubectl
- Explore networking basics

### Intermediate (Series 2)
- Manage stateful applications
- Implement security (RBAC, NetworkPolicy)
- Add observability
- Handle configuration

### Advanced (Series 3-4)
- Deploy to cloud (GKE)
- Automate with CI/CD
- Implement GitOps
- Use advanced deployment patterns

### Expert (Series 5)
- Extend Kubernetes with CRDs
- Implement service mesh for advanced traffic management
- Embrace serverless patterns
- Build cloud-native platforms

---

## CNCF Maturity Mapping

### 🟢 CNCF Graduated (Production Ready)
- Kubernetes
- Docker
- Prometheus
- CoreDNS
- Envoy
- Containerd
- Argo

### 🟡 CNCF Incubating (Maturing)
- Istio
- Knative
- Argo Rollouts
- Kustomize
- Loki

### 🔵 CNCF Sandbox
- (None directly used, but ArgoCD is emerging)

### ⚪ Non-CNCF (But cloud-native compatible)
- Node.js
- Express.js
- PostgreSQL
- GitHub
- Google Cloud
- Traefik

---

## Ecosystem Relationships

### Storage Ecosystem
```
Application
    ↓
Kubernetes PV/PVC
    ↓
PostgreSQL (used)
emptyDir (used)
    ↓
local-path-provisioner (k3s default - implicit)
```

### Observability Ecosystem
```
Application Metrics
    ↓
Prometheus (collection)
    ↓
Grafana (visualization)

Application Logs
    ↓
Loki (aggregation)
    ↓
Promtail (shipment - implicit)
```

### Service Mesh Ecosystem
```
Applications
    ↓
Envoy (sidecars - implicit via Istio)
    ↓
Istio Control Plane (traffic management)
    ↓
Traffic Splitting & Routing
```

### Serverless Ecosystem
```
Applications
    ↓
Knative Services
    ↓
Kourier (networking - implicit)
    ↓
Auto-scaling & Cold Start Management
```

---

## What This Means

By completing all 51 exercises with ~33 technologies, you understand:

1. **Full Stack Cloud Native**: From infrastructure to applications
2. **Production Patterns**: Real-world deployment and operational approaches
3. **DevOps Principles**: Infrastructure as Code, GitOps, automation
4. **Microservices Architecture**: Service discovery, mesh, observability
5. **Scalability**: From single pods to serverless functions
6. **Security**: RBAC, network policies, secrets management
7. **Reliability**: Health checks, graceful shutdown, recovery patterns

This represents a comprehensive, hands-on education in cloud-native software engineering.
