# Exercise 3.5: The project, step 14 - Kustomize Deployment

## Overview

This exercise introduces **Kustomize**, a powerful configuration management tool built into kubectl. Kustomize enables declarative configuration customization without modifying original YAML files, making it ideal for deploying the same application across different environments with varying configurations.

We create a simple "Color Content" web application and deploy it to GKE using Kustomize for image management.

## What is Kustomize?

Kustomize is a tool that:
- Enables configuration customization of Kubernetes manifests
- Is built into kubectl (no separate installation needed)
- Uses a `kustomization.yaml` file to define transformations
- Allows image patching, resource overlays, and more without editing original files

**Key difference from Helm:**
- Kustomize: Lightweight, native to kubectl, uses overlays
- Helm: Full template engine with package management

## Architecture

```
Developer
    ↓
Dockerfile + index.html
    ↓
Docker build → Docker image (colorcontent)
    ↓
docker push → Google Container Registry (gcr.io/dwk-gke-477617/colorcontent:latest)
    ↓
kustomization.yaml (image replacement)
    ↓
kubectl apply -k .
    ↓
GKE Cluster
    ↓
Service (LoadBalancer) → Deployment
```

## Project Structure

```
ejercicio3_5/
├── Dockerfile                 # nginx:1.19-alpine with index.html
├── index.html                 # Simple HTML with gray background
├── kustomization.yaml         # Kustomize configuration
└── manifests/
    ├── deployment.yaml        # Deployment with image placeholder
    └── service.yaml           # LoadBalancer service
```

## Files Explained

### Dockerfile

```dockerfile
FROM nginx:1.19-alpine
COPY index.html /usr/share/nginx/html
```

- Base image: nginx 1.19 (Alpine Linux, lightweight)
- Copies index.html to nginx's default document root
- Exposes port 80 (default nginx)

### index.html

Simple HTML page with gray background:
```html
<!DOCTYPE html>
<html>
  <body style="background-color: gray;">
    <p>Content</p>
  </body>
</html>
```

### manifests/service.yaml

```yaml
apiVersion: v1
kind: Service
metadata:
  name: dwk-environments-svc
spec:
  type: LoadBalancer
  selector:
    app: dwk-environments
  ports:
    - port: 80
      protocol: TCP
      targetPort: 80
```

- **type: LoadBalancer**: Exposes service to external traffic (GCP provisions load balancer)
- **port: 80**: External listening port
- **targetPort: 80**: Container port (nginx)

### manifests/deployment.yaml

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dwk-environments
spec:
  replicas: 1
  selector:
    matchLabels:
      app: dwk-environments
  template:
    metadata:
      labels:
        app: dwk-environments
    spec:
      containers:
        - name: dwk-environments
          image: PROJECT/IMAGE  # ← Placeholder for Kustomize
          # ... resources and health checks
```

**Key point**: Image is a **placeholder** `PROJECT/IMAGE` that Kustomize will replace.

### kustomization.yaml

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - manifests/deployment.yaml
  - manifests/service.yaml

images:
  - name: PROJECT/IMAGE
    newName: gcr.io/dwk-gke-477617/colorcontent
    newTag: latest
```

**What it does:**
1. **resources**: Lists all Kubernetes manifests to include
2. **images**: 
   - `name`: Image placeholder to search for
   - `newName`: Registry path to use
   - `newTag`: Image tag

When you run `kubectl apply -k .`, Kustomize will:
1. Read all resources from `manifests/`
2. Find all occurrences of `PROJECT/IMAGE`
3. Replace with `gcr.io/dwk-gke-477617/colorcontent:latest`

## Kustomize Workflow

### 1. Preview what Kustomize will generate

```bash
kubectl kustomize .
```

This outputs the final manifests without applying them (dry-run):
```yaml
# Service
apiVersion: v1
kind: Service
metadata:
  name: dwk-environments-svc
spec:
  type: LoadBalancer
  selector:
    app: dwk-environments
  ports:
    - port: 80
      protocol: TCP
      targetPort: 80
---
# Deployment (with image replaced)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dwk-environments
spec:
  replicas: 1
  selector:
    matchLabels:
      app: dwk-environments
  template:
    metadata:
      labels:
        app: dwk-environments
    spec:
      containers:
        - name: dwk-environments
          image: gcr.io/dwk-gke-477617/colorcontent:latest  # ← Replaced!
```

### 2. Apply with Kustomize

```bash
kubectl apply -k .
```

Kustomize processes the `kustomization.yaml` and applies all resources.

## Deployment Steps

### 1. Build Docker image locally

```bash
cd ejercicio3_5
docker build -t colorcontent .
```

### 2. Tag for Google Container Registry

```bash
docker tag colorcontent gcr.io/dwk-gke-477617/colorcontent:latest
```

### 3. Configure Docker for GCR

```bash
gcloud auth configure-docker gcr.io --quiet
```

### 4. Push to GCR

```bash
docker push gcr.io/dwk-gke-477617/colorcontent:latest
```

### 5. Deploy to GKE with Kustomize

```bash
cd ejercicio3_5
kubectl apply -k .
```

### 6. Check deployment status

```bash
kubectl get deployment dwk-environments
kubectl get service dwk-environments-svc
```

### 7. Access the application

```bash
# Get LoadBalancer IP
kubectl get service dwk-environments-svc

# Access in browser
curl http://<EXTERNAL-IP>
```

## Kustomize Features

### Image Patching

```yaml
images:
  - name: PROJECT/IMAGE
    newName: my-registry/my-app
    newTag: v1.2.3
```

Automatically replaces all image references (simple yet powerful).

### Resource Overlays

```yaml
commonLabels:
  version: v3.5
  environment: production
```

Adds labels to all resources.

### Namespace Setting

```yaml
namespace: production
```

Sets namespace for all resources.

### Resource Name Prefix/Suffix

```yaml
namePrefix: prod-
nameSuffix: -v1
```

Transforms all resource names.

## Comparison: Manual vs Kustomize

### Manual Deployment (❌ Error-prone)

```bash
# Easy to forget one file
kubectl apply -f manifests/deployment.yaml
kubectl apply -f manifests/service.yaml

# Hard-coded image paths
# Must edit files to change images
```

### With Kustomize (✅ Clean)

```bash
# One command, all files
kubectl apply -k .

# Image management via kustomization.yaml
# No file editing needed
```

## Advanced Kustomize Patterns

### Multiple Environments

```
project/
├── base/
│   ├── deployment.yaml
│   ├── service.yaml
│   └── kustomization.yaml
├── overlays/
│   ├── development/
│   │   ├── kustomization.yaml  (more replicas, no limit)
│   │   └── patch.yaml
│   └── production/
│       ├── kustomization.yaml  (high availability)
│       ├── patch.yaml
│       └── resources.yaml
```

Usage:
```bash
kubectl apply -k project/overlays/production
```

### Strategic Merge Patches

```yaml
patchesStrategicMergePatches:
  - |-
    apiVersion: apps/v1
    kind: Deployment
    metadata:
      name: dwk-environments
    spec:
      replicas: 3
```

## Troubleshooting

### Image not replaced

```bash
# Check what Kustomize would do
kubectl kustomize .

# Ensure image name matches exactly in deployment.yaml
# Check for typos in kustomization.yaml
```

### Manifest not included

```bash
# List all resources Kustomize will use
kubectl kustomize .

# Verify paths in resources: section
# Check file names match exactly
```

### gcloud push fails

```bash
# Re-authenticate Docker
gcloud auth configure-docker gcr.io --quiet

# Check GCP project
gcloud config get-value project

# Verify image repository exists
gcloud container images list
```

## Key Learning Points

✅ Kustomize is a lightweight configuration management tool
✅ Image patching avoids hardcoding container registries
✅ `kubectl apply -k .` applies all resources defined in kustomization.yaml
✅ `kubectl kustomize .` previews final manifests without applying
✅ Enables same code deployment across dev/staging/production
✅ Integrates natively with kubectl (no extra installation)

## References

- [Kustomize Official Documentation](https://kustomize.io/)
- [Kustomize Cheat Sheet](https://kubectl.docs.kubernetes.io/references/kustomize/)
- [Kubernetes Kustomization Integration](https://kubernetes.io/docs/tasks/manage-kubernetes-objects/declarative-config/#kustomize)
- [GCP Container Registry](https://cloud.google.com/container-registry)

## Next Steps

This project sets the foundation for:
- **Exercise 3.6**: GitHub Actions for automatic deployment
- **Exercise 3.7**: Environment-specific overlays
- **Exercise 3.8**: Multi-stage Dockerfile optimization

## Learning Outcomes

✅ Understand Kustomize and its benefits over manual deployment
✅ Create kustomization.yaml for image management
✅ Use kubectl with -k flag for Kustomize deployments
✅ Build and push Docker images to Google Container Registry
✅ Deploy applications to GKE with automatic image substitution
✅ Preview manifests without applying (dry-run)
