
# Stage 1: install deps and build
FROM node:latest AS builder

WORKDIR /usr/src/app

# Copy package manifests first for better caching
COPY package.json package-lock.json* yarn.lock* ./

# Use npm (no lockfile detected in repo snapshot). If you prefer yarn, adjust here.
RUN npm ci --silent || npm install --silent

# Copy the rest of the sources
COPY . .

# Build the app (this project uses Vite / SvelteKit)
RUN npm run build

# Stage 2: production image
FROM node:latest AS runner

WORKDIR /usr/src/app

# Copy only the production artifacts and necessary files
COPY --from=builder /usr/src/app/build ./build
COPY --from=builder /usr/src/app/package.json ./package.json

# Install production dependencies only
RUN npm ci --omit=dev --silent || npm install --omit=dev --silent

# Expose default SvelteKit adapter-node port
EXPOSE 3000

# Default environment
ENV NODE_ENV=production

# Start the node server produced by the adapter-node (package.json "node-server": "node build")
CMD ["node", "build"]
