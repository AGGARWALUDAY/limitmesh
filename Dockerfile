# Use Node.js 24 Alpine as the base image
FROM node:24-alpine

# Set production environment
ENV NODE_ENV=production

# Set working directory inside the container
WORKDIR /app

# Copy package files first
COPY package*.json ./

# Install production dependencies
RUN npm ci --omit=dev

# Copy application source code
COPY --chown=node:node . .

# Run application as a non-root user
USER node

# Application port
EXPOSE 3000

# Start LimitMesh
CMD ["node", "server.js"]