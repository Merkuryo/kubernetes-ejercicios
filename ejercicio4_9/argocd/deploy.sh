#!/bin/bash

set -e

echo "Installing ArgoCD and creating multi-environment setup..."

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

# Create secrets in both environments (assumes secrets are applied outside ArgoCD)
echo "Note: Secrets (postgres-credentials, external-services) must be applied separately"
echo "Apply them with:"
echo "  kubectl apply -f secrets/postgres-credentials.yaml -n staging"
echo "  kubectl apply -f secrets/postgres-credentials.yaml -n production"
echo "  kubectl apply -f secrets/external-services.yaml -n staging"
echo "  kubectl apply -f secrets/external-services.yaml -n production"

# Create NATS
echo "Installing NATS via Helm..."
helm repo add bitnami https://charts.bitnami.com/bitnami || true
helm repo update
helm upgrade --install nats bitnami/nats \
  --namespace staging \
  --set auth.enabled=false \
  --set config.cluster.enabled=false \
  -w 2>&1 | head -20 || echo "NATS installation skipped or already exists"

helm upgrade --install nats bitnami/nats \
  --namespace production \
  --set auth.enabled=false \
  --set config.cluster.enabled=false \
  -w 2>&1 | head -20 || echo "NATS installation skipped or already exists"

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
echo "Next steps:"
echo "1. Apply secrets to staging and production namespaces"
echo "2. Monitor application sync in ArgoCD UI"
echo "3. Commits to main → staging deployment"
echo "4. Tags (stable) → production deployment"
