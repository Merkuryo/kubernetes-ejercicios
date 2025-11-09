#!/bin/bash

# Script para instalar ArgoCD y crear la aplicación

set -e

echo "🔵 Installing ArgoCD..."
kubectl create namespace argocd 2>/dev/null || echo "Namespace argocd already exists"
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

echo "⏳ Waiting for ArgoCD to be ready..."
kubectl wait --for=condition=available --timeout=300s deployment/argocd-server -n argocd

echo "🔧 Patching ArgoCD server to use LoadBalancer..."
kubectl patch svc argocd-server -n argocd -p '{"spec": {"type": "LoadBalancer"}}' 2>/dev/null || echo "Already patched"

echo "⏳ Waiting for LoadBalancer IP..."
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=argocd-server -n argocd --timeout=120s || true

echo ""
echo "✅ ArgoCD installed successfully!"
echo ""
echo "📋 Getting ArgoCD details..."

# Get external IP
EXTERNAL_IP=$(kubectl get svc argocd-server -n argocd -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "Pending...")
echo "🌐 ArgoCD UI URL: https://$EXTERNAL_IP"

# Get initial password
echo ""
echo "🔐 Getting admin password..."
ADMIN_PASSWORD=$(kubectl get secret -n argocd argocd-initial-admin-secret -o jsonpath='{.data.password}' | base64 -d)
echo "✅ Admin password: $ADMIN_PASSWORD"

echo ""
echo "📝 Next steps:"
echo "1. Access ArgoCD UI at https://$EXTERNAL_IP"
echo "2. Login with username: admin"
echo "3. Login password: $ADMIN_PASSWORD"
echo "4. Create a new app with:"
echo "   - Repository: https://github.com/Merkuryo/kubernetes-ejercicios"
echo "   - Path: ejercicio4_7/manifests"
echo "   - Sync policy: Automatic"
