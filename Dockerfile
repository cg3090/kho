# syntax=docker/dockerfile:1
FROM node:20-alpine

WORKDIR /app

# Install system deps needed by Prisma/native addons
RUN apk add --no-cache libc6-compat

# Copy package files first for layer caching
COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY database_setup.sql ./
COPY tsconfig.json ./
COPY vite.config.ts ./
COPY server.ts ./
COPY src ./src
COPY index.html ./
COPY assets ./assets
COPY public ./public

# Install deps & generate Prisma Client
RUN npm ci --ignore-scripts && \
    npx prisma generate && \
    npm cache clean --force

# Bundle server.ts -> server.js with esbuild (production runtime)
RUN npx esbuild server.ts --bundle --platform=node --format=esm --outfile=server.js --log-level=warning

# Build frontend with Vite
RUN npm run build

# Runtime env
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Run the bundled server
CMD ["node", "server.js"]