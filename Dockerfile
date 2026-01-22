FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the app
RUN npm run build

# Production stage
FROM node:18-alpine

# Install serve to run the built app
RUN npm install -g serve

# Set working directory
WORKDIR /app

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Expose port 8080 (Cloud Run default)
EXPOSE 8080

# Start the app on the PORT environment variable (Cloud Run requirement)
# Bind to 0.0.0.0 to accept external connections
CMD serve -s dist -l ${PORT:-8080} --no-clipboard
