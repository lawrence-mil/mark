FROM oven/bun:1

WORKDIR /app

# Install dependencies
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Build the Vite frontend
RUN bun run build

# Expose the port that the app runs on
EXPOSE 3000

# Start the application
CMD ["bun", "src/server/index.ts"]
