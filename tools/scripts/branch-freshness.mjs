import { spawnSync } from "node:child_process";
import { runCheck } from "./lib/repo.mjs";

const allowDetached = process.argv.slice(2).includes("--allow-detached");
const readOnlyDetached = process.argv.slice(2).includes("--read-only-detached");

function git(args) {
  const result = spawnSync("git", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });

  return {
    ok: result.status === 0,
    stdout: result.stdout.trim(),
    stderr: result.stderr.trim()
  };
}

runCheck("current branch is compatible with freshness mode", () => {
  const branch = git(["branch", "--show-current"]);

  if (!branch.ok || branch.stdout.length === 0) {
    if (allowDetached && readOnlyDetached) {
      return;
    }

    throw new Error("HEAD must be on a named codex/ branch before unattended mutable work starts.");
  }

  if (allowDetached && readOnlyDetached && ["main", "master"].includes(branch.stdout)) {
    return;
  }

  if (!branch.stdout.startsWith("codex/")) {
    throw new Error(`Expected a codex/ branch, got ${branch.stdout}.`);
  }
});

runCheck("origin/main has been fetched locally", () => {
  const originMain = git(["rev-parse", "--verify", "origin/main"]);

  if (!originMain.ok) {
    throw new Error("Missing origin/main. Repair the automation local environment setup fetch first.");
  }
});

runCheck("HEAD contains the fetched origin/main commit", () => {
  const ancestor = git(["merge-base", "--is-ancestor", "origin/main", "HEAD"]);

  if (!ancestor.ok) {
    const current = git(["rev-parse", "--short", "HEAD"]);
    const originMain = git(["rev-parse", "--short", "origin/main"]);
    throw new Error(
      `HEAD ${current.stdout || "unknown"} does not include origin/main ${
        originMain.stdout || "unknown"
      }. Repair setup fetch if stale, then rebase or recreate the branch from origin/main.`
    );
  }
});
