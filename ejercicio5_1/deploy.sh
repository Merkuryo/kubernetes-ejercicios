#!/bin/bash

# DummySite Controller - Installation Script
# This script sets up the CRD, RBAC, and controller deployment

set -e

echo "════════════════════════════════════════════════════════════"
echo "  DummySite CRD & Controller - Installation Script"
echo "════════════════════════════════════════════════════════════"
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MANIFESTS_DIR="${SCRIPT_DIR}/manifests"

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
  echo "✗ kubectl is not installed or not in PATH"
  exit 1
fi

# Check cluster connectivity
echo "🔍 Checking cluster connectivity..."
if ! kubectl cluster-info &> /dev/null; then
  echo "✗ Cannot connect to Kubernetes cluster"
  exit 1
fi

CLUSTER_INFO=$(kubectl cluster-info 2>/dev/null | head -1)
echo "✓ Connected to cluster: $CLUSTER_INFO"
echo ""

# Step 1: Apply CRD
echo "Step 1️⃣  - Creating CustomResourceDefinition (CRD)..."
kubectl apply -f "${MANIFESTS_DIR}/resourcedefinition.yaml"
echo "✓ CRD created"
echo ""

# Step 2: Apply RBAC
echo "Step 2️⃣  - Setting up RBAC (ServiceAccount, ClusterRole, ClusterRoleBinding)..."
kubectl apply -f "${MANIFESTS_DIR}/serviceaccount.yaml"
kubectl apply -f "${MANIFESTS_DIR}/clusterrole.yaml"
kubectl apply -f "${MANIFESTS_DIR}/clusterrolebinding.yaml"
echo "✓ RBAC configured"
echo ""

# Step 3: Build and push controller image (if Dockerfile exists)
DOCKERFILE="${SCRIPT_DIR}/../controller/Dockerfile"
if [ -f "$DOCKERFILE" ]; then
  echo "Step 3️⃣  - Controller image (local development)"
  echo "  Note: For production, you would:"
  echo "  1. Build: docker build -t dummysite-controller:v1 ../controller"
  echo "  2. Push: docker push YOUR_REGISTRY/dummysite-controller:v1"
  echo "  3. Update deployment.yaml with your registry"
  echo ""
fi

# Step 4: Deploy controller
echo "Step 4️⃣  - Deploying DummySite Controller..."
kubectl apply -f "${MANIFESTS_DIR}/deployment.yaml"
echo "✓ Controller deployed"
echo ""

# Step 5: Wait for deployment to be ready
echo "Step 5️⃣  - Waiting for controller to be ready (timeout: 60s)..."
if kubectl rollout status deployment/dummysite-controller-dep -n default --timeout=60s 2>/dev/null; then
  echo "✓ Controller is ready"
  echo ""
else
  echo "⚠ Timeout waiting for controller to be ready"
  echo "  Check logs with: kubectl logs -l app=dummysite-controller"
  echo ""
fi

# Step 6: Verify CRD
echo "Step 6️⃣  - Verifying CRD installation..."
if kubectl get crd dummysites.stable.dwk &>/dev/null; then
  echo "✓ CRD dummysites.stable.dwk is installed"
  echo ""
else
  echo "✗ CRD not found"
  exit 1
fi

# Step 7: Show deployment status
echo "════════════════════════════════════════════════════════════"
echo "  Installation Complete!"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "📊 Current Status:"
echo ""
echo "  CRD:"
kubectl get crd dummysites.stable.dwk
echo ""
echo "  ServiceAccount:"
kubectl get sa dummysite-controller-account
echo ""
echo "  ClusterRole:"
kubectl get clusterrole dummysite-controller-role
echo ""
echo "  ClusterRoleBinding:"
kubectl get clusterrolebinding dummysite-controller-rolebinding
echo ""
echo "  Controller Deployment:"
kubectl get deployment dummysite-controller-dep -n default
echo ""
echo "  Controller Pod:"
kubectl get pods -l app=dummysite-controller
echo ""
echo "🚀 Next Steps:"
echo ""
echo "  1. Check controller logs:"
echo "     kubectl logs -f -l app=dummysite-controller"
echo ""
echo "  2. Create a DummySite resource:"
echo "     kubectl apply -f ${MANIFESTS_DIR}/dummysite-example.yaml"
echo ""
echo "  3. Watch the controller create resources:"
echo "     kubectl get dummysites -w"
echo ""
echo "  4. Check created resources:"
echo "     kubectl get deployments"
echo "     kubectl get services"
echo "     kubectl get configmaps"
echo ""
echo "  5. Access the website copy via LoadBalancer:"
echo "     kubectl get svc example-com-service"
echo ""
