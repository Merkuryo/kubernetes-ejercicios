# Ejercicio 4.2 — Readiness & Liveness Probes (The Project)

Objetivo

- Añadir probes (readiness + liveness) y un endpoint `/healthz` en la aplicación "The Project".
- Verificar que la aplicación se marca como `NotReady` cuando no puede conectar a la base de datos.

Estructura

- `manifests/postgres.yaml` — ConfigMap / Secret / Headless Service / StatefulSet para PostgreSQL.
- `manifests/deployment.yaml` — Deployment de `the-project` con `readinessProbe` y `livenessProbe` ya configuradas (puerto 3541, ruta `/healthz`).
- `manifests/service.yaml` — Service (ClusterIP) para `the-project`.

Pruebas (pasos)

1) Crear un namespace de pruebas y desplegar:

```bash
kubectl create ns exercise-4-2
kubectl -n exercise-4-2 apply -f ejercicio4_2/manifests/postgres.yaml
kubectl -n exercise-4-2 apply -f ejercicio4_2/manifests/deployment.yaml
kubectl -n exercise-4-2 apply -f ejercicio4_2/manifests/service.yaml
```

2) Esperar a que PostgreSQL esté listo:

```bash
kubectl -n exercise-4-2 get pods -w
```

3) Simular fallo: poner contraseña incorrecta (patch Secret) para que la app no pueda conectar y el `readinessProbe` falle:

```bash
kubectl -n exercise-4-2 patch secret postgres-secret --type='json' -p='[{"op":"replace","path":"/stringData/password","value":"badpassword"}]'
# Si patch falla por formato, alternativamente borrar y recrear el Secret con la contraseña mala:
# kubectl -n exercise-4-2 delete secret postgres-secret
# kubectl -n exercise-4-2 create secret generic postgres-secret --from-literal=password=badpassword
```

Observa que los pods del deployment se marcarán como `0/1` (o no listos) porque la aplicación no puede conectar a BD.

4) Recuperación: restaurar la contraseña correcta en el Secret (`password`) o recrear el Secret con el valor correcto:

```bash
kubectl -n exercise-4-2 patch secret postgres-secret --type='json' -p='[{"op":"replace","path":"/stringData/password","value":"password"}]'
# espera a que los pods vuelvan a READY
kubectl -n exercise-4-2 get pods -w
```

Notas

- El `readinessProbe` evita que el Service enrute tráfico a pods que no tienen conexión con la DB.
- El `livenessProbe` permite reiniciar containers que queden en un estado no recuperable.
- Si la app es lenta al arrancar, usar `startupProbe` (no incluido aquí).

