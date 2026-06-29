import { spawnSync } from "node:child_process";
import { runCheck } from "./lib/repo.mjs";

const repository = "Hangi-n42/Growme_2026";
const hasToken = Boolean(process.env.GH_TOKEN || process.env.GITHUB_TOKEN);

runCheck("GH_TOKEN_PRESENT", () => {
  if (!hasToken) {
    throw new Error("BLOCKED_GITHUB_ACCESS: Missing GH_TOKEN or GITHUB_TOKEN.");
  }
});

if (hasToken) {
  runCheck("external runner can reach gh api user", () => {
    gh(["api", "user", "--jq", ".login"]);
  });

  runCheck("external runner can reach repository API", () => {
    gh(["api", `repos/${repository}`, "--jq", ".full_name"]);
  });
}

function gh(args) {
  const result = spawnSync("gh", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      GIT_TERMINAL_PROMPT: "0"
    }
  });

  if (result.status !== 0) {
    const stderr = result.stderr.trim();
    throw new Error(`${classifyGhFailure(stderr)}: ${stderr || `gh ${args.join(" ")} failed`}`);
  }
}

function classifyGhFailure(stderr) {
  const message = stderr.toLowerCase();

  if (
    /could not resolve host|failed to connect|connection|network|socket|timed? ?out|timeout|econn|eai_again|proxy|tls|connectex|permission denied|access is denied|operation not permitted|eperm|sandbox/u.test(
      message
    )
  ) {
    return "BLOCKED_NETWORK_EGRESS";
  }

  return "BLOCKED_GITHUB_ACCESS";
}
