import { spawn } from "bun";

// Start the Elysia API server
const server = spawn(["bun", "--watch", "src/server/index.ts"], {
  cwd: import.meta.dir,
  stdio: ["inherit", "inherit", "inherit"],
  env: { ...process.env, NODE_ENV: "development" },
});

// Start Vite dev server (serves frontend, proxies /api to Elysia)
const vite = spawn(["bunx", "vite"], {
  cwd: import.meta.dir,
  stdio: ["inherit", "inherit", "inherit"],
  env: { ...process.env },
});

process.on("SIGINT", () => {
  server.kill();
  vite.kill();
  process.exit(0);
});

process.on("SIGTERM", () => {
  server.kill();
  vite.kill();
  process.exit(0);
});
