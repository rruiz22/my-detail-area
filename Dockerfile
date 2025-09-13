# Use Node.js 18 LTS as base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY .npmrc ./

# Clean install with optional dependencies for rollup
RUN npm ci --include=optional --legacy-peer-deps

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Install a simple static file server
RUN npm install -g serve

# Set default port
ENV PORT=3000

# Expose port
EXPOSE $PORT

# Start the application
CMD ["sh", "-c", "serve -s dist -l $PORT"]