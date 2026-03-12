FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Build the Vite frontend  
FROM base AS builder
COPY --from=deps /app/node_modules node_modules
COPY . .
RUN bun run build

# Production image
FROM base
COPY --from=deps /app/node_modules node_modules
COPY --from=builder /app/dist dist
COPY src src
COPY package.json bun.lock ./

EXPOSE 3000

CMD ["bun", "src/server/index.ts"]
