#!/bin/bash

# Script para visualizar logs de TODO creation en Cloud Logging
# Este script muestra cómo acceder a los logs desde CLI y Console

PROJECT_ID="dwk-gke-477617"
CLUSTER_NAME="dwk-cluster"
NAMESPACE="default"

echo "=== GKE Cloud Logging - TODO Creation Logs ==="
echo ""
echo "1. Accede a Cloud Logging Console:"
echo "   URL: https://console.cloud.google.com/logs/query?project=${PROJECT_ID}"
echo ""
echo "2. Query para ver logs de TODO creation:"
echo "   resource.type = \"k8s_container\""
echo "   AND resource.labels.cluster_name = \"${CLUSTER_NAME}\""
echo "   AND jsonPayload.action = \"TODO_CREATED\""
echo ""
echo "3. O usa este comando CLI:"
echo "   gcloud logging read 'resource.type=k8s_container AND jsonPayload.action=TODO_CREATED' \\"
echo "     --project=${PROJECT_ID} \\"
echo "     --limit=50"
echo ""
echo "4. Ver logs en tiempo real de un pod específico:"
echo "   kubectl logs -f <pod-name> -n ${NAMESPACE}"
echo ""
echo "=== Logs disponibles actualmente ==="
gcloud logging read "resource.type=k8s_container AND resource.labels.cluster_name=${CLUSTER_NAME}" \
  --project=${PROJECT_ID} \
  --limit=20
