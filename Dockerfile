
# Stage 1: install deps and build
FROM node:latest AS builder

WORKDIR /usr/src/app

# Copy package manifests first for better caching
COPY package.json package-lock.json* yarn.lock* ./

# Use npm (no lockfile detected in repo snapshot). If you prefer yarn, adjust here.
RUN npm ci --silent || npm install --silent

# Copy the rest of the sources
# Copy source files
COPY . .

# If you have a .env file with build-time secrets (MINIO_*, etc.), copy it so Vite's static env plugin
# (virtual:env/static/private) can expose the variables during the build.
# This will fail silently if .env is not present in the build context.
ARG COPY_ENV=true
RUN if [ "$COPY_ENV" = "true" ] && [ -f .env ]; then echo "Copying .env for build"; else echo ".env not found or copy disabled"; fi

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
