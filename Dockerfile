# ============================================
# Stage 1: Build the application
# ============================================
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY .npmrc ./

# Install dependencies (with timeout protection)
RUN npm ci --include=optional --legacy-peer-deps --no-audit --no-fund --prefer-offline || \
    npm ci --include=optional --legacy-peer-deps --no-audit --no-fund

# Copy source code
COPY . .

# Build the application
RUN npm run build

# ============================================
# Stage 2: Production image
# ============================================
FROM node:20-alpine

# Install serve globally
RUN npm install -g serve

# Set working directory
WORKDIR /app

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/serve.json ./dist/

# Set default port
ENV PORT=3000

# Expose port
EXPOSE $PORT

# Start the application with serve.json configuration
CMD ["sh", "-c", "serve -s dist -l $PORT -c serve.json"]