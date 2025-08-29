# ---------- Build Stage ----------
  FROM node:18-alpine AS builder
  WORKDIR /app
  
  # Install dependencies (including dev for TypeScript)
  COPY package*.json ./
  RUN npm ci
  
  # Copy source and build
  COPY . .
  RUN npm run build
  
  # ---------- Production Stage ----------
  FROM node:18-alpine AS production
  WORKDIR /app
  
  # Install only production deps
  COPY package*.json ./
  RUN npm ci --only=production
  
  # Copy compiled output from builder
  COPY --from=builder /app/dist ./dist
  
  # Expose app port (adjust if not 3000)
  EXPOSE 3000
  
  # Run compiled server
  CMD ["node", "dist/server.js"]
  