FROM alpine:3.18

# Instalar curl y bash
RUN apk add --no-cache curl bash

# Crear directorio de trabajo
WORKDIR /scripts

# Copiar script
COPY scripts/generate-wiki-todo.sh .

# Hacer el script ejecutable
RUN chmod +x generate-wiki-todo.sh

# Por defecto, ejecutar el script
CMD ["./generate-wiki-todo.sh"]
