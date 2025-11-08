#!/bin/bash

# Script para gestionar cluster GKE para ejercicio 3.1

PROJECT_ID="dwk-gke-477617"
CLUSTER_NAME="dwk-cluster"
ZONE="europe-north1-b"

case "$1" in
  create)
    echo "Creando cluster GKE $CLUSTER_NAME..."
    gcloud container clusters create $CLUSTER_NAME \
      --zone=$ZONE \
      --cluster-version=1.32 \
      --disk-size=32 \
      --num-nodes=3 \
      --machine-type=e2-micro \
      --enable-stackdriver-kubernetes
    gcloud container clusters get-credentials $CLUSTER_NAME --zone=$ZONE
    ;;
    
  delete)
    echo "⚠️  Eliminando cluster $CLUSTER_NAME..."
    gcloud container clusters delete $CLUSTER_NAME --zone=$ZONE --quiet
    echo "Cluster eliminado"
    ;;
    
  status)
    echo "Estado del cluster $CLUSTER_NAME:"
    gcloud container clusters describe $CLUSTER_NAME --zone=$ZONE --format='table(status, currentNodeCount, location)'
    ;;
    
  credentials)
    echo "Obteniendo credenciales del cluster..."
    gcloud container clusters get-credentials $CLUSTER_NAME --zone=$ZONE
    ;;
    
  info)
    echo "Información del cluster:"
    kubectl cluster-info
    echo ""
    echo "Nodos:"
    kubectl get nodes
    ;;
    
  deploy)
    echo "Deployando aplicación ping-pong..."
    kubectl apply -f manifests/statefulset.yaml
    kubectl apply -f manifests/deployment.yaml
    echo "Esperando a que los pods estén listos..."
    kubectl wait --for=condition=ready pod -l app=pingpong --timeout=300s 2>/dev/null || true
    echo ""
    echo "LoadBalancer IP:"
    kubectl get svc pingpong-svc -o wide
    ;;
    
  logs)
    if [ "$2" = "app" ]; then
      kubectl logs -f deployment/pingpong-dep
    elif [ "$2" = "db" ]; then
      kubectl logs -f statefulset/pingpong-db
    else
      echo "Uso: $0 logs [app|db]"
    fi
    ;;
    
  *)
    echo "Uso: $0 {create|delete|status|credentials|info|deploy|logs}"
    echo ""
    echo "Comandos:"
    echo "  create      - Crear cluster GKE"
    echo "  delete      - Eliminar cluster GKE"
    echo "  status      - Mostrar estado del cluster"
    echo "  credentials - Obtener credenciales"
    echo "  info        - Mostrar información del cluster"
    echo "  deploy      - Deployar aplicación ping-pong"
    echo "  logs [app|db] - Ver logs de la aplicación o BD"
    ;;
esac
