# Use lightweight official Node.js image
FROM node:20-alpine

# Set working directory inside container
WORKDIR /usr/src/app

# Copy package manifests first to leverage Docker layer caching
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy application files (including public/ folder and backend files)
COPY . .

# Expose port 3000 for CapRover routing
EXPOSE 3000

ENV PORT=3000
ENV NODE_ENV=production

# Start your Node.js server
CMD ["node", "server.js"]
