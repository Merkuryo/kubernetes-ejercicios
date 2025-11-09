#!/bin/bash

set -e

echo "Installing ArgoCD and Separate Config Repo Setup..."

# Create argocd namespace
echo "Creating argocd namespace..."
kubectl create namespace argocd || echo "argocd namespace already exists"

# Install ArgoCD
echo "Installing ArgoCD..."
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Wait for ArgoCD to be ready
echo "Waiting for ArgoCD to be ready (this may take a minute)..."
kubectl wait --for=condition=available --timeout=300s deployment/argocd-server -n argocd || true
sleep 10

# Patch ArgoCD server to LoadBalancer
echo "Patching ArgoCD server to LoadBalancer..."
kubectl patch svc argocd-server -n argocd -p '{"spec": {"type": "LoadBalancer"}}' || true

# Create staging and production namespaces
echo "Creating staging and production namespaces..."
kubectl create namespace staging || echo "staging namespace already exists"
kubectl create namespace production || echo "production namespace already exists"

# Create secrets in both environments
echo "Creating secrets..."
kubectl create secret generic postgres-credentials \
  --from-literal=username=postgres \
  --from-literal=password=postgres \
  -n staging || echo "Secret already exists in staging"

kubectl create secret generic postgres-credentials \
  --from-literal=username=postgres \
  --from-literal=password=postgres \
  -n production || echo "Secret already exists in production"

# Create NATS
echo "Installing NATS via Helm..."
helm repo add bitnami https://charts.bitnami.com/bitnami || true
helm repo update

for namespace in staging production; do
  helm upgrade --install nats bitnami/nats \
    --namespace $namespace \
    --set auth.enabled=false \
    --set config.cluster.enabled=false \
    -w 2>&1 | head -20 || echo "NATS installation skipped or already exists in $namespace"
done

# Create ArgoCD applications
echo "Creating ArgoCD applications..."
kubectl apply -f ./applications.yaml

# Get ArgoCD password
echo ""
echo "ArgoCD has been installed successfully!"
echo ""
echo "To access ArgoCD UI:"
ARGOCD_IP=$(kubectl get svc argocd-server -n argocd -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "pending")
echo "  ArgoCD URL: https://$ARGOCD_IP:443"
echo "  Default username: admin"
echo "  Password:"
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d
echo ""

echo ""
echo "Applications created:"
kubectl get applications -n argocd

echo ""
echo "IMPORTANT: This setup expects two repositories:"
echo "1. APP REPOSITORY (kubernetes-ejercicios)"
echo "   - Contains: backend/ code"
echo "   - GitHub Actions: builds images, pushes to config repo"
echo ""
echo "2. CONFIG REPOSITORY (kubernetes-ejercicios-config)"
echo "   - Contains: base/ and overlays/ (Kubernetes manifests)"
echo "   - ArgoCD: watches this repo, syncs to cluster"
echo ""
echo "Next steps:"
echo "1. Create github.com/Merkuryo/kubernetes-ejercicios-config (or update it)"
echo "2. Push base/ and overlays/ to config repo"
echo "3. Update GitHub Actions secrets with CONFIG_REPO_OWNER"
echo "4. Make a commit to main in app repo to trigger workflow"
echo "5. Watch config repo get updated with new image tag"
echo "6. ArgoCD will auto-sync from config repo"
