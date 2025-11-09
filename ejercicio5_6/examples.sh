#!/bin/bash

# Exercise 5.6: Knative Service Examples
# Collection of YAML manifests for different Knative scenarios

# Function to create example files
create_examples() {
    EXAMPLES_DIR="${1:-.}"
    
    # Example 1: Simple Hello World Service
    cat > "$EXAMPLES_DIR/01-hello-world.yaml" <<'EOF'
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
    
    # Example 2: Environment Variables Configuration
    cat > "$EXAMPLES_DIR/02-configurable-service.yaml" <<'EOF'
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: hello-config
  namespace: default
spec:
  template:
    metadata:
      name: hello-config-v1
    spec:
      containers:
      - image: gcr.io/knative-samples/helloworld-go
        ports:
        - containerPort: 8080
        env:
        - name: PORT
          value: "8080"
        - name: TARGET
          value: "Configuration"
        - name: GREETING
          value: "Hello"
EOF
    
    # Example 3: Scale-to-Zero Configuration
    cat > "$EXAMPLES_DIR/03-scale-to-zero.yaml" <<'EOF'
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: scale-to-zero
  namespace: default
spec:
  template:
    metadata:
      annotations:
        autoscaling.knative.dev/scaleDownDelay: "30s"  # Scale down after 30s of no traffic
        autoscaling.knative.dev/scaleToZeroPodRetentionPeriod: "300s"  # Keep pod for 5 minutes
    spec:
      containers:
      - image: gcr.io/knative-samples/helloworld-go
        ports:
        - containerPort: 8080
        env:
        - name: TARGET
          value: "Scale to Zero"
EOF
    
    # Example 4: Minimum Replicas Configuration
    cat > "$EXAMPLES_DIR/04-min-replicas.yaml" <<'EOF'
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: always-running
  namespace: default
spec:
  template:
    metadata:
      annotations:
        autoscaling.knative.dev/minScale: "1"  # Always keep at least 1 pod
        autoscaling.knative.dev/maxScale: "5"  # Max 5 pods
    spec:
      containers:
      - image: gcr.io/knative-samples/helloworld-go
        ports:
        - containerPort: 8080
        env:
        - name: TARGET
          value: "Always Running"
EOF
    
    # Example 5: Custom Autoscaling Policy
    cat > "$EXAMPLES_DIR/05-autoscaling.yaml" <<'EOF'
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: autoscale-demo
  namespace: default
spec:
  template:
    metadata:
      annotations:
        autoscaling.knative.dev/metric: "rps"  # Scale by requests per second
        autoscaling.knative.dev/target: "100"  # Scale at 100 requests/sec
        autoscaling.knative.dev/minScale: "2"  # Min 2 pods
        autoscaling.knative.dev/maxScale: "20" # Max 20 pods
    spec:
      containers:
      - image: gcr.io/knative-samples/helloworld-go
        ports:
        - containerPort: 8080
        env:
        - name: TARGET
          value: "Autoscale Demo"
EOF
    
    # Example 6: Traffic Splitting (Canary Deployment)
    cat > "$EXAMPLES_DIR/06-traffic-split.yaml" <<'EOF'
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: canary
  namespace: default
spec:
  template:
    metadata:
      name: canary-v2
    spec:
      containers:
      - image: gcr.io/knative-samples/helloworld-go
        ports:
        - containerPort: 8080
        env:
        - name: TARGET
          value: "Version 2"
  # Traffic configuration: route 80% to v1, 20% to v2 (new version)
  traffic:
  - tag: v1
    revisionName: canary-v1
    percent: 80
  - tag: v2
    revisionName: canary-v2
    percent: 20
EOF
    
    # Example 7: Traffic Split with Named Routes
    cat > "$EXAMPLES_DIR/07-traffic-split-advanced.yaml" <<'EOF'
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: traffic-advanced
  namespace: default
spec:
  template:
    metadata:
      name: traffic-advanced-v3
    spec:
      containers:
      - image: gcr.io/knative-samples/helloworld-go
        ports:
        - containerPort: 8080
        env:
        - name: TARGET
          value: "Advanced Traffic"
  traffic:
  # Route 50% to latest revision
  - latestRevision: true
    percent: 50
    tag: latest
  # Route 30% to stable version
  - revisionName: traffic-advanced-v1
    percent: 30
    tag: stable
  # Route 20% to experimental version
  - revisionName: traffic-advanced-v3
    percent: 20
    tag: experimental
EOF
    
    # Example 8: Resource Requests and Limits
    cat > "$EXAMPLES_DIR/08-resource-limits.yaml" <<'EOF'
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: resource-limited
  namespace: default
spec:
  template:
    metadata:
      name: resource-limited-v1
    spec:
      containers:
      - image: gcr.io/knative-samples/helloworld-go
        ports:
        - containerPort: 8080
        resources:
          requests:
            cpu: "100m"
            memory: "128Mi"
          limits:
            cpu: "500m"
            memory: "512Mi"
        env:
        - name: TARGET
          value: "Resource Limited"
EOF
    
    # Example 9: Custom Image with Port Configuration
    cat > "$EXAMPLES_DIR/09-custom-port.yaml" <<'EOF'
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: custom-port
  namespace: default
spec:
  template:
    metadata:
      name: custom-port-v1
    spec:
      containers:
      - image: gcr.io/knative-samples/helloworld-go
        ports:
        - containerPort: 9000  # Custom port (must match app's PORT env)
        env:
        - name: PORT
          value: "9000"
        - name: TARGET
          value: "Custom Port"
EOF
    
    # Example 10: Complete Production-Ready Service
    cat > "$EXAMPLES_DIR/10-production-ready.yaml" <<'EOF'
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: production-app
  namespace: default
  labels:
    app: production-app
    environment: production
spec:
  template:
    metadata:
      name: production-app-v1
      labels:
        version: v1
      annotations:
        # Autoscaling
        autoscaling.knative.dev/minScale: "1"
        autoscaling.knative.dev/maxScale: "20"
        autoscaling.knative.dev/metric: "rps"
        autoscaling.knative.dev/target: "100"
        # Performance tuning
        autoscaling.knative.dev/scaleDownDelay: "60s"
        autoscaling.knative.dev/scaleToZeroPodRetentionPeriod: "600s"
    spec:
      # Container specification
      containers:
      - name: app
        image: gcr.io/knative-samples/helloworld-go
        ports:
        - containerPort: 8080
        # Environment configuration
        env:
        - name: PORT
          value: "8080"
        - name: TARGET
          value: "Production"
        - name: LOG_LEVEL
          value: "info"
        # Resource management
        resources:
          requests:
            cpu: "100m"
            memory: "256Mi"
          limits:
            cpu: "1"
            memory: "512Mi"
        # Health checks
        livenessProbe:
          httpGet:
            path: /
            port: 8080
          initialDelaySeconds: 0
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /
            port: 8080
          initialDelaySeconds: 0
          periodSeconds: 5
      # Pod specification
      timeoutSeconds: 300
      serviceAccountName: default
  # Traffic management
  traffic:
  - latestRevision: true
    percent: 100
EOF

    # Example 11: Python Flask Application
    cat > "$EXAMPLES_DIR/11-python-flask.yaml" <<'EOF'
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: python-flask-app
  namespace: default
spec:
  template:
    metadata:
      name: python-flask-v1
    spec:
      containers:
      - image: python:3.11-slim
        command: ["/bin/sh"]
        args:
          - -c
          - |
            pip install flask &&
            cat > app.py <<'PYEOF'
            from flask import Flask
            import os
            
            app = Flask(__name__)
            
            @app.route('/')
            def hello():
                target = os.environ.get('TARGET', 'World')
                return f'Hello {target}!\n'
            
            if __name__ == '__main__':
                port = int(os.environ.get('PORT', 8080))
                app.run(host='0.0.0.0', port=port, debug=False)
            PYEOF
            
            python app.py
        ports:
        - containerPort: 8080
        env:
        - name: PORT
          value: "8080"
        - name: TARGET
          value: "Flask Knative"
EOF
    
    # Example 12: Node.js Express Application
    cat > "$EXAMPLES_DIR/12-nodejs-express.yaml" <<'EOF'
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: nodejs-express-app
  namespace: default
spec:
  template:
    metadata:
      name: nodejs-express-v1
    spec:
      containers:
      - image: node:18-slim
        command: ["/bin/sh"]
        args:
          - -c
          - |
            npm install express &&
            cat > server.js <<'JSEOF'
            const express = require('express');
            const app = express();
            
            app.get('/', (req, res) => {
              const target = process.env.TARGET || 'World';
              res.send(`Hello ${target}!\n`);
            });
            
            const port = process.env.PORT || 8080;
            app.listen(port, () => {
              console.log(`Server running on port ${port}`);
            });
            JSEOF
            
            node server.js
        ports:
        - containerPort: 8080
        env:
        - name: PORT
          value: "8080"
        - name: TARGET
          value: "Node.js Express"
EOF

    echo "Created 12 example Knative service manifests in $EXAMPLES_DIR"
    ls -la "$EXAMPLES_DIR"/*.yaml 2>/dev/null || echo "Examples created as inline content"
}

# Main function
main() {
    echo "Knative Service Examples Generator"
    echo "===================================="
    echo
    
    # Use provided directory or current directory
    TARGET_DIR="${1:-.}"
    
    # Create directory if it doesn't exist
    mkdir -p "$TARGET_DIR"
    
    # Create all examples
    create_examples "$TARGET_DIR"
    
    echo
    echo "To deploy examples:"
    echo "  kubectl apply -f $TARGET_DIR/01-hello-world.yaml"
    echo
    echo "To list all Knative services:"
    echo "  kubectl get ksvc"
    echo
    echo "To test a service (replace SERVICE_NAME and IP):"
    echo "  curl -H \"Host: SERVICE_NAME.default.IP.sslip.io\" http://localhost:8081"
}

# Run main if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
