# Exercise 5.4: Wikipedia with Init and Sidecar

## Overview

This exercise explores two powerful Kubernetes container patterns: **Init Containers** and **Sidecar Containers**. By building a Wikipedia page archiver, you'll learn how to use these patterns to enhance pod functionality while keeping the main application container simple and focused.

**Learning Goals:**
- Understand init containers and their purpose
- Understand sidecar containers and their use cases
- Learn how containers share volumes within a pod
- Implement a multi-container pod with specialized roles
- Apply real-world patterns used in service meshes and monitoring

## Background Concepts

### Init Containers

Init containers are specialized containers that:
- Run **before** the main application containers start
- Must **complete successfully** before main containers are allowed to start
- Useful for setup, configuration, or waiting for dependencies
- Run to completion (not running during app lifetime)

**Common Use Cases:**
1. **Pre-processing**: Generate or modify configuration files
2. **Dependency Waiting**: Check if databases, APIs, or services are ready
3. **Installation**: Install utilities, toolchains, or software
4. **Data Fetching**: Download initial data or configuration from remote sources
5. **Permission Setup**: Initialize file systems or permissions

### Sidecar Containers

Sidecar containers are secondary containers that:
- Run **alongside** the main application container in the same pod
- Share the pod's namespace (network, storage, etc.)
- Run continuously while the pod is alive
- Provide additional functionality without changing the main app

**Common Use Cases:**
1. **Logging**: Collect and forward application logs
2. **Monitoring**: Export metrics or health information
3. **Security**: Handle SSL/TLS termination or secrets management
4. **Service Mesh**: Proxy all network traffic (e.g., Envoy in Istio)
5. **Data Synchronization**: Sync data with external systems
6. **Configuration Management**: Watch and apply configuration changes

### Shared Volumes

Containers within a pod can share storage via volumes:
- `emptyDir`: Temporary storage, created when pod is created, deleted when pod is deleted
- `configMap`: Configuration data from Kubernetes ConfigMaps
- `secret`: Sensitive data from Kubernetes Secrets
- `persistentVolumeClaim`: Long-term storage (survives pod restart)

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Wikipedia Pod                         │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Init Container: wikipedia-init                   │  │
│  ├──────────────────────────────────────────────────┤  │
│  │ • Runs once on pod startup                       │  │
│  │ • Fetches: https://en.wikipedia.org/wiki/...     │  │
│  │ • Saves: /www/Kubernetes.html                   │  │
│  │ • Exits successfully                             │  │
│  │ • Pod waits for init to complete                │  │
│  └──────────────────────────────────────────────────┘  │
│            ⬇️ (on success)                              │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Main Container: nginx                            │  │
│  ├──────────────────────────────────────────────────┤  │
│  │ • Serves files from /usr/share/nginx/html        │  │
│  │ • Mounted: /www volume                           │  │
│  │ • Runs indefinitely (HTTP server)                │  │
│  │ • Port: 80                                        │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Sidecar Container: wikipedia-sidecar             │  │
│  ├──────────────────────────────────────────────────┤  │
│  │ • Runs alongside nginx                           │  │
│  │ • Sleep: 5-15 minutes (random)                   │  │
│  │ • Fetches: https://en.wikipedia.org/wiki/...     │  │
│  │ • Saves: /www/Random_<title>.html               │  │
│  │ • Repeats indefinitely                           │  │
│  │ • Low CPU/memory footprint                       │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Shared Volume: www (emptyDir)                    │  │
│  ├──────────────────────────────────────────────────┤  │
│  │ • Mounted at /www or /usr/share/nginx/html       │  │
│  │ • Shared by all containers                       │  │
│  │ • Wikipedia pages saved here                     │  │
│  │ • Deleted when pod is deleted                    │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## Implementation Details

### Init Container Behavior

The init container (`wikipedia-init`):
1. Installs curl (since alpine doesn't include it by default)
2. Fetches the Kubernetes Wikipedia page
3. Saves it as `Kubernetes.html` in the shared `/www` volume
4. Exits with status code 0 (success)
5. If successful, nginx container starts
6. If failed, pod is in CrashLoopBackOff (depends on restartPolicy)

```bash
curl -L "https://en.wikipedia.org/wiki/Kubernetes" \
  -o /www/Kubernetes.html \
  --max-time 30 \
  -H "User-Agent: Mozilla/5.0 ..."
```

### Main Container

The nginx container:
- Serves any file in `/usr/share/nginx/html`
- Mounts the shared `emptyDir` volume at that path
- Files created by init or sidecar immediately appear via HTTP
- Runs continuously

### Sidecar Container Behavior

The sidecar (`wikipedia-sidecar`):
1. Enters an infinite loop
2. Sleeps for random 5-15 minutes
3. Fetches a random Wikipedia page via `Special:Random`
4. Extracts page title from redirect URL
5. Saves as `Random_<title>.html` in shared volume
6. Repeats indefinitely

```bash
# Random sleep (5-15 minutes)
SLEEP_TIME=$((RANDOM % 600 + 300))  # 300-900 seconds
sleep $SLEEP_TIME

# Fetch random page
curl -L "https://en.wikipedia.org/wiki/Special:Random" \
  -o "/www/Random_${PAGE_TITLE}.html" \
  --max-time 30
```

### Shared Volume

An `emptyDir` volume:
- Created when pod starts
- Deleted when pod is deleted
- All containers see the same files
- Perfect for inter-container communication
- Temporary storage (no persistence across pod restarts)

## Kubernetes Manifests

### Pod Definition (wikipedia-pod.yaml)

```yaml
spec:
  initContainers:
  - name: wikipedia-init
    # Runs once, before main containers
    command: [fetch Kubernetes.html]
  
  containers:
  - name: nginx
    # Main application
    ports: [80]
  
  - name: wikipedia-sidecar
    # Runs alongside nginx
    command: [infinite loop, fetch random pages]
  
  volumes:
  - name: www
    emptyDir: {}
```

Key features:
- **initContainers**: Listed first, runs sequentially before containers
- **containers**: All start after init completes
- **volumeMounts**: Each container mounts the shared volume at different paths
- **restartPolicy**: Pod restarts sidecar if it crashes

### Service Definition (wikipedia-service.yaml)

Exposes the pod via:
- **NodePort 30080**: Direct access from host
- **ClusterIP**: Access from other pods

## Usage

### Automated Deployment

```bash
chmod +x deploy.sh
./deploy.sh
```

This will:
1. Create the pod
2. Create the service
3. Wait for pod readiness
4. Show container status
5. Display logs
6. Provide access instructions

### Manual Deployment

```bash
kubectl apply -f manifests/wikipedia-pod.yaml
kubectl apply -f manifests/wikipedia-service.yaml
```

### Verify Deployment

```bash
# Check pod status
kubectl get pod wikipedia-pod -o wide

# View init container status
kubectl logs wikipedia-pod --container wikipedia-init

# View sidecar logs
kubectl logs -f wikipedia-pod --container wikipedia-sidecar

# List files in shared volume
kubectl exec wikipedia-pod -c nginx -- ls -la /usr/share/nginx/html
```

### Access the Wikipedia Archive

**Port-forward method:**
```bash
kubectl port-forward svc/wikipedia-svc 8080:80
open http://localhost:8080
```

**Direct curl:**
```bash
kubectl exec wikipedia-pod -c nginx -- curl http://localhost/Kubernetes.html | head -50
```

**List all pages:**
```bash
kubectl exec wikipedia-pod -c nginx -- ls /usr/share/nginx/html/
```

### Monitor Container Activity

```bash
# Watch sidecar fetching new pages
kubectl logs -f wikipedia-pod --container wikipedia-sidecar

# Watch pod status changes
kubectl get pod wikipedia-pod -w

# Describe pod for full status
kubectl describe pod wikipedia-pod
```

### Cleanup

```bash
chmod +x cleanup.sh
./cleanup.sh
```

Or manually:
```bash
kubectl delete pod wikipedia-pod
kubectl delete svc wikipedia-svc
```

## Key Concepts Demonstrated

### 1. Init Container Execution

Init containers:
- Run to completion (not daemon-like)
- Run sequentially if multiple init containers
- Pod stays in `Initializing` state until all complete
- Failure blocks main containers (depending on restartPolicy)

### 2. Container-to-Container Communication

Via shared volume:
- Init container writes files
- Nginx serves those files
- Sidecar adds new files
- All access same filesystem

### 3. Specialization of Duties

Each container has one responsibility:
- **Init**: One-time setup (fetch initial data)
- **Main**: Core service (serve HTTP)
- **Sidecar**: Background task (fetch new data)

### 4. Resource Efficiency

Multiple containers sharing:
- Network namespace (same IP, different ports)
- Storage (shared volumes)
- Process namespace (optional with `shareProcessNamespace`)

### 5. Graceful Shutdown

When pod terminates:
1. SIGTERM sent to containers
2. Containers have grace period (default 30s)
3. All containers must stop
4. Volume deleted

## Troubleshooting

### Init Container Stuck in Initializing

```bash
# Check init container logs
kubectl logs wikipedia-pod --container wikipedia-init

# Common issues:
# • Network unreachable (no internet connectivity)
# • Timeout (Wikipedia slow or unreachable)
# • Permission denied on /www directory
```

### Pod Won't Start

```bash
# Check pod status
kubectl describe pod wikipedia-pod

# Check events
kubectl get events --sort-by='.lastTimestamp'

# If init failed:
# • Fix command and reapply manifest
# • Pod will restart based on restartPolicy
```

### Sidecar Not Fetching

```bash
# Check sidecar logs
kubectl logs wikipedia-pod --container wikipedia-sidecar

# If no activity:
# • Check internet connectivity
# • Verify Wikipedia is accessible
# • Check storage space in /www
```

### Can't Access Files via HTTP

```bash
# Verify nginx is serving the directory
kubectl exec wikipedia-pod -c nginx -- curl localhost/

# Check file permissions
kubectl exec wikipedia-pod -c nginx -- ls -la /usr/share/nginx/html/

# Verify volume mount
kubectl exec wikipedia-pod -c nginx -- mount | grep www
```

## Advanced Topics

### Using Multiple Init Containers

Init containers run sequentially:

```yaml
initContainers:
- name: init-1
  command: ["echo", "First"]
- name: init-2
  command: ["echo", "Second"]
- name: init-3
  command: ["echo", "Third"]
```

Each must succeed before next starts.

### Init Container Failure Handling

Control behavior with `restartPolicy`:

```yaml
restartPolicy: Always          # Restart pod if init fails
restartPolicy: OnFailure       # Restart if any container fails
restartPolicy: Never           # Don't restart
```

### Sharing Process Namespace

Allow sidecar to access main process:

```yaml
shareProcessNamespace: true
containers:
- name: nginx
  # Main process visible to sidecar
- name: sidecar
  command: ["ps aux"]  # See nginx process
```

### Persistent Storage

Use PersistentVolumeClaim instead of emptyDir:

```yaml
volumes:
- name: www
  persistentVolumeClaim:
    claimName: wikipedia-pvc
```

Pages persist across pod restarts!

### Init Container Waiting Pattern

Wait for a service to be ready:

```yaml
initContainers:
- name: wait-for-db
  image: busybox
  command: ['sh', '-c', 'until nc -z db.default 5432; do echo waiting; sleep 2; done']
```

### Sidecar Patterns in Production

**Logging sidecar** (reads app logs):
```yaml
- name: log-forwarder
  image: fluentd
  volumeMounts:
  - name: app-logs
    mountPath: /var/log/app
```

**Monitoring sidecar** (exports metrics):
```yaml
- name: prometheus-exporter
  image: app-exporter
  ports:
  - containerPort: 9090
```

**Service mesh sidecar** (proxies traffic):
```yaml
- name: envoy
  image: envoy
  ports:
  - containerPort: 15000  # Admin
```

## Files Structure

```
ejercicio5_4/
├── README.md                      # This file
├── Dockerfile                     # nginx + curl image
├── deploy.sh                       # Automated deployment
├── cleanup.sh                      # Cleanup script
└── manifests/
    ├── wikipedia-pod.yaml         # Pod with init + sidecar
    └── wikipedia-service.yaml     # Service for access
```

## Learning Path Integration

### Series 5: Extending and Automating Kubernetes

**5.1 - DIY CRD & Custom Controller**
- Learn to extend Kubernetes API

**5.2 - Getting Started with Istio Ambient Mode**
- Learn service mesh concepts

**5.3 - Log App, the Service Mesh Edition**
- Apply service mesh to apps

**5.4 - Wikipedia with Init and Sidecar** ← You are here
- Learn container patterns used by service meshes
- Init: Setup (similar to Istio sidecar injection)
- Sidecar: Background tasks (similar to Envoy proxy)

**Progression:**
- 5.1-5.3: Infrastructure patterns
- 5.4: Container patterns (building blocks for infrastructure)

## Key Takeaways

1. **Init containers are perfect for setup**
   - Run once, ensuring prerequisites met
   - Don't consume resources while app runs
   - Essential for initialization logic

2. **Sidecars provide transparency**
   - Add functionality without app changes
   - Can be independent of main app
   - Essential in service mesh (Envoy sidecar)

3. **Shared volumes enable cooperation**
   - Containers work together
   - Simple inter-container IPC
   - Foundation for pod patterns

4. **Pod design matters**
   - Each container = one responsibility
   - Clear separation of concerns
   - Easy to understand and maintain

5. **Real-world usage**
   - Service meshes use sidecars (Envoy)
   - Logging uses init + sidecars
   - CI/CD uses init for setup
   - Monitoring uses sidecars

## References

- [Kubernetes Init Containers](https://kubernetes.io/docs/concepts/workloads/pods/init-containers/)
- [Kubernetes Sidecar Containers](https://kubernetes.io/docs/concepts/workloads/pods/sidecar-containers/)
- [Pod Overview](https://kubernetes.io/docs/concepts/workloads/pods/)
- [Volumes](https://kubernetes.io/docs/concepts/storage/volumes/)
- [Istio Sidecar Proxy Pattern](https://istio.io/latest/docs/concepts/traffic-management/#virtual-services)
- [Container Patterns](https://kubernetes.io/docs/concepts/workloads/pods/#how-pods-manage-multiple-containers)

## Conclusion

Init containers and sidecars are powerful patterns that enable sophisticated Kubernetes applications. By understanding how these containers work and share resources, you're building the foundational knowledge used in service meshes, observability systems, and enterprise Kubernetes deployments.

The Wikipedia archiver demonstrates both patterns:
- **Init container** ensures the pod has initial data before serving
- **Sidecar** continuously enhances functionality without altering the main app
- **Shared volume** enables seamless cooperation between containers

These patterns are used extensively in production systems and are essential for building robust, observable, and maintainable Kubernetes applications.
