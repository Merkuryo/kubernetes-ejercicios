#!/bin/bash

# Port-forward to backend
kubectl port-forward -n project svc/todo-backend-svc 3000:3000 > /tmp/pf.log 2>&1 &
PF_PID=$!
sleep 2

echo "=== TEST 1: Valid TODO (20 characters) ==="
curl -X POST http://localhost:3000/todos \
  -H "Content-Type: application/json" \
  -d '{"content":"Learn Kubernetes"}' \
  -w "\nStatus: %{http_code}\n\n"

sleep 1

echo "=== TEST 2: Valid TODO (140 characters - at limit) ==="
LONG_TEXT=$(printf 'A%.0s' {1..140})
curl -X POST http://localhost:3000/todos \
  -H "Content-Type: application/json" \
  -d "{\"content\":\"$LONG_TEXT\"}" \
  -w "\nStatus: %{http_code}\n\n"

sleep 1

echo "=== TEST 3: Invalid TODO (141 characters - exceeds limit) ==="
TOOLONG_TEXT=$(printf 'B%.0s' {1..141})
curl -X POST http://localhost:3000/todos \
  -H "Content-Type: application/json" \
  -d "{\"content\":\"$TOOLONG_TEXT\"}" \
  -w "\nStatus: %{http_code}\n\n"

sleep 1

echo "=== TEST 4: GET /todos ==="
curl -X GET http://localhost:3000/todos \
  -H "Content-Type: application/json" \
  -w "\nStatus: %{http_code}\n\n"

echo "Done! Check logs with: kubectl logs -n project deployment/todo-backend-dep -f"

# Cleanup
kill $PF_PID 2>/dev/null
