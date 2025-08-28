# ---- Build Stage ----
FROM node:24 as builder

WORKDIR /app

# Copy package files first to leverage Docker cache. If you have a lockfile (package-lock.json or yarn.lock)
# include it here for more reproducible installs. This project currently has no package-lock, so npm will be used.
COPY package.json ./

# Install full dependencies (including dev deps) required for the build
RUN npm install

# Copy the rest of the source code
COPY . .

# Build the app (runs `vite build` via package.json)
RUN npm run build

# Remove development dependencies to prepare a smaller production image
RUN npm prune --production

# ---- Production Stage ----
FROM node:24-slim as runner

WORKDIR /app

ENV NODE_ENV=production

# Copy built output and production node_modules from builder
COPY --from=builder /app/build ./build
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules

# Expose the port your app listens on (adjust if the server uses another PORT)
EXPOSE 4200

# Run the production server. `node build` is used by the repo's `node-server` script.
CMD ["node", "build"]