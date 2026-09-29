# Dockerfile for Unified Fullstack Chat App
FROM node:20-alpine AS builder

WORKDIR /app

# Sao chép file cấu hình package
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Cài đặt toàn bộ dependencies
RUN npm run build || (npm install --prefix backend && npm install --prefix frontend)

# Sao chép toàn bộ mã nguồn
COPY . .

# Build frontend production bundle
RUN cd frontend && npm run build

# Stage 2: Runtime
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/backend ./backend
COPY --from=builder /app/frontend/dist ./frontend/dist

EXPOSE 5000

CMD ["node", "backend/src/app.js"]
