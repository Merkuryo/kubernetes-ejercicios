#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

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

print_header "Cleaning up Exercise 5.4 Resources"

print_info "Deleting Wikipedia Pod..."
kubectl delete pod wikipedia-pod -n default --ignore-not-found
print_success "Pod deleted"

print_info "Deleting Wikipedia Service..."
kubectl delete svc wikipedia-svc -n default --ignore-not-found
print_success "Service deleted"

print_header "Cleanup Complete"
print_info "All resources from Exercise 5.4 have been deleted"
