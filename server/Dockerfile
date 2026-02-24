FROM node:20-alpine AS builder

WORKDIR /app

# Build deps for better-sqlite3 native compilation
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci --only=production

# ---- runtime ----
FROM node:20-alpine

WORKDIR /app

# libstdc++ needed by better-sqlite3 at runtime
RUN apk add --no-cache libstdc++

COPY --from=builder /app/node_modules ./node_modules
COPY src ./src
COPY database ./database

RUN mkdir -p /app/logs /app/data

EXPOSE 3000

ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0 \
    DB_PATH=/app/data/card-game.db

# Init DB then start server
CMD ["sh", "-c", "node database/init.js && node src/index.js"]
