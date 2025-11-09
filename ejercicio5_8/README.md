# Exercise 5.8: CNCF Cloud Native Landscape Analysis

## Overview

This exercise involves analyzing the CNCF Cloud Native Landscape and mapping all technologies and projects used throughout the Kubernetes exercises course (Series 1-5).

**References:**
- [CNCF Cloud Native Landscape](https://landscape.cncf.io/)
- [Interactive Version](https://landscape.cncf.io/guide/hosted-platform)

---

## CNCF Cloud Native Landscape Categories

The landscape is organized into several major categories:

1. **Provisioning** - Infrastructure and cluster setup
2. **Runtime** - Container runtimes and orchestration
3. **Orchestration & Management** - Kubernetes and control planes
4. **App Definition & Image Build** - Building and packaging applications
5. **CI/CD** - Continuous integration and deployment
6. **Observability & Analysis** - Monitoring, logging, tracing
7. **Container Registry** - Image storage and distribution
8. **Networking** - Networking and service mesh
9. **Storage** - Data persistence
10. **Security & Compliance** - Security and access control
11. **Platform** - Higher-level platforms and abstractions

---

## Direct Usage: Projects/Products We Used

### 1. **Kubernetes & Orchestration**

#### Core Kubernetes
- **kubernetes** (k8s)
  - Used: Series 1-5 (entire course)
  - Context: Primary orchestration platform
  - Status: FOUNDATIONAL - Everything runs on Kubernetes

#### Kubernetes Distributions
- **k3d** (Kubernetes in Docker)
  - Used: Series 3-5 (local cluster creation)
  - Context: `k3d cluster create` for development
  - Status: DIRECT - Every exercise uses k3d

- **k3s** (Lightweight Kubernetes)
  - Used: Indirectly through k3d (k3d bundles k3s)
  - Context: k3d → k3s (k3d uses k3s as engine)
  - Status: INDIRECT - Core of k3d

- **Docker** (Container runtime)
  - Used: Series 1-5 (building/running containers)
  - Context: `docker build`, `docker run`, Dockerfiles
  - Status: DIRECT - Every container

---

### 2. **App Definition & Image Build**

#### Container Images
- **Docker** / **OCI** (Open Container Initiative)
  - Used: All exercises
  - Context: Building application images (Dockerfile)
  - Status: DIRECT

#### Image Repositories
- **DockerHub**
  - Used: Implicitly (pulling base images)
  - Context: `FROM node:18`, `FROM alpine`, etc.
  - Status: DIRECT - Every Dockerfile uses base images

---

### 3. **Kubernetes-Native Applications**

#### Custom Resource Definitions (CRD)
- **Custom Controllers** (Exercise 5.1)
  - Used: DIY CRD & Custom Controller
  - Context: Extending Kubernetes with custom resources
  - Status: DIRECT

#### Package Management
- **Helm**
  - Used: Exercise 2.10 (Prometheus installation mentioned implicitly)
  - Context: Could be used for deploying monitoring stack
  - Status: IMPLIED - Common pattern in course

---

### 4. **Service Mesh**

#### Istio
- **Istio** (Service Mesh)
  - Used: Exercise 5.2, 5.3
  - Context: Service mesh with traffic splitting, canary deployments
  - Status: DIRECT - Exercises 5.2 and 5.3

#### Istio Components
- **Envoy** (Proxy)
  - Used: Indirectly through Istio (Istio uses Envoy sidecars)
  - Context: Istio → Envoy (data plane)
  - Status: INDIRECT - Core of Istio

---

### 5. **Serverless & Functions**

#### Serverless Platforms
- **Knative** (Serverless on Kubernetes)
  - Used: Exercise 5.6, 5.7
  - Context: Deploying serverless services with automatic scaling
  - Status: DIRECT

#### Knative Networking
- **Kourier** (Knative Ingress)
  - Used: Exercise 5.6, 5.7 (Knative networking layer)
  - Context: Knative → Kourier (networking implementation)
  - Status: INDIRECT - Part of Knative Serving

---

### 6. **Networking**

#### Ingress Controllers
- **Traefik**
  - Used: Exercise 1.7-1.13, 2.1+ (default in k3s before disabling)
  - Context: Ingress for routing HTTP traffic
  - Status: DIRECT - Disabled in Exercise 5.6+

#### Network Plugins
- **Flannel**
  - Used: Indirectly through k3s (k3s default CNI)
  - Context: k3s → Flannel (container network interface)
  - Status: INDIRECT - k3s uses Flannel by default

#### DNS
- **CoreDNS**
  - Used: Indirectly through Kubernetes (default DNS)
  - Context: K8s → CoreDNS (service discovery)
  - Status: INDIRECT - K8s uses CoreDNS

- **sslip.io** (Magic DNS)
  - Used: Exercise 5.6, 5.7 (Knative DNS)
  - Context: Automatic DNS for sslip.io domains
  - Status: DIRECT - Used for testing Knative services

---

### 7. **Storage**

#### Storage Classes
- **local-path provisioner** (k3s default)
  - Used: Implicitly in all exercises with volumes
  - Context: k3s → local-path (default storage class)
  - Status: INDIRECT - k3s default

#### Volume Types
- **emptyDir** (Kubernetes)
  - Used: Exercise 5.4 (init containers & sidecars)
  - Context: Shared volumes between containers
  - Status: DIRECT

- **PersistentVolume (PV)** / **PersistentVolumeClaim (PVC)**
  - Used: Exercise 1.11 (persistent volumes)
  - Context: PostgreSQL data storage
  - Status: DIRECT

#### Databases
- **PostgreSQL**
  - Used: Exercise 2.7, 2.8 (StatefulSet database)
  - Context: Stateful database workload
  - Status: DIRECT

---

### 8. **Observability & Analysis**

#### Monitoring
- **Prometheus**
  - Used: Exercise 2.10, 4.3 (metrics collection)
  - Context: Monitoring and metrics collection
  - Status: DIRECT

- **Grafana**
  - Used: Exercise 2.10 (dashboards)
  - Context: Visualization of metrics
  - Status: DIRECT

#### Logging
- **Loki**
  - Used: Exercise 2.10 (log aggregation)
  - Context: Log collection and querying
  - Status: DIRECT

- **Promtail** (Loki agent)
  - Used: Indirectly through Loki (Loki uses Promtail)
  - Context: Loki → Promtail (log shipper)
  - Status: INDIRECT

#### Distributed Tracing
- Mentioned in context but not directly used

---

### 9. **CI/CD**

#### Git & Version Control
- **Git**
  - Used: All exercises (course uses git repositories)
  - Context: `git commit`, `git push`, `git tag`
  - Status: DIRECT

- **GitHub**
  - Used: All exercises (repository hosting)
  - Context: Repository at github.com/Merkuryo/kubernetes-ejercicios
  - Status: DIRECT

#### CI/CD Platforms
- **GitHub Actions**
  - Used: Exercise 3.6+ (CI/CD workflows)
  - Context: Automated builds and deployments
  - Status: DIRECT

#### GitOps
- **ArgoCD**
  - Used: Exercise 4.7, 4.8 (GitOps deployments)
  - Context: Declarative deployments from Git
  - Status: DIRECT

#### Deployment Tools
- **Argo Rollouts**
  - Used: Exercise 4.4 (canary releases)
  - Context: Gradual traffic shifting for deployments
  - Status: DIRECT

- **Kustomize**
  - Used: Exercise 3.5, 4.9 (configuration management)
  - Context: Template-free customization of YAML
  - Status: DIRECT

---

### 10. **Programming & Runtimes**

#### Languages
- **JavaScript/Node.js**
  - Used: All applications (Ping-Pong, Todo, Log-Output, etc.)
  - Context: Application implementation language
  - Status: DIRECT

- **Go**
  - Used: Exercise 5.1 (custom controller)
  - Context: Building Kubernetes controllers
  - Status: DIRECT (implicitly - Kubebuilder example)

#### Frameworks
- **Express.js** (Node.js framework)
  - Used: All Node.js applications
  - Context: HTTP server framework
  - Status: DIRECT

---

### 11. **Cloud Providers & Managed Services**

#### Google Cloud Platform (GCP)
- **Google Kubernetes Engine (GKE)**
  - Used: Exercise 3.1-3.12 (Cloud-based Kubernetes)
  - Context: Managed Kubernetes on Google Cloud
  - Status: DIRECT

#### Image Registries
- **Google Container Registry (GCR)**
  - Used: Exercise 3.5+ (storing container images)
  - Context: Push/pull container images
  - Status: DIRECT

- **Google Cloud Storage (GCS)**
  - Used: Exercise 3.10 (backup destination)
  - Context: PostgreSQL backup storage
  - Status: DIRECT

#### Other Services
- **Cloud Build**
  - Used: Exercise 3.6 (implicit in GitHub Actions setup)
  - Context: Building container images
  - Status: IMPLIED

---

### 12. **Other Tools & Projects**

#### Apache Bench
- **ab** (Apache Bench)
  - Used: Mentioned in documentation for load testing
  - Context: Load generation for testing autoscaling
  - Status: DIRECT (documentation examples)

#### Event Messaging
- **NATS**
  - Used: Exercise 4.6 (broadcaster system)
  - Context: Event messaging between services
  - Status: DIRECT

#### Kubernetes Ecosystem
- **kubectl**
  - Used: All exercises (primary K8s interface)
  - Context: `kubectl apply`, `kubectl get`, `kubectl logs`, etc.
  - Status: FOUNDATIONAL - Every exercise

- **kubctl-apply** (declarative management)
  - Used: All exercises (declarative YAML)
  - Context: IaC approach to Kubernetes
  - Status: DIRECT

---

## Indirect Dependencies (2+ layers)

### Example Chains:

#### k3d Usage Chain
```
k3d 
  ↓ (contains)
k3s 
  ↓ (uses)
Kubernetes
  ↓ (uses)
Flannel (CNI)
CoreDNS (DNS)
local-path-provisioner (storage)
  ↓ (uses)
containerd (container runtime)
```

#### Istio Usage Chain
```
Istio
  ↓ (uses)
Envoy (data plane)
  ↓ (proxies traffic to)
Application Pods
  ↓ (run)
Docker containers
```

#### Knative Usage Chain
```
Knative Serving
  ↓ (uses)
Kourier (networking)
  ↓ (runs on)
Kubernetes
  ↓ (pods run in)
Containers
  ↓ (built with)
Docker/OCI
```

---

## Technology Count by Category

### By Direct Usage
| Category | Direct | Indirect | Total |
|----------|--------|----------|-------|
| Kubernetes/Orchestration | 4 | 3 | 7 |
| Networking | 2 | 2 | 4 |
| Serverless | 1 | 1 | 2 |
| Service Mesh | 1 | 1 | 2 |
| Observability | 3 | 1 | 4 |
| CI/CD | 5 | 0 | 5 |
| Storage | 2 | 1 | 3 |
| Cloud Providers | 3 | 0 | 3 |
| Programming | 2 | 0 | 2 |
| Other | 1 | 0 | 1 |
| **TOTAL** | **24** | **9** | **33** |

---

## CNCF Landscape Mapping

### A. Provisioning

**Direct Usage:**
- ☑ **k3d** - Local Kubernetes cluster creation
- ☑ **k3s** - Lightweight Kubernetes (indirect via k3d)
- ☑ **Docker** - Container runtime and image building

**Not Used But Relevant:**
- ☐ Terraform - Infrastructure as Code (could provision clusters)
- ☐ CloudFormation - AWS infrastructure
- ☐ Ansible - Configuration management

---

### B. Runtime

**Direct Usage:**
- ☑ **Docker** - Primary container runtime
- ☑ **containerd** - Indirect via k3s
- ☑ **Kubernetes** - Orchestration platform

**Not Used But Relevant:**
- ☐ Podman - Alternative container runtime
- ☐ CRIO - Container runtime interface

---

### C. Orchestration & Management

**Direct Usage:**
- ☑ **Kubernetes** - Primary orchestration
- ☑ **kubectl** - Command-line interface
- ☑ **Kustomize** - Configuration management
- ☑ **ArgoCD** - GitOps deployment
- ☑ **Argo Rollouts** - Deployment strategy

**Not Used But Relevant:**
- ☐ Docker Swarm - Container orchestration
- ☐ Nomad - HashiCorp orchestration

---

### D. App Definition & Image Build

**Direct Usage:**
- ☑ **Docker** - Container images
- ☑ **Dockerfile** - Image definition
- ☑ **Express.js** - Node.js framework
- ☑ **Node.js** - JavaScript runtime

**Not Used But Relevant:**
- ☐ Buildpacks - Alternative to Dockerfile
- ☐ Skaffold - Development workflow

---

### E. CI/CD

**Direct Usage:**
- ☑ **GitHub** - Repository hosting
- ☑ **GitHub Actions** - CI/CD automation
- ☑ **Git** - Version control
- ☑ **ArgoCD** - Deployment automation
- ☑ **Argo Rollouts** - Canary deployments

**Not Used But Relevant:**
- ☐ Jenkins - CI/CD platform
- ☐ GitLab CI - Alternative CI/CD
- ☐ CircleCI - Hosted CI/CD

---

### F. Networking

**Direct Usage:**
- ☑ **Traefik** - Ingress controller
- ☑ **Flannel** - Container network interface (indirect via k3s)
- ☑ **CoreDNS** - DNS (indirect via Kubernetes)
- ☑ **Istio** - Service mesh
- ☑ **Envoy** - Proxy (indirect via Istio)
- ☑ **Kourier** - Knative ingress controller (indirect)
- ☑ **sslip.io** - Magic DNS service

**Not Used But Relevant:**
- ☐ Cilium - Advanced networking
- ☐ Calico - Network policy
- ☐ Weave Net - Networking solution

---

### G. Service Mesh

**Direct Usage:**
- ☑ **Istio** - Service mesh (Exercises 5.2, 5.3)
- ☑ **Envoy** - Data plane proxy (indirect via Istio)

**Not Used But Relevant:**
- ☐ Linkerd - Lightweight service mesh
- ☐ Consul - Service mesh (HashiCorp)

---

### H. Serverless & FaaS

**Direct Usage:**
- ☑ **Knative** - Serverless on Kubernetes
- ☑ **Kourier** - Knative networking

**Not Used But Relevant:**
- ☐ OpenFaaS - Serverless framework
- ☐ Fission - Serverless platform
- ☐ AWS Lambda - Managed serverless (mentioned)

---

### I. Container Registry

**Direct Usage:**
- ☑ **Docker Hub** - Base image repository
- ☑ **Google Container Registry** - Image storage
- ☑ **GitHub Container Registry** - Alternative (implied)

**Not Used But Relevant:**
- ☐ Harbor - Private registry
- ☐ Artifactory - Artifact repository
- ☐ Quay.io - Registry service

---

### J. Storage

**Direct Usage:**
- ☑ **Kubernetes PersistentVolume** - Persistent storage
- ☑ **local-path-provisioner** - Storage class (indirect via k3s)
- ☑ **PostgreSQL** - Stateful database
- ☑ **emptyDir** - Ephemeral volumes

**Not Used But Relevant:**
- ☐ Longhorn - Distributed storage
- ☐ Rook - Cloud-native storage
- ☐ MinIO - Object storage

---

### K. Observability & Analysis

**Direct Usage:**
- ☑ **Prometheus** - Metrics collection
- ☑ **Grafana** - Visualization
- ☑ **Loki** - Log aggregation
- ☑ **Promtail** - Log shipper (indirect via Loki)

**Not Used But Relevant:**
- ☐ Jaeger - Distributed tracing
- ☐ ELK Stack - Elasticsearch, Logstash, Kibana
- ☐ Datadog - Observability platform

---

### L. Security & Compliance

**Direct Usage:**
- ☑ **RBAC** (Kubernetes native) - Role-based access control
- ☑ **NetworkPolicy** - Network segmentation (Exercise 2.3+)

**Not Used But Relevant:**
- ☐ Falco - Runtime security
- ☐ OPA/Gatekeeper - Policy enforcement
- ☐ Vault - Secrets management

---

### M. Platform & PaaS

**Direct Usage:**
- ☑ **Google Kubernetes Engine** - Managed Kubernetes
- ☑ **Knative** - Serverless platform

**Not Used But Relevant:**
- ☐ Red Hat OpenShift - Enterprise Kubernetes (mentioned in 5.5)
- ☐ Rancher - Kubernetes management (mentioned in 5.5)
- ☐ Cloud Foundry - PaaS platform

---

## Summary: By Exercise Series

### Series 1: Basic Kubernetes
- **Direct**: kubectl, Docker, Kubernetes, Traefik, Node.js, Express
- **Indirect**: k3s, Flannel, CoreDNS, local-path-provisioner
- **Tech Count**: 10

### Series 2: Intermediate Kubernetes
- **Added**: PostgreSQL, RBAC, Prometheus, Grafana, Loki, NATS
- **Tech Count**: +6 → 16

### Series 3: Cloud & CI/CD
- **Added**: GKE, GCR, GCS, GitHub Actions, Kustomize, Cloud Build
- **Tech Count**: +6 → 22

### Series 4: Advanced Patterns
- **Added**: ArgoCD, Argo Rollouts
- **Tech Count**: +2 → 24

### Series 5: Extending Kubernetes
- **Added**: Istio, Envoy, Knative, Kourier, Custom Controllers, Go
- **Tech Count**: +6 → 30

**Final Total**: ~33 distinct technologies (24 direct, 9 indirect)

---

## Key Learnings

### 1. Kubernetes Ecosystem is Vast
- Started with basic Kubernetes
- Expanded to: networking, observability, CI/CD, service mesh, serverless
- Each layer builds on previous layers

### 2. Layered Architecture
```
Applications (Node.js)
    ↓
Frameworks (Express)
    ↓
Kubernetes (orchestration)
    ↓
Container Runtime (Docker)
    ↓
Infrastructure (k3d/k3s/GKE)
```

### 3. Different Levels of Integration
- **Direct**: Explicitly used (kubectl, Docker, Prometheus)
- **Indirect**: Used through other tools (Flannel through k3s, Envoy through Istio)
- **Transitive**: Multiple layers deep (k3d → k3s → Kubernetes → Container runtime)

### 4. Open Source Foundation
- Most technologies used are open-source
- CNCF ecosystem is well-connected
- Easy to learn progression path

### 5. Cloud-Agnostic Pattern
- Started local (k3d)
- Moved to cloud (GKE)
- Pattern is transferable

---

## Conclusion

This course demonstrates a comprehensive journey through the cloud-native ecosystem:

1. **Foundation**: Kubernetes as orchestration platform
2. **Applications**: Containers built with Docker and Node.js
3. **Networking**: From basic ingress to service mesh (Istio)
4. **Operations**: Observability stack (Prometheus, Grafana, Loki)
5. **Deployment**: From manual kubectl to GitOps (ArgoCD)
6. **Advanced**: Serverless (Knative) and custom extensions (CRDs)

The technologies learned form a coherent ecosystem where each component plays a specific role in building production-ready cloud-native applications.

**Key Insight**: "Cloud Native" isn't about any single technology - it's about a collection of principles and tools that work together to enable scalable, resilient, and automated infrastructure.
