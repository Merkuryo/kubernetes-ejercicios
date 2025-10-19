#!/bin/bash
set -e

# Script para crear un TODO con un artículo aleatorio de Wikipedia
# Se ejecuta cada hora como CronJob

echo "[$(date)] Starting Wikipedia TODO generator"

# Validar que BACKEND_URL y WIKIPEDIA_API están configuradas
if [ -z "$BACKEND_URL" ]; then
    echo "ERROR: BACKEND_URL environment variable not set"
    exit 1
fi

echo "[$(date)] Backend URL: $BACKEND_URL"

# Obtener URL aleatorio de Wikipedia vía redirect
# La API de Wikipedia devuelve un redirect a un artículo aleatorio
# Usamos -L para seguir el redirect y -i para ver headers
echo "[$(date)] Fetching random Wikipedia article..."

# Seguir el redirect y obtener la URL final
WIKI_URL=$(curl -s -L -w "%{redirect_url}\n" -o /dev/null "https://en.wikipedia.org/wiki/Special:Random")

# Si no funciona, intentar con la respuesta HTTP
if [ -z "$WIKI_URL" ] || [ "$WIKI_URL" == "-" ]; then
    echo "[$(date)] Trying alternative method to get Wikipedia URL..."
    # Alternativa: usar -I para obtener headers y grep el Location
    WIKI_URL=$(curl -s -I "https://en.wikipedia.org/wiki/Special:Random" | grep -i "^location:" | cut -d' ' -f2- | tr -d '\r')
fi

# Limpiar URL (remover espacios en blanco)
WIKI_URL=$(echo "$WIKI_URL" | xargs)

if [ -z "$WIKI_URL" ]; then
    echo "ERROR: Could not fetch Wikipedia URL"
    exit 1
fi

echo "[$(date)] Got Wikipedia URL: $WIKI_URL"

# Extraer el título del artículo de la URL
# URL típica: https://en.wikipedia.org/wiki/Article_Name
ARTICLE_TITLE=$(basename "$WIKI_URL" | sed 's/_/ /g')

echo "[$(date)] Article title: $ARTICLE_TITLE"

# Crear TODO en el backend
TODO_CONTENT="Read $WIKI_URL"

echo "[$(date)] Creating TODO: $TODO_CONTENT"

# Realizar POST request al backend
RESPONSE=$(curl -s -X POST "$BACKEND_URL/todos" \
  -H "Content-Type: application/json" \
  -d "{\"content\":\"$TODO_CONTENT\"}")

echo "[$(date)] Response from backend: $RESPONSE"

# Verificar que se creó correctamente
if echo "$RESPONSE" | grep -q '"id"'; then
    echo "[$(date)] ✅ TODO created successfully"
    exit 0
else
    echo "[$(date)] ❌ Failed to create TODO"
    echo "Response: $RESPONSE"
    exit 1
fi
