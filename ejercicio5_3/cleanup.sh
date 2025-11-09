#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
  echo -e "\n${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║ $1${NC}"
  echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}\n"
}

print_info() {
  echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
  echo -e "${GREEN}✅ $1${NC}"
}

print_header "Cleaning up Exercise 5.3 Resources"

print_info "Deleting log gateway and HTTPRoutes..."
kubectl delete httproute log -n default --ignore-not-found
kubectl delete gateway log-gateway -n default --ignore-not-found
print_success "Gateway and HTTPRoutes deleted"

print_info "Deleting log app deployment and service..."
kubectl delete deployment log-app-dep -n default --ignore-not-found
kubectl delete service log-svc -n default --ignore-not-found
kubectl delete configmap log-app-code -n default --ignore-not-found
print_success "Log app resources deleted"

print_info "Deleting greeter HTTPRoute..."
kubectl delete httproute greeter -n default --ignore-not-found
print_success "Greeter HTTPRoute deleted"

print_info "Deleting greeter deployments and services..."
kubectl delete deployment greeter-dep-v1 -n default --ignore-not-found
kubectl delete deployment greeter-dep-v2 -n default --ignore-not-found
kubectl delete service greeter-svc-v1 -n default --ignore-not-found
kubectl delete service greeter-svc-v2 -n default --ignore-not-found
kubectl delete service greeter-svc -n default --ignore-not-found
kubectl delete configmap greeter-code -n default --ignore-not-found
print_success "Greeter resources deleted"

print_header "Cleanup Complete"
print_info "All resources from Exercise 5.3 have been deleted"
