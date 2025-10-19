FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

ENV PORT=3000
ENV MESSAGE="Default message"
EXPOSE ${PORT}

CMD ["npm", "start"]
