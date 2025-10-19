# Kubernetes Exercises

## DevOps with Kubernetes - Ejercicios 🚀

Repository de ejercicios de Kubernetes del curso "DevOps with Kubernetes". Cada ejercicio demuestra conceptos clave de Kubernetes.

### ✅ Parte 1: Basics & Deployments

| Ejercicio | Título | Conceptos | Estado |
|-----------|--------|----------|--------|
| [1.1-1.5](ejercicio1_1) | Introducción a Deployments | Pods, Deployments, básicos | ✅ |
| [1.6](ejercicio1_6) | NodePort Service | Servicios ClusterIP y NodePort | ✅ |
| [1.7](ejercicio1_7) | Ingress & Routing | Ingress, routing por ruta | ✅ |
| [1.8](ejercicio1_8) | Multi-Service Ingress | Múltiples servicios en Ingress | ✅ |
| [1.9](ejercicio1_9) | Shared Volume | emptyDir, volúmenes compartidos | ✅ |
| [1.10](ejercicio1_10) | Log Output con Volumen | emptyDir entre contenedores | ✅ |

### 🔄 Parte 1: Storage & Persistence

| Ejercicio | Título | Conceptos | Estado |
|-----------|--------|----------|--------|
| [1.11](ejercicio1_11) | Persistent Volumes | PV, PVC, local storage | ✅ |
| [1.12](ejercicio1_12) | Image Caching | Cache de 10 minutos, volúmenes | ✅ |
| [1.13](ejercicio1_13) | TODO App | HTML dinámico, formularios, 140 chars | ✅ |

### 🌐 Parte 2: Pod Communication

| Ejercicio | Título | Conceptos | Estado |
|-----------|--------|----------|--------|
| [2.1](ejercicio2_1) | Pod-to-Pod Communication | Service DNS, HTTP inter-pod | ✅ |

---

## Ejercicios Detallados

### Ejercicio 1.11: Persisting Data 
- **Descripción**: Dos contenedores en el mismo pod compartiendo un PersistentVolume
- **Tecnologías**: PersistentVolume, PersistentVolumeClaim, local storage
- **Features**: 
  - Log writer escribe cada 5 segundos
  - Log reader lee archivo compartido
  - Datos persisten entre reinicios
- **[Release v1.11](https://github.com/Merkuryo/kubernetes-ejercicios/releases/tag/1.11)**

### Ejercicio 1.12: Project Step 6 - Image Caching
- **Descripción**: Descarga y cachea imágenes por 10 minutos
- **Tecnologías**: Express.js, axios, emptyDir volumes
- **Features**:
  - Caché de imágenes (10 min)
  - Log output con timestamps
  - Contador de pings
  - Interfaz HTML moderna
- **[Release v1.12](https://github.com/Merkuryo/kubernetes-ejercicios/releases/tag/v1.12)**

### Ejercicio 1.13: Project Step 7 - TODO App
- **Descripción**: Aplicación TODO con validación de 140 caracteres
- **Tecnologías**: Express.js, HTML5, CSS3, JavaScript vanilla
- **Features**:
  - Campo de entrada con límite 140 caracteres
  - Contador en tiempo real
  - Lista de TODOs predeterminados
  - Interfaz responsiva
  - API RESTful para TODOs
- **[Release v1.13](https://github.com/Merkuryo/kubernetes-ejercicios/releases/tag/v1.13)**

### Ejercicio 2.1: Connecting Pods
- **Descripción**: Comunicación HTTP entre dos pods usando Service DNS
- **Tecnologías**: Service Discovery, ClusterIP, NodePort, HTTP
- **Arquitectura**:
  - Ping Pong: Expone contador vía HTTP
  - Log Output: Consulta contador vía HTTP
  - Ambos pods en red del cluster
- **Conceptos**:
  - Kubernetes DNS service
  - ClusterIP service
  - Inter-pod communication
  - Service discovery
- **[Release v2.1](https://github.com/Merkuryo/kubernetes-ejercicios/releases/tag/v2.1)**

---

## Setup & Uso

### Requisitos
- Docker
- Kubernetes (k3d, minikube, o cluster real)
- kubectl
- Node.js (para desarrollo local)

### Quick Start

```bash
# Clonar repositorio
git clone https://github.com/Merkuryo/kubernetes-ejercicios.git
cd kubernetes-ejercicios

# Crear cluster k3d
k3d cluster create

# Seleccionar un ejercicio
cd ejercicio2_1

# Construir imágenes
docker build -t pingpong-app ping-pong/
docker build -t logoutput-app log-output/

# Cargar en cluster
docker save pingpong-app logoutput-app > apps.tar
k3d image import apps.tar

# Aplicar manifiestos
kubectl apply -f manifests/

# Ver estado
kubectl get pods
kubectl get svc
```

---

## Conceptos Aprendidos

### Almacenamiento
- ✅ emptyDir volumes (compartido entre contenedores)
- ✅ PersistentVolume (PV)
- ✅ PersistentVolumeClaim (PVC)
- ✅ Local storage
- ✅ Volume lifecycle

### Networking
- ✅ ClusterIP Service (inter-pod communication)
- ✅ NodePort Service (acceso externo)
- ✅ Ingress (routing)
- ✅ Kubernetes DNS
- ✅ Service discovery
- ✅ Pod-to-pod HTTP communication

### Deployments & Pods
- ✅ Deployment
- ✅ ReplicaSets
- ✅ Pod lifecycle
- ✅ Container lifecycle

### Aplicaciones
- ✅ Express.js en Kubernetes
- ✅ Multi-container pods
- ✅ Multi-replica deployments
- ✅ HTML/CSS/JavaScript en Kubernetes

---

## Releases

Las siguientes releases están disponibles:

- [v1.11](https://github.com/Merkuryo/kubernetes-ejercicios/releases/tag/1.11) - Persistent Volumes
- [v1.12](https://github.com/Merkuryo/kubernetes-ejercicios/releases/tag/v1.12) - Image Caching
- [v1.13](https://github.com/Merkuryo/kubernetes-ejercicios/releases/tag/v1.13) - TODO App
- [v2.1](https://github.com/Merkuryo/kubernetes-ejercicios/releases/tag/v2.1) - Pod Communication

---

## Recursos

- [Documentación Oficial de Kubernetes](https://kubernetes.io/docs/)
- [DevOps with Kubernetes - Course Material](https://devopswithkubernetes.com/)
- [k3d Documentation](https://k3d.io/)
- [kubectl Cheat Sheet](https://kubernetes.io/docs/reference/kubectl/cheatsheet/)

---

## Licencia

Este repositorio contiene ejercicios del curso "DevOps with Kubernetes".
