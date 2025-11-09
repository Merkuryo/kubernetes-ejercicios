#!/bin/bash

# Script para deploy The Project usando GitOps + ArgoCD

set -e

echo "🔵 Ensuring ArgoCD is installed..."
kubectl create namespace argocd 2>/dev/null || echo "Namespace argocd already exists"
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml || echo "ArgoCD already installed"

echo "⏳ Waiting for ArgoCD to be ready..."
kubectl wait --for=condition=available --timeout=300s deployment/argocd-server -n argocd 2>/dev/null || echo "ArgoCD ready"

echo "🔧 Patching ArgoCD server to use LoadBalancer..."
kubectl patch svc argocd-server -n argocd -p '{"spec": {"type": "LoadBalancer"}}' 2>/dev/null || echo "Already patched"

echo ""
echo "📋 Deploying The Project applications via ArgoCD..."
kubectl apply -f applications.yaml

echo ""
echo "✅ The Project deployed via GitOps!"
echo ""
echo "📝 ArgoCD Applications created:"
kubectl get applications -n argocd

echo ""
echo "🔐 To access ArgoCD:"
EXTERNAL_IP=$(kubectl get svc argocd-server -n argocd -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "Pending...")
ADMIN_PASSWORD=$(kubectl get secret -n argocd argocd-initial-admin-secret -o jsonpath='{.data.password}' | base64 -d 2>/dev/null || echo "Not found")

echo "🌐 ArgoCD UI: https://$EXTERNAL_IP"
echo "👤 Username: admin"
echo "🔑 Password: $ADMIN_PASSWORD"

echo ""
echo "📊 Monitor applications:"
echo "kubectl get applications -n argocd"
echo "kubectl describe application the-project-backend -n argocd"
echo "kubectl get pods -A"
