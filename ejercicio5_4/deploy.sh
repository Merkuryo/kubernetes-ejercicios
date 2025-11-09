#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_header() {
  echo -e "\n${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║ $1${NC}"
  echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}\n"
}

print_success() {
  echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
  echo -e "${RED}❌ $1${NC}"
}

print_warning() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
  echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check prerequisites
print_header "Checking Prerequisites"

if ! command -v kubectl &> /dev/null; then
  print_error "kubectl not found. Please install kubectl first."
  exit 1
fi
print_success "kubectl is installed"

# Deploy resources
print_header "Deploying Wikipedia Pod with Init Container and Sidecar"

print_info "Creating Wikipedia Pod..."
kubectl apply -f manifests/wikipedia-pod.yaml
print_success "Pod created"

print_info "Creating Wikipedia Service..."
kubectl apply -f manifests/wikipedia-service.yaml
print_success "Service created"

# Wait for pod to be ready
print_header "Waiting for Pod to be Ready"

print_info "Waiting for wikipedia-pod to be ready (this may take a minute)..."
kubectl wait --for=condition=ready pod/wikipedia-pod --timeout=120s 2>/dev/null || true

# Show pod status
echo ""
kubectl get pod wikipedia-pod -o wide

# Get pod details
print_header "Pod Information"

print_info "Init Container Status:"
kubectl get pod wikipedia-pod -o jsonpath='{.status.initContainerStatuses[*].name}' | tr ' ' '\n' | while read -r container; do
  STATUS=$(kubectl get pod wikipedia-pod -o jsonpath="{.status.initContainerStatuses[?(@.name==\"$container\")].ready}")
  echo "  • $container: $STATUS"
done

print_info "Main Containers Status:"
kubectl get pod wikipedia-pod -o jsonpath='{.status.containerStatuses[*].name}' | tr ' ' '\n' | while read -r container; do
  READY=$(kubectl get pod wikipedia-pod -o jsonpath="{.status.containerStatuses[?(@.name==\"$container\")].ready}")
  STARTED=$(kubectl get pod wikipedia-pod -o jsonpath="{.status.containerStatuses[?(@.name==\"$container\")].started}")
  echo "  • $container: ready=$READY, started=$STARTED"
done

# Show logs
print_header "Container Logs"

print_info "Init Container Logs:"
echo "---"
kubectl logs wikipedia-pod --container wikipedia-init 2>/dev/null || echo "Init container finished (as expected)"
echo ""

print_info "Sidecar Container Logs (last 10 lines):"
echo "---"
kubectl logs wikipedia-pod --container wikipedia-sidecar --tail=10 2>/dev/null || echo "Sidecar logs not available yet"
echo ""

# Get service info
print_header "Service Information"

kubectl get svc wikipedia-svc -o wide

# Get accessible ports
NODE_PORT=$(kubectl get svc wikipedia-svc -o jsonpath='{.spec.ports[0].nodePort}')
print_info "Service is accessible on NodePort: $NODE_PORT"

# Show accessed pages
print_header "Checking Fetched Wikipedia Pages"

print_info "Listing files in pod's www directory..."
echo ""
kubectl exec wikipedia-pod -c nginx -- ls -lah /usr/share/nginx/html 2>/dev/null | head -20 || print_warning "Could not list directory yet"

# Access instructions
print_header "Access Instructions"

print_info "Port-forward to the service:"
print_info "  kubectl port-forward svc/wikipedia-svc 8080:80"
print_info ""
print_info "Then open in browser:"
print_info "  http://localhost:8080"
print_info ""

print_info "Or use kubectl port-forward with pod:"
print_info "  kubectl port-forward pod/wikipedia-pod 8080:80"
print_info ""

print_info "Direct curl access (inside cluster):"
print_info "  kubectl exec wikipedia-pod -c nginx -- curl -s http://localhost/Kubernetes.html | head -50"
print_info ""

# Monitoring
print_header "Monitoring"

print_info "Watch pod logs in real-time:"
print_info "  kubectl logs -f wikipedia-pod --container wikipedia-sidecar"
print_info ""

print_info "Watch pod status:"
print_info "  kubectl get pod wikipedia-pod -w"
print_info ""

# Container information
print_header "Container Information"

print_info "Init Container:"
echo "  • Runs once before main containers"
echo "  • Fetches Kubernetes Wikipedia page"
echo "  • Saves to shared /www volume"
echo "  • Pod waits for init to complete before starting main containers"
echo ""

print_info "Main Container (nginx):"
echo "  • Serves content from /usr/share/nginx/html"
echo "  • Mounted from shared /www volume"
echo "  • Port 80"
echo ""

print_info "Sidecar Container:"
echo "  • Runs alongside main container"
echo "  • Waits 5-15 minutes (random)"
echo "  • Fetches random Wikipedia pages"
echo "  • Saves to shared /www volume"
echo "  • Runs indefinitely, fetching new pages"
echo ""

# Verification
print_header "Verification"

print_success "Deployment complete!"
print_info ""
print_info "What to verify:"
print_info "  1. Init container fetched Kubernetes.html on startup"
print_info "  2. Sidecar is continuously fetching random pages"
print_info "  3. All pages appear in /usr/share/nginx/html"
print_info "  4. Access via port-forward and refresh to see new pages"
print_info "  5. Check logs to see container activity"

echo ""
print_success "Setup complete! Wikipedia pod is running with init and sidecar containers."
