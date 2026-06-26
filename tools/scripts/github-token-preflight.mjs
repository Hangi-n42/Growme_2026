import { spawnSync } from "node:child_process";
import { runCheck } from "./lib/repo.mjs";

const repository = "Hangi-n42/Growme_2026";

runCheck("GH_TOKEN_PRESENT", () => {
  if (!process.env.GH_TOKEN && !process.env.GITHUB_TOKEN) {
    throw new Error("Missing GH_TOKEN or GITHUB_TOKEN.");
  }
});

runCheck("gh api user succeeds with token", () => {
  gh(["api", "user", "--jq", ".login"]);
});

runCheck("gh api repository succeeds with token", () => {
  gh(["api", `repos/${repository}`, "--jq", ".full_name"]);
});

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
    throw new Error(result.stderr.trim() || `gh ${args.join(" ")} failed`);
  }
}
