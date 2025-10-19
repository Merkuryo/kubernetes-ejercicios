# Log Output with Shared Volume

Aplicación dividida en dos contenedores que comparten un volumen:

## Writer Container
- Genera un string aleatorio al inicio
- Escribe el string y timestamp en un archivo cada 5 segundos
- Comparte el archivo a través de un volumen emptyDir

## Reader Container
- Servidor HTTP que lee el archivo compartido
- Expone el contenido a través de un endpoint GET
- Comparte el mismo volumen que el writer

## Kubernetes Setup
- Un pod con dos contenedores
- Volumen emptyDir compartido
- Service tipo ClusterIP
- Ingress para acceso externo

## Uso
```bash
kubectl apply -f manifests/

# Acceder a los logs:
# http://localhost:8081
```