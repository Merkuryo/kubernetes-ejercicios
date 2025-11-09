# Exercise 2.5: Documentation and ConfigMaps

## Description

En este ejercicio aprendemos a usar **ConfigMaps** en Kubernetes para pasar configuraciones a los pods. Un ConfigMap permite:

- Almacenar datos de configuración en pares clave-valor
- Montar archivos de configuración como volúmenes
- Inyectar variables de entorno en contenedores
- Cambiar configuraciones sin reconstruir imágenes Docker

## Concepto: ConfigMap vs Secret

| Característica | ConfigMap | Secret |
|----------------|-----------|--------|
| Datos sensibles | No | Sí |
| Encoding | No | Base64 |
| Cifrado | No | Depende |
| Datos típicos | Configuración | Credenciales, claves |

## Ejercicio Implementado

### ConfigMap Creado

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  namespace: exercises
  name: log-output-config
data:
  information.txt: |
    this text is from file
  MESSAGE: hello world
```

### Dos Formas de Usar el ConfigMap

#### 1. Como Variable de Entorno

```yaml
env:
- name: MESSAGE
  valueFrom:
    configMapKeyRef:
      name: log-output-config
      key: MESSAGE
```

#### 2. Como Volumen Montado

```yaml
volumeMounts:
- name: config-volume
  mountPath: /etc/config
  readOnly: true
volumes:
- name: config-volume
  configMap:
    name: log-output-config
```

### Aplicación Mejorada

La aplicación log-output ahora:
- ✅ Lee el archivo `information.txt` del ConfigMap
- ✅ Lee la variable de entorno `MESSAGE` del ConfigMap
- ✅ Muestra ambos en el output
- ✅ Mantiene el contador de pings

**Output esperado:**

```
file content: this text is from file
env variable: MESSAGE=hello world
2025-10-19T19:21:04.513Z: b46d8c22-1ea5-4b7c-b14c-71b623f6b1ca
Ping / Pongs: 2
```

## Estructura del Ejercicio

```
ejercicio2_5/
├── README.md
├── log-output/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       └── index.js
└── manifests/
    ├── configmap.yaml
    └── deployment.yaml
```

## Archivos Creados

### ConfigMap (`manifests/configmap.yaml`)

Define:
- **information.txt**: Archivo que será montado como volumen
- **MESSAGE**: Variable de entorno

### Aplicación (`log-output/src/index.js`)

```javascript
// Leer el archivo del ConfigMap
const configFilePath = '/etc/config/information.txt';
if (fs.existsSync(configFilePath)) {
  configMapInfo.fileContent = fs.readFileSync(configFilePath, 'utf8').trim();
}

// Leer la variable de entorno
configMapInfo.messageEnv = process.env.MESSAGE || 'MESSAGE not set';
```

### Deployment (`manifests/deployment.yaml`)

Monta el ConfigMap de dos formas:
1. Como volumen en `/etc/config`
2. Como variable de entorno `MESSAGE`

## Operaciones Útiles

### Ver el ConfigMap

```bash
kubectl get configmap -n exercises
kubectl describe configmap log-output-config -n exercises
```

### Ver el contenido del archivo desde el pod

```bash
kubectl exec -it -n exercises deployment/logoutput-configmap-dep -- cat /etc/config/information.txt
```

### Ver la variable de entorno

```bash
kubectl exec -it -n exercises deployment/logoutput-configmap-dep -- env | grep MESSAGE
```

### Acceder al servicio

```bash
kubectl port-forward -n exercises svc/logoutput-configmap-svc 3000:3000
# O desde dentro del cluster
kubectl exec -it -n exercises deployment/logoutput-configmap-dep -- wget -qO- http://localhost:3000/
```

## Actualizar el ConfigMap

Para cambiar la configuración sin reconstruir la imagen:

1. Editar el ConfigMap:
```bash
kubectl edit configmap log-output-config -n exercises
```

2. Los pods que montan el archivo verán los cambios automáticamente (después de un delay)

## Ventajas de ConfigMaps

1. **Separación de Configuración**: Configuración separada del código
2. **Reutilización**: Mismo ConfigMap para múltiples pods
3. **Cambios Dinámicos**: Actualizar configuración sin reconstruir imagen
4. **Versionado**: Cambios versionados en git
5. **Seguridad**: ConfigMaps para datos no sensibles, Secrets para sensibles

## Secretos vs ConfigMaps

**Usar ConfigMap para:**
- Configuraciones públicas
- Archivos de configuración
- URLs públicas

**Usar Secrets para:**
- Contraseñas
- API keys
- Tokens
- Certificados

## Siguiente Paso

En ejercicios posteriores:
- Usar Secrets con cifrado (SOPS/SealedSecrets)
- ConfigMaps dinámicos que actualicen aplicaciones
- Validación de ConfigMaps

## Documentación Oficial

- [Kubernetes ConfigMaps](https://kubernetes.io/docs/concepts/configuration/configmap/)
- [Configure Pods with ConfigMaps](https://kubernetes.io/docs/tasks/configure-pod-container/configure-pod-configmap/)
- [Kubernetes Secrets](https://kubernetes.io/docs/concepts/configuration/secret/)

## Verificación Final

```bash
# Ver ConfigMap
kubectl get configmap -n exercises log-output-config

# Ver deployment
kubectl get deployment -n exercises logoutput-configmap-dep

# Ver logs
kubectl logs -n exercises deployment/logoutput-configmap-dep

# Probar endpoint
kubectl exec -it -n exercises deployment/logoutput-configmap-dep -- \
  wget -qO- http://localhost:3000/
```

Output esperado:
```
file content: this text is from file
env variable: MESSAGE=hello world
2025-10-19T...: ...
Ping / Pongs: N
```
