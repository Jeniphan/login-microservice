FROM node:20-bullseye-slim AS builder
WORKDIR /app

# Enable Corepack and activate pnpm (project contains pnpm-lock.yaml)
RUN corepack enable && corepack prepare pnpm@latest --activate

# Install dependencies only (use lockfile for reproducible installs)
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy source and build
COPY . .
RUN pnpm run build

# Production image
FROM node:20-bullseye-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# Copy build output and production node_modules from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000
CMD ["node", "dist/main.js"]