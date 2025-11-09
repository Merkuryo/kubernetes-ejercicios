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

if ! command -v k3d &> /dev/null; then
  print_error "k3d not found. Please install k3d first."
  exit 1
fi
print_success "k3d is installed"

# Check if Istio Ambient Mode is enabled on default namespace
print_header "Checking Istio Setup"

if ! kubectl get namespace istio-system &> /dev/null; then
  print_error "Istio is not installed. Please install Istio Ambient Mode first."
  print_info "Run: ../ejercicio5_2/scripts/install-istio.sh"
  exit 1
fi
print_success "Istio system namespace exists"

# Check if default namespace has ambient mode enabled
if kubectl get ns default -o jsonpath='{.metadata.labels.istio\.io/dataplane-mode}' | grep -q "ambient"; then
  print_success "Default namespace has Ambient Mode enabled"
else
  print_warning "Default namespace doesn't have Ambient Mode enabled. Enabling it now..."
  kubectl label namespace default istio.io/dataplane-mode=ambient --overwrite
  print_success "Ambient Mode enabled on default namespace"
fi

# Deploy the exercise
print_header "Deploying Log App with Service Mesh"

print_info "Deploying greeter service..."
kubectl apply -f manifests/greeter.yaml
print_success "Greeter service deployed"

print_info "Deploying greeter HTTPRoute (canary deployment: 75% v1, 25% v2)..."
kubectl apply -f manifests/greeter-httproute.yaml
print_success "Greeter HTTPRoute deployed"

print_info "Deploying log app..."
kubectl apply -f manifests/log-app.yaml
print_success "Log app deployed"

print_info "Deploying log gateway..."
kubectl apply -f manifests/gateway.yaml
print_success "Log gateway deployed"

# Wait for deployments
print_header "Waiting for Deployments to be Ready"

print_info "Waiting for greeter-dep-v1..."
kubectl rollout status deployment/greeter-dep-v1 --timeout=2m
print_success "greeter-dep-v1 is ready"

print_info "Waiting for greeter-dep-v2..."
kubectl rollout status deployment/greeter-dep-v2 --timeout=2m
print_success "greeter-dep-v2 is ready"

print_info "Waiting for log-app-dep..."
kubectl rollout status deployment/log-app-dep --timeout=2m
print_success "log-app-dep is ready"

# Check pods
print_header "Checking Pod Status"

kubectl get pods -n default \
  -l "app in (greeter,log)" \
  -o wide

# Check services
print_header "Checking Services"

kubectl get svc -n default \
  -l "app in (greeter,log)" \
  -o wide

# Wait a bit for network policies to settle
sleep 5

# Generate some traffic
print_header "Generating Traffic to Populate Logs"

print_info "Getting log app pod..."
LOG_POD=$(kubectl get pod -l app=log -o jsonpath='{.items[0].metadata.name}')
print_info "Log app pod: $LOG_POD"

print_info "Generating traffic (10 requests)..."
for i in {1..10}; do
  kubectl exec $LOG_POD -- curl -s http://greeter-svc/greeting > /dev/null 2>&1
  echo -n "."
  sleep 1
done
echo ""
print_success "Traffic generated"

# Get access instructions
print_header "Access Instructions"

print_info "To access the log app UI via port-forward:"
print_info "  kubectl port-forward svc/log-svc 8080:80"
print_info ""
print_info "Then open in browser: http://localhost:8080"
print_info ""

print_info "To monitor traffic in Kiali:"
print_info "  kubectl port-forward -n istio-system svc/kiali 20000:20000"
print_info ""
print_info "Then open in browser: http://localhost:20000"
print_info "  • Username: admin"
print_info "  • Password: admin"
print_info ""

# Verify canary setup
print_header "Verifying Canary Deployment Setup"

print_info "Greeter services:"
kubectl get svc -l app=greeter -n default

print_info ""
print_info "Greeter deployments:"
kubectl get deployments -l app=greeter -n default

print_info ""
print_info "Log gateway and HTTPRoute:"
kubectl get gateway,httproute -n default

# Check traffic distribution
print_header "Testing Traffic Distribution"

print_info "Testing greeter-svc-v1..."
GREETER_V1_POD=$(kubectl get pod -l app=greeter,version=v1 -o jsonpath='{.items[0].metadata.name}')
echo "  Pod: $GREETER_V1_POD"

print_info "Testing greeter-svc-v2..."
GREETER_V2_POD=$(kubectl get pod -l app=greeter,version=v2 -o jsonpath='{.items[0].metadata.name}')
echo "  Pod: $GREETER_V2_POD"

print_info ""
print_info "Version endpoints:"
print_info "  V1: $(kubectl exec $GREETER_V1_POD -- curl -s http://localhost:8080/version)"
print_info "  V2: $(kubectl exec $GREETER_V2_POD -- curl -s http://localhost:8080/version)"

print_header "Deployment Complete!"

print_info "Next steps:"
print_info "  1. Use port-forward to access the log app UI"
print_info "  2. Open Kiali to visualize traffic splitting between greeter v1 and v2"
print_info "  3. Monitor the greetings being displayed (mix of Spanish and English)"
print_info "  4. Observe 75% v1 and 25% v2 traffic distribution"
print_info ""
print_success "Setup complete! Service mesh canary deployment is running."
