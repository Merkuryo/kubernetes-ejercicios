# Exercise 1.11: Persisting Data

## Description

Este ejercicio implementa la compartición de datos entre dos contenedores en un mismo pod usando un **PersistentVolume (PV)** y un **PersistentVolumeClaim (PVC)**.

### Componentes

1. **Log Writer**: Genera una cadena aleatoria al inicio y escribe un registro con timestamp cada 5 segundos en `/usr/src/app/data/log.txt`
2. **Log Reader**: Lee el archivo de log y lo sirve a través de un endpoint HTTP

Ambos contenedores están en el **mismo pod** y comparten un volumen persistente.

## Estructura de archivos

```
manifests/
├── deployment.yaml          # Deployment con ambos contenedores en el mismo pod
├── storage/
│   ├── persistentvolume.yaml        # PersistentVolume local
│   └── persistentvolumeclaim.yaml   # PersistentVolumeClaim
```

## Cómo ejecutar

1. **Crear el directorio en el nodo:**
```bash
docker exec k3d-k3s-default-agent-0 mkdir -p /tmp/kube
```

2. **Aplicar el PersistentVolume y PersistentVolumeClaim:**
```bash
kubectl apply -f storage/persistentvolume.yaml
kubectl apply -f storage/persistentvolumeclaim.yaml
```

3. **Aplicar el Deployment:**
```bash
kubectl apply -f deployment.yaml
```

4. **Acceder a la aplicación:**
```bash
# Ver los registros
curl http://localhost:30000/

# Hacer ping (opcional)
curl -X POST http://localhost:30001/ping
```

## Verificar persistencia

1. **Ver el pod:**
```bash
kubectl get pods
```

2. **Eliminar el pod:**
```bash
kubectl delete pod -l app=app
```

3. **Ver que se recrea automáticamente:**
```bash
kubectl get pods
```

4. **Verificar que los datos persisten:**
```bash
curl http://localhost:30000/
```

Los registros antiguos seguirán ahí, aunque el nuevo pod tendrá un nuevo ID aleatorio.

## Conceptos aprendidos

- ✅ **Volúmenes compartidos**: Dos contenedores en el mismo pod compartiendo un emptyDir
- ✅ **PersistentVolumes**: Almacenamiento duradero en el nodo
- ✅ **PersistentVolumeClaim**: Reclamación de almacenamiento
- ✅ **Local Storage**: Uso de almacenamiento local en k3s/k3d
