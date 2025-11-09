# CNCF Landscape: Technologies Used in This Course

## Quick Reference: All Technologies

### ✅ DIRECT USAGE (Explicitly used in code/commands)

| # | Technology | Category | Exercise | Usage |
|---|-----------|----------|----------|-------|
| 1 | **Kubernetes** | Orchestration | 1.1+ | Core platform for all exercises |
| 2 | **kubectl** | Orchestration | 1.1+ | Command-line interface |
| 3 | **k3d** | Provisioning | 1.1+ | Local cluster creation |
| 4 | **Docker** | Runtime | 1.1+ | Container images and runtime |
| 5 | **Node.js** | Runtime | 1.1+ | Application runtime |
| 6 | **Express.js** | App Framework | 1.1+ | HTTP server framework |
| 7 | **Traefik** | Networking | 1.7+ | Ingress controller |
| 8 | **PostgreSQL** | Storage | 2.7+ | Stateful database |
| 9 | **Prometheus** | Observability | 2.10+ | Metrics collection |
| 10 | **Grafana** | Observability | 2.10+ | Metrics visualization |
| 11 | **Loki** | Observability | 2.10+ | Log aggregation |
| 12 | **Git** | CI/CD | 1.1+ | Version control |
| 13 | **GitHub** | CI/CD | 1.1+ | Repository hosting |
| 14 | **GitHub Actions** | CI/CD | 3.6+ | CI/CD automation |
| 15 | **Kustomize** | Configuration | 3.5+ | YAML customization |
| 16 | **ArgoCD** | CI/CD | 4.7+ | GitOps deployment |
| 17 | **Argo Rollouts** | Deployment | 4.4+ | Canary deployments |
| 18 | **NATS** | Messaging | 4.6+ | Event messaging |
| 19 | **Google Kubernetes Engine** | Cloud | 3.1+ | Managed Kubernetes |
| 20 | **Google Container Registry** | Registry | 3.5+ | Image storage |
| 21 | **Google Cloud Storage** | Storage | 3.10+ | Backup storage |
| 22 | **Istio** | Service Mesh | 5.2+ | Traffic management |
| 23 | **Knative** | Serverless | 5.6+ | Serverless platform |
| 24 | **sslip.io** | DNS | 5.6+ | Magic DNS service |

### 🔗 INDIRECT USAGE (Used through other tools)

| # | Technology | Category | Via | Usage |
|---|-----------|----------|-----|-------|
| 1 | **k3s** | Orchestration | k3d | Lightweight Kubernetes |
| 2 | **Flannel** | Networking | k3s | Container network interface |
| 3 | **CoreDNS** | Networking | Kubernetes | DNS service |
| 4 | **local-path-provisioner** | Storage | k3s | Storage class |
| 5 | **containerd** | Runtime | k3s | Container runtime |
| 6 | **Envoy** | Networking | Istio | Proxy sidecar |
| 7 | **Promtail** | Observability | Loki | Log shipper |
| 8 | **Kourier** | Networking | Knative | Ingress for Knative |
| 9 | **RBAC** | Security | Kubernetes | Access control |

---

## CNCF Landscape Categories Coverage

### 📍 A. Provisioning
```
✅ USED:
├─ k3d (local cluster)
├─ k3s (lightweight K8s - indirect)
└─ Docker (container runtime)

❌ NOT USED:
├─ Terraform
├─ CloudFormation
├─ Ansible
└─ Pulumi
```

### 📍 B. Runtime
```
✅ USED:
├─ Docker (primary)
├─ containerd (indirect via k3s)
└─ Kubernetes

❌ NOT USED:
├─ Podman
└─ CRIO
```

### 📍 C. Orchestration & Management
```
✅ USED:
├─ Kubernetes (primary)
├─ kubectl (CLI)
├─ Kustomize (config management)
├─ ArgoCD (GitOps)
└─ Argo Rollouts (canary)

❌ NOT USED:
├─ Docker Swarm
├─ Nomad
└─ Mesos
```

### 📍 D. App Definition & Image Build
```
✅ USED:
├─ Docker (images)
├─ Dockerfile (specs)
├─ Node.js (runtime)
└─ Express (framework)

❌ NOT USED:
├─ Buildpacks
├─ Skaffold
└─ Bazel
```

### 📍 E. CI/CD
```
✅ USED:
├─ GitHub (repository)
├─ GitHub Actions (CI/CD)
├─ Git (version control)
├─ ArgoCD (deployment)
└─ Argo Rollouts (rollout)

❌ NOT USED:
├─ Jenkins
├─ GitLab CI
├─ CircleCI
└─ Travis CI
```

### 📍 F. Networking
```
✅ USED:
├─ Traefik (ingress)
├─ Flannel (CNI - indirect)
├─ CoreDNS (DNS - indirect)
├─ Istio (service mesh)
├─ Envoy (proxy - indirect)
├─ Kourier (Knative ingress - indirect)
└─ sslip.io (DNS service)

❌ NOT USED:
├─ Cilium
├─ Calico
├─ Weave
└─ MetalLB
```

### 📍 G. Service Mesh
```
✅ USED:
├─ Istio (primary)
└─ Envoy (data plane - indirect)

❌ NOT USED:
├─ Linkerd
└─ Consul
```

### 📍 H. Serverless & FaaS
```
✅ USED:
├─ Knative (primary)
└─ Kourier (networking - indirect)

❌ NOT USED:
├─ OpenFaaS
├─ Fission
└─ AWS Lambda
```

### 📍 I. Container Registry
```
✅ USED:
├─ Docker Hub (base images)
├─ Google Container Registry (storage)
└─ GitHub Container Registry (storage)

❌ NOT USED:
├─ Harbor
├─ Artifactory
└─ Quay.io
```

### 📍 J. Storage
```
✅ USED:
├─ Kubernetes PV/PVC
├─ local-path-provisioner (indirect)
├─ PostgreSQL (database)
└─ emptyDir (ephemeral)

❌ NOT USED:
├─ Longhorn
├─ Rook
├─ MinIO
└─ Ceph
```

### 📍 K. Observability & Analysis
```
✅ USED:
├─ Prometheus (metrics)
├─ Grafana (visualization)
├─ Loki (logs)
└─ Promtail (shipper - indirect)

❌ NOT USED:
├─ Jaeger (tracing)
├─ Zipkin (tracing)
├─ ELK (elasticsearch-based)
└─ Datadog (SaaS)
```

### 📍 L. Security & Compliance
```
✅ USED:
├─ RBAC (role-based access)
└─ NetworkPolicy (network security)

❌ NOT USED:
├─ Falco (runtime security)
├─ OPA/Gatekeeper (policy)
├─ Vault (secrets)
└─ Sealed Secrets
```

### 📍 M. Platform & Higher-Level
```
✅ USED:
├─ Google Kubernetes Engine (managed K8s)
└─ Knative (serverless platform)

❌ NOT USED:
├─ OpenShift (mentioned but not used)
├─ Rancher (mentioned but not used)
└─ Cloud Foundry
```

---

## Technology Timeline

### Series 1 - Basics
**Week 1-2: Foundation**
- Kubernetes, kubectl, k3d, Docker, Node.js, Express

**Week 3-4: Networking & Storage**
- + Traefik, Persistent Volumes, PostgreSQL

### Series 2 - Intermediate
**Week 5-6: Databases & Multi-Service**
- + StatefulSet, ConfigMaps, Namespaces

**Week 7-8: Observability**
- + Prometheus, Grafana, Loki

### Series 3 - Cloud & CI/CD
**Week 9-10: Cloud Platform**
- + Google Kubernetes Engine, Google Container Registry

**Week 11-12: CI/CD & Automation**
- + GitHub Actions, Kustomize, Cloud Build

### Series 4 - Advanced
**Week 13-14: Deployment Patterns**
- + ArgoCD, Argo Rollouts, GitOps

**Week 15-16: Event-Driven Architecture**
- + NATS, complex microservices

### Series 5 - Extending Kubernetes
**Week 17-18: Custom Extensions & Service Mesh**
- + Istio, Envoy, Custom Controllers

**Week 19-20: Serverless & Cloud Native**
- + Knative, Kourier, Scale-to-zero

**Week 21: Summary & Landscape**
- Retrospective of all technologies learned

---

## Technology by Maturity

### 🟢 CNCF Graduated
- **Kubernetes** - Primary orchestration
- **Docker** - Container runtime
- **Prometheus** - Metrics
- **Fluentd** - (Loki alternative, not used)
- **CoreDNS** - DNS
- **Envoy** - Proxy
- **Containerd** - Runtime
- **Argo** - Deployment

### 🟡 CNCF Incubating
- **Istio** - Service mesh
- **Knative** - Serverless
- **Argo Rollouts** - Canary deployments
- **Kustomize** - Configuration

### 🔵 CNCF Sandbox / Emerging
- **Loki** - Logging
- **ArgoCD** - GitOps
- **Traefik** - Ingress (also outside CNCF)

### ⚪ Non-CNCF
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **PostgreSQL** - Database
- **GitHub** - Repository hosting
- **Google Cloud** - Cloud provider
- **sslip.io** - DNS service

---

## What We Didn't Use

### Notable Omissions

**Storage**
- ❌ Longhorn (distributed block storage)
- ❌ Rook (cloud-native storage)
- ❌ Ceph (storage cluster)

**Observability**
- ❌ Jaeger (distributed tracing)
- ❌ OpenTelemetry (observability standards)
- ❌ Datadog (commercial SaaS)

**Security**
- ❌ Falco (runtime security)
- ❌ OPA/Gatekeeper (policy enforcement)
- ❌ HashiCorp Vault (secrets management)

**Service Mesh Alternatives**
- ❌ Linkerd (lightweight service mesh)
- ❌ Consul (service mesh + config)

**Serverless Alternatives**
- ❌ OpenFaaS (serverless framework)
- ❌ Fission (serverless functions)
- ❌ AWS Lambda (managed serverless)

**Advanced Networking**
- ❌ Cilium (advanced networking/security)
- ❌ Calico (network policy)
- ❌ MetalLB (load balancer for on-prem)

---

## By the Numbers

### Total Technologies: 33

**Breakdown:**
- Direct usage: 24 technologies
- Indirect usage: 9 technologies

### By Category
- Orchestration: 7 (Kubernetes, kubectl, k3d, k3s, RBAC, etc.)
- Networking: 7 (Traefik, Flannel, CoreDNS, Istio, Envoy, Kourier, sslip.io)
- Observability: 4 (Prometheus, Grafana, Loki, Promtail)
- CI/CD: 5 (Git, GitHub, GitHub Actions, ArgoCD, Argo Rollouts)
- Runtime: 3 (Docker, Node.js, Express)
- Storage: 3 (PostgreSQL, PV/PVC, local-path-provisioner)
- Cloud: 3 (GKE, GCR, GCS)
- Serverless: 2 (Knative, Kourier)
- Messaging: 1 (NATS)
- Other: 1 (sslip.io)

---

## Key Insights

### 1. Layering
```
User Applications (Node.js/Express)
    ↓
Kubernetes Ecosystem (kubectl, Kustomize, ArgoCD)
    ↓
Container Platform (Docker, Kubernetes, k3d/GKE)
    ↓
Infrastructure (Networking, Storage, Compute)
    ↓
Cloud Provider (k3s/GKE/Google Cloud)
```

### 2. Ecosystem Interconnection
- Every tool serves a specific purpose
- Tools are often used together (e.g., Prometheus + Grafana)
- Cloud-native tools are designed to integrate

### 3. Open Source Dominance
- 80%+ of tools are open-source
- CNCF provides standardization
- Knowledge is highly transferable

### 4. Progressive Complexity
- Start: Kubernetes + containers
- Intermediate: Networking + observability
- Advanced: Service mesh + serverless + GitOps
- Expert: Custom extensions + multi-cluster

### 5. Real-World Production Ready
- All technologies used are production-ready
- CNCF projects have backing and governance
- Enterprise support available for most

---

## Recommendations for Deeper Learning

### Advanced Networking
- Study **Cilium** or **Calico** for advanced network policies
- Explore **MetalLB** for on-premises load balancing

### Enhanced Observability
- Add **Jaeger** for distributed tracing
- Explore **OpenTelemetry** for unified instrumentation
- Consider **Datadog** or **New Relic** for commercial SaaS

### Security Hardening
- Learn **OPA/Gatekeeper** for policy enforcement
- Implement **Falco** for runtime security
- Use **Vault** for secrets management

### Storage Solutions
- Deploy **Rook** for managed Ceph storage
- Try **Longhorn** for distributed block storage
- Evaluate **MinIO** for S3-compatible object storage

### Serverless Advanced Topics
- Explore **OpenFaaS** for alternative serverless
- Learn **Fission** for function composition
- Study AWS Lambda for managed serverless

---

## Conclusion

This course demonstrates mastery of the CNCF Cloud Native Landscape through practical, hands-on experience with:

- **Core Technologies**: Kubernetes, Docker, container orchestration
- **Operational Tools**: Monitoring, logging, tracing
- **Deployment Automation**: CI/CD, GitOps, GitOps
- **Advanced Patterns**: Service mesh, serverless, custom controllers
- **Cloud Integration**: Multi-cloud capability, managed services

The journey from **basic Kubernetes** (Series 1) to **extending Kubernetes** (Series 5) demonstrates that cloud-native is not about individual technologies, but about understanding how they work together to build scalable, resilient, and automated infrastructure.
