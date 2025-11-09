# Ejercicio 4.4 — Canary Release con AnalysisTemplate

## Objetivo

Implementar un canary release para la aplicación Ping-pong que:
- Despliega nuevas versiones de forma gradual (25% → 50% → 75% → 100%)
- Monitorea CPU usage en el namespace
- Revierte automáticamente si el CPU excede un threshold

## Instalación de Argo Rollouts

```bash
kubectl create namespace argo-rollouts
kubectl apply -n argo-rollouts -f https://github.com/argoproj/argo-rollouts/releases/latest/download/install.yaml
```

**CRDs instalados:**
- `Rollout`: Define estrategias de despliegue
- `AnalysisTemplate`: Define métricas y criterios de análisis
- `AnalysisRun`: Instancia de análisis en ejecución
- `Experiment`: Pruebas A/B o canary

## AnalysisTemplate para CPU Monitoring

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: cpu-usage-analysis
spec:
  metrics:
  - name: cpu-usage
    initialDelay: 5m      # Esperar 5 minutos antes de medir
    interval: 1m          # Medir cada 1 minuto
    count: 5              # Ejecutar análisis 5 veces
    successCondition: result < 500m   # Éxito si CPU < 500 milicores
    failureCondition: result > 500m   # Fallo si CPU > 500 milicores
    provider:
      prometheus:
        address: http://prometheus.default.svc.cluster.local:9090
        query: |
          scalar(
            sum(rate(container_cpu_usage_seconds_total{namespace="default"}[5m])) * 1000
          )
```

## Rollout Canary Strategy

```yaml
strategy:
  canary:
    steps:
    - setWeight: 25      # 25% de tráfico a nueva versión
    - pause:
        duration: 1m
    - setWeight: 50      # 50% de tráfico
    - pause:
        duration: 1m
    - setWeight: 75      # 75% de tráfico
    - pause:
        duration: 1m
    - analysis:           # Ejecutar análisis final
        templates:
        - templateName: cpu-usage-analysis
```

## Monitoreo del Canary Release

### Con kubectl plugin de Argo Rollouts:

```bash
# Instalar plugin (opcional)
curl -LO https://github.com/argoproj/argo-rollouts/releases/latest/download/kubectl-argo-rollouts-linux-amd64
chmod +x kubectl-argo-rollouts-linux-amd64
sudo mv kubectl-argo-rollouts-linux-amd64 /usr/local/bin/kubectl-argo-rollouts

# Ver estado del Rollout
kubectl argo rollouts get rollout pingpong-rollout --watch
```

### Con kubectl estándar:

```bash
kubectl get rollout pingpong-rollout
kubectl describe rollout pingpong-rollout
kubectl get analysisruns
kubectl describe analysisrun <name>
```

## Métrica de CPU en Prometheus

La query mide CPU en milicores:

```promql
sum(rate(container_cpu_usage_seconds_total{namespace="default"}[5m])) * 1000
```

**Desglose:**
- `container_cpu_usage_seconds_total`: Métrica de tiempo de CPU acumulado
- `rate(...[5m])`: Cambio por segundo en los últimos 5 minutos
- `* 1000`: Convertir a milicores (m)
- `sum(...)`: Sumar todos los contenedores del namespace

## Escenarios de Prueba

### Prueba 1: CPU normal (debe completar canary)
- Crear versión con CPU normal
- El canary debe pasar todas las etapas sin revertir

### Prueba 2: CPU alta (debe revertir)
- Crear versión que consume CPU > 500m
- El análisis detectará el exceso y revertirá automáticamente

## Configuración Recomendada

**CPU Thresholds según caso de uso:**
- Desarrollo: 1000m (1 core)
- Staging: 2000m (2 cores)
- Producción: variable según SLA

**Tiempos:**
- initialDelay: 5-10 minutos (permitir que se estabilice)
- interval: 1-5 minutos (frecuencia de medición)
- count: 3-5 (número de mediciones)

## Ventajas del Canary Release

✅ **Riesgo bajo**: Solo 25% de usuarios afectados inicialmente
✅ **Detección automática**: Revierte si métricas empeoran
✅ **Validación multi-métrica**: Puede usar múltiples AnalysisTemplates
✅ **Rollback automático**: Sin intervención manual necesaria

## Limitaciones y Consideraciones

⚠️ **Prometheus requerido**: Necesita métricas disponibles
⚠️ **Métrica lag**: Puede haber retraso en recolección de métricas
⚠️ **Network policies**: Argo Rollouts debe acceder a Prometheus
⚠️ **Almacenamiento**: Prometheus necesita persistencia en producción

## Referencias

- [Argo Rollouts Canary Strategy](https://argoproj.github.io/argo-rollouts/features/canary/)
- [AnalysisTemplate Documentation](https://argoproj.github.io/argo-rollouts/analysis/)
- [Prometheus Query Language](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [Container CPU Metrics](https://kubernetes.io/docs/tasks/debug-application-cluster/resource-metrics-pipeline/)

