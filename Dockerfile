FROM node:18-alpine AS builder

WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build:all

FROM node:18-alpine AS production

WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package*.json ./

RUN npm install --only=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules