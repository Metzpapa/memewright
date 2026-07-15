# Self-host the Memery playground + API.
#   docker build -t memery . && docker run -p 8787:8787 memery
FROM node:22-slim
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --omit=dev
COPY . .
EXPOSE 8787
CMD ["node", "server/http.js"]
