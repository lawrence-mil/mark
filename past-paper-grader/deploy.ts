import { $ } from "bun";

const BOLD = "\x1b[1m";
const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";

const step = (s: string) => console.log(`\n${CYAN}▸${RESET} ${BOLD}${s}${RESET}`);
const ok = (s: string) => console.log(`  ${GREEN}✓${RESET} ${s}`);
const warn = (s: string) => console.log(`  ${YELLOW}!${RESET} ${s}`);
const die = (s: string) => {
  console.log(`  ${RED}✗${RESET} ${s}`);
  process.exit(1);
};

const quiet = { quiet: true } as const;
const safe = { quiet: true, nothrow: true } as const;

// ─── Env leak guard ──────────────────────────────────────────
step("Checking for env leaks...");

const tracked = (await $`git ls-files --cached .env .env.local .env.production.local .env.development.local`.quiet().nothrow())
  .stdout.toString().trim();

if (tracked) {
  die(`Env file tracked by git: ${tracked}\n  Run: git rm --cached ${tracked}`);
}

// Double-check ignore files exist
const { existsSync } = await import("fs");
if (!existsSync(".railwayignore")) die("Missing .railwayignore — env files could leak to Railway");
if (!existsSync(".vercelignore")) die("Missing .vercelignore — env files could leak to Vercel");

ok("No env files in git, ignore files in place");

// ─── Railway ─────────────────────────────────────────────────
step("Checking Railway...");

const rwho = await $`railway whoami`.quiet().nothrow();
if (rwho.exitCode !== 0) {
  warn("Not logged into Railway — opening login...");
  const login = await $`railway login`.nothrow();
  if (login.exitCode !== 0) die("Railway login failed");
}
ok("Logged in");

const rstatus = await $`railway status`.quiet().nothrow();
const rout = rstatus.stdout.toString();
if (rstatus.exitCode !== 0 || rout.includes("No linked project")) {
  warn("No Railway project linked — opening project picker...");
  const link = await $`railway link`.nothrow();
  if (link.exitCode !== 0) die("Railway link failed");
}
ok("Project linked");

step("Deploying backend → Railway...");
await $`railway up --detach`;
ok("Backend deployed");

// ─── Vercel ──────────────────────────────────────────────────
step("Checking Vercel...");

const vwho = await $`vercel whoami`.quiet().nothrow();
if (vwho.exitCode !== 0) {
  warn("Not logged into Vercel — opening login...");
  const login = await $`vercel login`.nothrow();
  if (login.exitCode !== 0) die("Vercel login failed");
}
ok("Logged in");

step("Deploying frontend → Vercel...");
// vercel --prod handles first-time project setup interactively
await $`vercel --prod`;
ok("Frontend deployed");

// ─── Post-deploy check ──────────────────────────────────────
step("Post-deploy checks...");

const venv = await $`vercel env ls`.quiet().nothrow();
if (!venv.stdout.toString().includes("VITE_API_URL")) {
  warn(`VITE_API_URL is not set in Vercel`);
  console.log(`  ${DIM}Your frontend defaults to /api which won't work in prod.${RESET}`);
  console.log(`  ${DIM}Set it to your Railway URL:${RESET}`);
  console.log(`    vercel env add VITE_API_URL`);
  console.log(`  ${DIM}Then redeploy:${RESET} bun deploy`);
} else {
  ok("VITE_API_URL is set");
}

console.log(`\n${GREEN}▸${RESET} ${BOLD}Deploy complete${RESET}\n`);
