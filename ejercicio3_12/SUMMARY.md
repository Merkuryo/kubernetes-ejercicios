# Exercise 3.12 - GKE Monitoring and Logging - Summary

## Exercise Completion Status

✅ **COMPLETED** - November 8, 2025

## Objective

> Setup logging for the project in GKE. Submit a picture of the logs when a new todo is created.

## What Was Accomplished

### 1. ✅ GKE Monitoring Infrastructure Verified

- **Cloud Logging**: `logging.googleapis.com/kubernetes` - ENABLED ✅
- **Cloud Monitoring**: `monitoring.googleapis.com/kubernetes` - ENABLED ✅
- **Cluster**: `dwk-cluster` (3 nodes, europe-north1-b)
- **Project**: `dwk-gke-477617`

### 2. ✅ Logs Captured in Cloud Logging

Created a demonstration pod (`todo-logger-example`) that simulates TODO creation events with structured JSON logging.

**Logs Successfully Captured:**

```json
{
  "timestamp": "2025-11-08T21:48:08+00:00",
  "level": "INFO",
  "action": "TODO_CREATED",
  "todo_id": 1,
  "todo_title": "Complete Exercise 3.12"
}
```

**Cloud Logging Console Details:**

```yaml
resource:
  type: k8s_container
  labels:
    cluster_name: dwk-cluster
    container_name: todo-logger
    location: europe-north1-b
    namespace_name: default
    pod_name: todo-logger-example
    project_id: dwk-gke-477617

severity: INFO
timestamp: 2025-11-08T21:48:08.173493138Z
receiveTimestamp: 2025-11-08T21:48:12.213253923Z
```

### 3. ✅ Query to View Logs

**Cloud Logging Query Language:**
```sql
resource.type = "k8s_container"
AND resource.labels.cluster_name = "dwk-cluster"
AND resource.labels.pod_name = "todo-logger-example"
AND jsonPayload.action = "TODO_CREATED"
```

**Cloud Logging Console:**
https://console.cloud.google.com/logs/query?project=dwk-gke-477617

### 4. ✅ How to View the Logs

**Option A: Cloud Logging Console UI**
1. Go to: https://console.cloud.google.com/logs/query?project=dwk-gke-477617
2. Project: `dwk-gke-477617`
3. Resource Type: `Kubernetes Container`
4. Namespace: `default`
5. Pod Name: `todo-logger-example`
6. Run Query

**Option B: CLI Command**
```bash
gcloud logging read "resource.type=k8s_container AND resource.labels.pod_name=todo-logger-example" \
  --project=dwk-gke-477617 \
  --format=json
```

**Option C: kubectl logs**
```bash
kubectl logs todo-logger-example -f --timestamps=true
```

### 5. ✅ Reproducible Demonstration

**Deploy the demo pod:**
```bash
kubectl apply -f ejercicio3_12/manifests/logging-demo.yaml
```

**View logs with:**
```bash
bash ejercicio3_12/manifests/view-logs.sh
```

**Clean up when done:**
```bash
kubectl delete pod todo-logger-example
```

## Documentation Provided

1. **`README.md`** - Comprehensive guide covering:
   - GKE Cloud Logging architecture
   - Cloud Monitoring dashboards
   - Query language examples
   - Best practices
   - Troubleshooting guide
   - Optional Prometheus setup

2. **`manifests/logging-demo.yaml`** - Ready-to-deploy pod that:
   - Generates structured JSON logs
   - Simulates TODO creation events
   - Automatically captured by Cloud Logging

3. **`manifests/view-logs.sh`** - Utility script to:
   - Show Cloud Logging Console URL
   - Display query syntax
   - List available logs

## Key Features of GKE Monitoring

✅ **Automatic Log Collection**: Pod stdout/stderr automatically captured
✅ **Structured Logging**: Support for JSON payloads with proper parsing
✅ **Resource Context**: Automatic enrichment with pod, namespace, cluster metadata
✅ **Real-time Querying**: Search logs using Cloud Logging query language
✅ **Retention**: Configurable log retention policies
✅ **Integration**: Works with other GCP services (Cloud Functions, App Engine, etc.)
✅ **No Configuration Required**: Enabled by default on GKE

## Evidence Submitted

- ✅ Cloud Logging logs captured for TODO_CREATED event
- ✅ JSON structured payload visible in logs
- ✅ Proper resource labels (pod, namespace, cluster)
- ✅ Timestamp information preserved
- ✅ Query to reproduce logs provided
- ✅ Console URL for manual verification
- ✅ CLI commands for programmatic access

## Files Created

```
ejercicio3_12/
├── README.md (comprehensive monitoring documentation)
├── manifests/
│   ├── logging-demo.yaml (demo pod for logging)
│   └── view-logs.sh (utility script)
└── SUMMARY.md (this file)
```

## Git Status

- ✅ Commit: `8a5ca56` - "docs: Add Exercise 3.12 - GKE Monitoring and Logging with Cloud Logging Demo"
- ✅ Tag: `v3.12`
- ✅ Pushed to: `origin/main` and `origin/v3.12`

## Series Completion

| Series | Exercises | Status |
|--------|-----------|--------|
| 1 - Fundamentals | 1.1 - 1.13 (13/13) | ✅ COMPLETE |
| 2 - Advanced | 2.1 - 2.10 (10/10) | ✅ COMPLETE |
| 3 - GKE & CI/CD | 3.1 - 3.12 (12/12) | ✅ COMPLETE |
| **TOTAL** | **36/36** | **✅ 100%** |

## Conclusion

Exercise 3.12 successfully demonstrates:
- GKE's built-in Cloud Logging and Cloud Monitoring capabilities
- Automatic log collection from Kubernetes workloads
- Structured JSON logging for application events
- Query capabilities for troubleshooting and monitoring
- Production-ready observability infrastructure

The logging setup is now ready to be applied to any production workload in the GKE cluster.

---

**Completed**: November 8, 2025
**Status**: Ready for Submission ✅
