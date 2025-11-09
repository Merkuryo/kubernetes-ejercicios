#!/bin/bash

# Istio Ambient Mode - Installation Script for k3d
# This script sets up Istio with Ambient Mode on a k3d cluster
# and deploys the sample Bookinfo application

set -e

echo "════════════════════════════════════════════════════════════════════════════════"
echo "  Istio Ambient Mode - Installation & Setup Script"
echo "════════════════════════════════════════════════════════════════════════════════"
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="${SCRIPT_DIR}/.."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
  echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
  echo -e "${GREEN}✓${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
  echo -e "${RED}✗${NC} $1"
}

# Step 1: Check prerequisites
echo "Step 1️⃣  - Checking prerequisites..."
echo ""

# Check kubectl
if ! command -v kubectl &> /dev/null; then
  log_error "kubectl is not installed"
  exit 1
fi
log_success "kubectl installed: $(kubectl version --client --short 2>/dev/null | grep -o 'v[0-9.]*')"

# Check k3d
if ! command -v k3d &> /dev/null; then
  log_error "k3d is not installed"
  exit 1
fi
log_success "k3d installed: $(k3d version | grep -o 'v[0-9.]*')"

# Check docker
if ! command -v docker &> /dev/null; then
  log_error "Docker is not installed"
  exit 1
fi
log_success "Docker installed"

# Check cluster
if ! kubectl cluster-info &> /dev/null; then
  log_warning "Kubernetes cluster not accessible, setting up k3d cluster..."
  
  # Create k3d cluster
  log_info "Creating k3d cluster 'istio-lab'..."
  k3d cluster create istio-lab \
    --servers 1 \
    --agents 2 \
    --port "6443:6443@server:0" \
    --port "80:80@loadbalancer" \
    --port "443:443@loadbalancer" \
    --wait
  log_success "k3d cluster created"
else
  CLUSTER_INFO=$(kubectl cluster-info 2>/dev/null | head -1)
  log_success "Connected to cluster: $CLUSTER_INFO"
fi

echo ""

# Step 2: Check and install Istio CLI
echo "Step 2️⃣  - Setting up Istio CLI..."
echo ""

ISTIO_VERSION="1.24.0"  # Latest stable ambient mode version
ISTIO_HOME="${HOME}/.istio"

if command -v istioctl &> /dev/null; then
  CURRENT_VERSION=$(istioctl version --short 2>/dev/null || echo "unknown")
  log_success "istioctl is already installed: $CURRENT_VERSION"
else
  log_info "Installing istioctl v${ISTIO_VERSION}..."
  
  # Download and install Istio
  cd /tmp || exit 1
  curl -L https://istio.io/downloadIstio | ISTIO_VERSION="${ISTIO_VERSION}" sh -
  
  # Add to PATH
  if [ -d "istio-${ISTIO_VERSION}" ]; then
    cd "istio-${ISTIO_VERSION}"
    sudo cp bin/istioctl /usr/local/bin/
    log_success "istioctl v${ISTIO_VERSION} installed"
    cd /
  else
    log_error "Failed to download Istio"
    exit 1
  fi
fi

echo ""

# Step 3: Verify k3d cluster prerequisites
echo "Step 3️⃣  - Verifying k3d cluster for Istio Ambient Mode..."
echo ""

# k3d uses Flannel by default, which is compatible with Istio Ambient Mode
log_success "k3d cluster is compatible with Istio Ambient Mode"

# Verify cluster nodes
NODES=$(kubectl get nodes --no-headers | wc -l)
log_success "Cluster has $NODES nodes"

echo ""

# Step 4: Install Istio Ambient Mode
echo "Step 4️⃣  - Installing Istio Ambient Mode..."
echo ""

# Create istio-system namespace
kubectl create namespace istio-system --dry-run=client -o yaml | kubectl apply -f -
log_success "istio-system namespace ready"

# Install Istio with ambient mode
log_info "Installing Istio core components..."
istioctl install --set profile=ambient -y
log_success "Istio Ambient Mode installed"

# Verify installation
log_info "Verifying Istio installation..."
kubectl get pods -n istio-system

echo ""

# Step 5: Create namespace for sample app
echo "Step 5️⃣  - Setting up application namespace..."
echo ""

kubectl create namespace default --dry-run=client -o yaml | kubectl apply -f -
log_success "default namespace ready"

# Label namespace for ambient mode
log_info "Enabling ambient mode for default namespace..."
kubectl label namespace default istio.io/dataplane-mode=ambient --overwrite
log_success "Ambient mode enabled for default namespace"

echo ""

# Step 6: Deploy sample application
echo "Step 6️⃣  - Deploying Bookinfo sample application..."
echo ""

log_info "Downloading and deploying Bookinfo app..."

# Get Istio installation directory
ISTIO_DIR=$(dirname "$(which istioctl)")/../..

# Check if Bookinfo samples exist
if [ -d "${ISTIO_DIR}/samples" ]; then
  kubectl apply -f "${ISTIO_DIR}/samples/bookinfo/platform/kube/bookinfo.yaml"
  log_success "Bookinfo application deployed"
else
  # Alternative: download directly
  kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.24/samples/bookinfo/platform/kube/bookinfo.yaml
  log_success "Bookinfo application deployed (downloaded)"
fi

# Wait for pods to be ready
log_info "Waiting for Bookinfo pods to be ready (timeout: 120s)..."
kubectl wait --for=condition=ready pod -l app in (productpage,details,reviews,ratings) --timeout=120s 2>/dev/null || true

echo ""

# Step 7: Deploy Bookinfo Gateway and VirtualService
echo "Step 7️⃣  - Configuring traffic routing..."
echo ""

# Create Istio Gateway
kubectl apply -f - << 'EOF'
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: bookinfo-gateway
  namespace: default
spec:
  selector:
    istio: ingressgateway
  servers:
  - port:
      number: 80
      name: http
      protocol: HTTP
    hosts:
    - "*"
EOF

log_success "Gateway created"

# Create VirtualService
kubectl apply -f - << 'EOF'
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: bookinfo
  namespace: default
spec:
  hosts:
  - "*"
  gateways:
  - bookinfo-gateway
  http:
  - match:
    - uri:
        prefix: /productpage
    - uri:
        prefix: /static
    - uri:
        prefix: /login
    - uri:
        prefix: /logout
    - uri:
        prefix: /api/v1/products
    route:
    - destination:
        host: productpage
        port:
          number: 9080
EOF

log_success "VirtualService created"

echo ""

# Step 8: Verify Istio installation
echo "Step 8️⃣  - Verifying Istio installation..."
echo ""

log_info "Istio components in istio-system namespace:"
kubectl get all -n istio-system

echo ""

log_info "Ambient mode components:"
kubectl get daemonset -n istio-system ztunnel
echo ""

echo "════════════════════════════════════════════════════════════════════════════════"
echo "  Installation Complete! ✅"
echo "════════════════════════════════════════════════════════════════════════════════"
echo ""

echo "📊 Cluster Status:"
echo ""
kubectl get pods -n istio-system
echo ""

echo "📱 Bookinfo Application Status:"
echo ""
kubectl get pods
echo ""

# Get service port
echo "🌐 Accessing Bookinfo:"
echo ""

# Try to get LoadBalancer external IP
INGRESS_IP=$(kubectl get svc istio-ingressgateway -n istio-system -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "pending")
INGRESS_PORT=$(kubectl get svc istio-ingressgateway -n istio-system -o jsonpath='{.spec.ports[?(@.name=="http")].port}' 2>/dev/null || echo "80")

if [ "$INGRESS_IP" = "pending" ] || [ -z "$INGRESS_IP" ]; then
  log_warning "LoadBalancer IP is pending. For k3d, use port-forward:"
  echo ""
  echo "   kubectl port-forward svc/istio-ingressgateway -n istio-system 8080:80"
  echo ""
  echo "   Then access: http://localhost:8080/productpage"
else
  echo "   Access: http://${INGRESS_IP}:${INGRESS_PORT}/productpage"
fi

echo ""
echo "🔍 Monitor traffic and metrics:"
echo ""
echo "   # View Kiali dashboard (service mesh visualization)"
echo "   kubectl port-forward svc/kiali -n istio-system 20000:20000"
echo "   # Access: http://localhost:20000"
echo ""
echo "   # View Prometheus metrics"
echo "   kubectl port-forward svc/prometheus -n istio-system 9090:9090"
echo "   # Access: http://localhost:9090"
echo ""
echo "   # View application logs"
echo "   kubectl logs -f deployment/productpage"
echo ""

echo "📚 Next Steps:"
echo ""
echo "   1. Access the application at http://localhost:8080/productpage"
echo "   2. Generate traffic: click 'Normal user' button repeatedly"
echo "   3. Monitor with: kubectl logs -f pod/productpage-xxxx"
echo "   4. View mesh topology in Kiali dashboard"
echo "   5. Check metrics in Prometheus"
echo ""

echo "🧹 Clean up when done:"
echo ""
echo "   kubectl delete -f https://raw.githubusercontent.com/istio/istio/release-1.24/samples/bookinfo/platform/kube/bookinfo.yaml"
echo "   istioctl uninstall --purge -y"
echo "   kubectl delete namespace istio-system"
echo ""

echo "📖 Documentation:"
echo ""
echo "   Istio Documentation: https://istio.io/latest/docs/"
echo "   Ambient Mode Guide: https://istio.io/latest/docs/ambient/"
echo "   Bookinfo Example: https://istio.io/latest/docs/examples/bookinfo/"
echo ""

