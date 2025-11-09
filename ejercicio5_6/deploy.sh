#!/bin/bash

# Exercise 5.6: Knative Serving Setup Script
# This script automates the installation and configuration of Knative Serving on k3d

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
KNATIVE_VERSION="knative-v1.13.0"
K3D_CLUSTER_NAME="knative-cluster"
PORT_KNATIVE_API="8082"
PORT_INGRESS="8081"
NODE_PORT="30080"

# Functions
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

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check k3d
    if ! command -v k3d &> /dev/null; then
        log_error "k3d is not installed"
        exit 1
    fi
    log_success "k3d is installed"
    
    # Check kubectl
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl is not installed"
        exit 1
    fi
    log_success "kubectl is installed"
    
    # Check docker
    if ! docker ps &> /dev/null; then
        log_error "Docker is not running"
        exit 1
    fi
    log_success "Docker is running"
    
    # Check curl
    if ! command -v curl &> /dev/null; then
        log_warning "curl is not installed (needed for testing)"
    else
        log_success "curl is installed"
    fi
}

create_k3d_cluster() {
    log_info "Creating k3d cluster without Traefik..."
    
    # Check if cluster already exists
    if k3d cluster list | grep -q "$K3D_CLUSTER_NAME"; then
        log_warning "Cluster $K3D_CLUSTER_NAME already exists"
        read -p "Do you want to delete and recreate it? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            k3d cluster delete "$K3D_CLUSTER_NAME"
            log_info "Deleted cluster $K3D_CLUSTER_NAME"
        else
            log_info "Using existing cluster"
            return
        fi
    fi
    
    # Create cluster
    k3d cluster create "$K3D_CLUSTER_NAME" \
        --port ${PORT_KNATIVE_API}:${NODE_PORT}@agent:0 \
        -p ${PORT_INGRESS}:80@loadbalancer \
        --agents 2 \
        --k3s-arg "--disable=traefik@server:0"
    
    log_success "k3d cluster created: $K3D_CLUSTER_NAME"
    
    # Wait for cluster to be ready
    log_info "Waiting for cluster nodes to be ready..."
    kubectl wait --for=condition=Ready nodes --all --timeout=300s
    log_success "All nodes are ready"
}

install_knative_serving() {
    log_info "Installing Knative Serving CRDs..."
    
    kubectl apply -f "https://github.com/knative/serving/releases/download/${KNATIVE_VERSION}/serving-crds.yaml"
    log_success "Knative CRDs installed"
    
    log_info "Installing Knative Serving core components..."
    
    kubectl apply -f "https://github.com/knative/serving/releases/download/${KNATIVE_VERSION}/serving-core.yaml"
    log_success "Knative Serving core installed"
    
    # Wait for webhook to be ready
    log_info "Waiting for webhook to be ready..."
    kubectl wait --for=condition=ready pod \
        -l app=webhook \
        -n knative-serving \
        --timeout=300s || log_warning "Webhook not ready, continuing..."
}

install_kourier() {
    log_info "Installing Kourier networking layer..."
    
    kubectl apply -f "https://github.com/knative/net-kourier/releases/download/${KNATIVE_VERSION}/kourier.yaml"
    log_success "Kourier installed"
    
    # Wait for Kourier controller to be ready
    log_info "Waiting for Kourier controller to be ready..."
    kubectl wait --for=condition=ready pod \
        -l app=net-kourier-controller \
        -n kourier-system \
        --timeout=300s || log_warning "Kourier controller not ready, continuing..."
}

configure_ingress() {
    log_info "Configuring Kourier as default ingress class..."
    
    kubectl patch configmap/config-network \
        --namespace knative-serving \
        --type merge \
        --patch '{"data":{"ingress.class":"kourier.ingress.networking.knative.dev"}}'
    
    log_success "Ingress class configured"
}

configure_dns() {
    log_info "Configuring Magic DNS (sslip.io)..."
    
    kubectl apply -f "https://github.com/knative/serving/releases/download/${KNATIVE_VERSION}/serving-default-domain.yaml"
    log_success "Magic DNS configured"
    
    # Wait a bit for DNS configuration to settle
    sleep 5
}

verify_installation() {
    log_info "Verifying Knative Serving installation..."
    
    echo
    log_info "Knative Serving components:"
    kubectl get pods -n knative-serving
    
    echo
    log_info "Kourier components:"
    kubectl get pods -n kourier-system
    
    echo
    log_info "Checking component status..."
    
    WEBHOOK_READY=$(kubectl get pod -n knative-serving -l app=webhook -o jsonpath='{.items[0].status.conditions[?(@.type=="Ready")].status}')
    CONTROLLER_READY=$(kubectl get pod -n knative-serving -l app=controller -o jsonpath='{.items[0].status.conditions[?(@.type=="Ready")].status}')
    ACTIVATOR_READY=$(kubectl get pod -n knative-serving -l app=activator -o jsonpath='{.items[0].status.conditions[?(@.type=="Ready")].status}')
    
    if [[ "$WEBHOOK_READY" == "True" && "$CONTROLLER_READY" == "True" && "$ACTIVATOR_READY" == "True" ]]; then
        log_success "All Knative Serving components are ready!"
        return 0
    else
        log_warning "Some components are still initializing"
        log_info "Webhook: $WEBHOOK_READY"
        log_info "Controller: $CONTROLLER_READY"
        log_info "Activator: $ACTIVATOR_READY"
        return 1
    fi
}

deploy_hello_service() {
    log_info "Deploying hello-world Knative service..."
    
    cat > /tmp/hello-knative.yaml <<EOF
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: hello
  namespace: default
spec:
  template:
    metadata:
      name: hello-v1
    spec:
      containers:
      - image: gcr.io/knative-samples/helloworld-go
        ports:
        - containerPort: 8080
        env:
        - name: TARGET
          value: "Knative"
EOF

    kubectl apply -f /tmp/hello-knative.yaml
    log_success "Hello service deployed"
    
    # Wait for service to be ready
    log_info "Waiting for hello service to be ready..."
    kubectl wait --for=condition=ready ksvc hello --timeout=300s || log_warning "Service not ready yet"
}

show_service_info() {
    echo
    log_info "Knative Service information:"
    
    kubectl get ksvc
    
    echo
    log_info "Getting service URL..."
    SERVICE_URL=$(kubectl get ksvc hello -o jsonpath='{.status.url}' 2>/dev/null || echo "")
    
    if [[ -n "$SERVICE_URL" ]]; then
        log_success "Service URL: $SERVICE_URL"
        
        # Extract IP from sslip.io URL
        SERVICE_IP=$(echo "$SERVICE_URL" | grep -o '[0-9]\+\.[0-9]\+\.[0-9]\+\.[0-9]\+' | head -1)
        
        if [[ -n "$SERVICE_IP" ]]; then
            log_success "Service IP: $SERVICE_IP"
            echo
            log_info "To test the service from host machine, run:"
            echo "  curl -H \"Host: hello.default.${SERVICE_IP}.sslip.io\" http://localhost:${PORT_INGRESS}"
        fi
    else
        log_warning "Service URL not yet available, checking status..."
        kubectl describe ksvc hello
    fi
}

show_next_steps() {
    echo
    log_info "Installation complete! Next steps:"
    echo
    echo "1. Monitor pod scaling:"
    echo "   kubectl get pods -w"
    echo
    echo "2. Watch autoscaling:"
    echo "   watch -n 1 kubectl get ksvc"
    echo
    echo "3. View service logs:"
    echo "   kubectl logs -n knative-serving -l app=controller -f"
    echo
    echo "4. Deploy more services:"
    echo "   kubectl apply -f <service-yaml>"
    echo
    echo "5. View all Knative resources:"
    echo "   kubectl get ksvc,revision,route,configuration"
    echo
    echo "6. Test scale-to-zero:"
    echo "   - Make a request: curl -H \"Host: ...\" http://localhost:${PORT_INGRESS}"
    echo "   - Watch pods disappear after 60 seconds of inactivity"
    echo "   - Make another request to trigger cold start"
    echo
    echo "7. Cleanup cluster when done:"
    echo "   k3d cluster delete $K3D_CLUSTER_NAME"
}

main() {
    echo "╔═════════════════════════════════════════════════════╗"
    echo "║   Exercise 5.6: Knative Serving Setup Script         ║"
    echo "║   Kubernetes Serverless Platform                     ║"
    echo "╚═════════════════════════════════════════════════════╝"
    echo
    
    check_prerequisites
    echo
    
    create_k3d_cluster
    echo
    
    install_knative_serving
    echo
    
    install_kourier
    echo
    
    configure_ingress
    echo
    
    configure_dns
    echo
    
    # Wait a bit for everything to stabilize
    log_info "Waiting for components to stabilize..."
    sleep 10
    
    verify_installation
    INSTALL_STATUS=$?
    echo
    
    if [[ $INSTALL_STATUS -eq 0 ]]; then
        log_success "Knative installation verified successfully!"
        
        # Try to deploy hello service
        deploy_hello_service
        echo
        
        show_service_info
    else
        log_warning "Installation completed but some components are still initializing"
        log_info "Please wait a moment and check component status with:"
        echo "   kubectl get pods -n knative-serving"
        echo "   kubectl get pods -n kourier-system"
    fi
    
    echo
    show_next_steps
}

# Run main function
main
