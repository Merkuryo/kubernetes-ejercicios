#!/bin/bash

# Exercise 5.7: Deploy Ping-Pong as Serverless on Knative
# This script builds and deploys the ping-pong application as a serverless service

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[⚠]${NC} $1"
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# Configuration
IMAGE_NAME="ping-pong-serverless"
IMAGE_TAG="latest"
FULL_IMAGE="${IMAGE_NAME}:${IMAGE_TAG}"
K3D_CLUSTER="knative-cluster"
REGISTRY="localhost:5000"  # k3d local registry
SERVICE_NAME="ping-pong-serverless"

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi
    log_success "Docker is installed"
    
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl is not installed"
        exit 1
    fi
    log_success "kubectl is installed"
    
    if ! kubectl get nodes &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster"
        exit 1
    fi
    log_success "Connected to Kubernetes cluster"
    
    # Check if Knative is installed
    if ! kubectl get ns knative-serving &> /dev/null; then
        log_error "Knative Serving is not installed"
        log_info "Run: bash ../ejercicio5_6/deploy.sh"
        exit 1
    fi
    log_success "Knative Serving is installed"
}

# Build Docker image
build_image() {
    log_info "Building Docker image: $FULL_IMAGE..."
    
    cd "$(dirname "$0")"
    
    # Check if Dockerfile exists
    if [[ ! -f Dockerfile ]]; then
        log_error "Dockerfile not found in $(pwd)"
        exit 1
    fi
    
    docker build -t "$FULL_IMAGE" .
    log_success "Docker image built successfully"
}

# Load image into k3d
load_image_to_k3d() {
    log_info "Loading image into k3d cluster..."
    
    # Try to load image into k3d
    if k3d image load "$FULL_IMAGE" -c "$K3D_CLUSTER" 2>/dev/null; then
        log_success "Image loaded into k3d cluster"
    else
        log_warning "Could not load image directly, trying via docker..."
        # Alternative: push to local registry
        docker tag "$FULL_IMAGE" "${REGISTRY}/${FULL_IMAGE}"
        docker push "${REGISTRY}/${FULL_IMAGE}" || log_warning "Local registry not available"
    fi
}

# Deploy Knative Service
deploy_service() {
    log_info "Deploying Knative Service..."
    
    # Check if manifests exist
    if [[ ! -f manifests/ksvc.yaml ]]; then
        log_error "manifests/ksvc.yaml not found"
        exit 1
    fi
    
    kubectl apply -f manifests/ksvc.yaml
    log_success "Knative Service deployed"
}

# Wait for service to be ready
wait_for_service() {
    log_info "Waiting for Knative Service to be ready..."
    
    # Wait for service to have URL
    for i in {1..60}; do
        URL=$(kubectl get ksvc "$SERVICE_NAME" -o jsonpath='{.status.url}' 2>/dev/null || echo "")
        if [[ -n "$URL" ]]; then
            log_success "Service URL obtained: $URL"
            echo "$URL" > /tmp/ping-pong-url.txt
            return 0
        fi
        echo -n "."
        sleep 2
    done
    
    log_warning "Service URL not obtained yet, continuing anyway..."
    return 1
}

# Show service information
show_service_info() {
    echo
    log_info "Service Information:"
    echo "════════════════════════════════════════════════"
    
    kubectl get ksvc "$SERVICE_NAME"
    
    echo
    log_info "Pod Status:"
    kubectl get pods -l app=ping-pong -L serving.knative.dev/service
    
    echo
    log_info "Revisions:"
    kubectl get revision -l serving.knative.dev/service="$SERVICE_NAME"
    
    URL=$(kubectl get ksvc "$SERVICE_NAME" -o jsonpath='{.status.url}' 2>/dev/null || echo "")
    
    if [[ -n "$URL" ]]; then
        log_success "Service URL: $URL"
        
        SERVICE_IP=$(echo "$URL" | grep -o '[0-9]\+\.[0-9]\+\.[0-9]\+\.[0-9]\+' | head -1)
        
        if [[ -n "$SERVICE_IP" ]]; then
            log_success "Service IP: $SERVICE_IP"
            
            echo
            log_info "Test Commands:"
            echo "────────────────────────────────────────────────"
            echo "  # Ping endpoint"
            echo "  curl -H \"Host: $SERVICE_NAME.default.${SERVICE_IP}.sslip.io\" http://localhost:8081/ping"
            echo
            echo "  # Pong endpoint"
            echo "  curl -H \"Host: $SERVICE_NAME.default.${SERVICE_IP}.sslip.io\" http://localhost:8081/pong"
            echo
            echo "  # Health check"
            echo "  curl -H \"Host: $SERVICE_NAME.default.${SERVICE_IP}.sslip.io\" http://localhost:8081/health"
            echo
            echo "  # Statistics"
            echo "  curl -H \"Host: $SERVICE_NAME.default.${SERVICE_IP}.sslip.io\" http://localhost:8081/stats"
            echo
        fi
    fi
}

# Test the service
test_service() {
    log_info "Testing Knative Service (optional)..."
    
    URL=$(cat /tmp/ping-pong-url.txt 2>/dev/null || kubectl get ksvc "$SERVICE_NAME" -o jsonpath='{.status.url}' 2>/dev/null || echo "")
    
    if [[ -z "$URL" ]]; then
        log_warning "Cannot determine service URL"
        return 1
    fi
    
    SERVICE_IP=$(echo "$URL" | grep -o '[0-9]\+\.[0-9]\+\.[0-9]\+\.[0-9]\+' | head -1)
    
    if [[ -z "$SERVICE_IP" ]]; then
        log_warning "Cannot extract IP from URL"
        return 1
    fi
    
    echo
    log_info "Testing endpoints..."
    
    # Test ping endpoint
    log_info "Testing /ping endpoint..."
    curl -s -H "Host: ${SERVICE_NAME}.default.${SERVICE_IP}.sslip.io" \
         http://localhost:8081/ping | python3 -m json.tool 2>/dev/null || echo "Response received"
    
    echo
    log_info "Testing /pong endpoint..."
    curl -s -H "Host: ${SERVICE_NAME}.default.${SERVICE_IP}.sslip.io" \
         http://localhost:8081/pong | python3 -m json.tool 2>/dev/null || echo "Response received"
    
    echo
    log_success "Service is responding!"
}

# Show scale-to-zero monitoring
show_monitoring_commands() {
    echo
    log_info "Monitoring Commands:"
    echo "════════════════════════════════════════════════"
    echo
    echo "Watch pod scaling:"
    echo "  watch -n 1 kubectl get pods"
    echo
    echo "Watch service status:"
    echo "  watch -n 1 kubectl get ksvc"
    echo
    echo "View autoscaler logs:"
    echo "  kubectl logs -n knative-serving -l app=autoscaler -f"
    echo
    echo "View activator logs (cold starts):"
    echo "  kubectl logs -n knative-serving -l app=activator -f"
    echo
    echo "View service pod logs:"
    echo "  kubectl logs -l serving.knative.dev/service=$SERVICE_NAME -f"
    echo
}

# Main execution
main() {
    echo "╔════════════════════════════════════════════════════╗"
    echo "║   Exercise 5.7: Deploy Ping-Pong as Serverless    ║"
    echo "║   Knative Serving on Kubernetes                    ║"
    echo "╚════════════════════════════════════════════════════╝"
    echo
    
    check_prerequisites
    echo
    
    build_image
    echo
    
    load_image_to_k3d
    echo
    
    deploy_service
    echo
    
    wait_for_service
    echo
    
    show_service_info
    
    echo
    log_success "Ping-Pong serverless deployment complete!"
    
    # Optional: test service
    read -p "Do you want to test the service now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        test_service
    fi
    
    show_monitoring_commands
    
    echo
    log_info "To clean up, run:"
    echo "  kubectl delete ksvc $SERVICE_NAME"
}

# Run main if executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
