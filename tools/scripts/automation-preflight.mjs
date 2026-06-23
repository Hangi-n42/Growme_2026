import { spawnSync } from "node:child_process";
import { runCheck } from "./lib/repo.mjs";

const allowedRoles = new Set([
  "green-pr-merger",
  "issue-worker",
  "branch-preparer",
  "implementation-worker",
  "pr-updater",
  "quality-gate"
]);

const args = parseArgs(process.argv.slice(2));
const role = args.role ?? process.env.AUTOMATION_ROLE ?? "implementation-worker";
const githubWriteMode = args["github-write"] ?? defaultGitHubWriteMode(role);
const allowDirty = Boolean(args["allow-dirty"]);
const allowDetached = Boolean(args["allow-detached"]);

runCheck("automation role is known", () => {
  if (!allowedRoles.has(role)) {
    throw new Error(`Unknown automation role: ${role}. Expected one of ${[...allowedRoles].join(", ")}.`);
  }
});

runCheck("GitHub write access is non-interactive when required", () => {
  if (githubWriteMode === "skip") {
    return;
  }

  if (githubWriteMode !== "required") {
    throw new Error("--github-write must be either required or skip.");
  }

  if (!hasNonInteractiveGitHubAccess()) {
    throw new Error(
      "Missing non-interactive GitHub access. Set GITHUB_TOKEN, GH_TOKEN, or CODEX_GITHUB_CONNECTOR=enabled."
    );
  }
});

runCheck("worktree state is valid for automation role", () => {
  const branch = git(["branch", "--show-current"]).stdout;
  const head = git(["rev-parse", "--verify", "HEAD"]).stdout;
  const originMain = git(["rev-parse", "--verify", "origin/main"]).stdout;

  if (role === "quality-gate" || role === "green-pr-merger" || role === "issue-worker") {
    return;
  }

  if (role === "branch-preparer") {
    if (!originMain) {
      throw new Error("Missing origin/main. Repair the automation local environment setup fetch before branch preparation.");
    }

    if (!branch && head !== originMain) {
      throw new Error("Detached branch-preparer worktree must point at fetched origin/main.");
    }

    return;
  }

  if (!originMain) {
    throw new Error("Missing origin/main. Repair the automation local environment setup fetch first.");
  }

  if (!branch) {
    if (!allowDetached) {
      throw new Error("Detached HEAD requires --allow-detached connector-publish mode for implementation-worker and pr-updater.");
    }

    const detachedAncestor = git(["merge-base", "--is-ancestor", "origin/main", "HEAD"], { allowFailure: true });
    if (!detachedAncestor.ok) {
      throw new Error("Detached HEAD does not include setup-fetched origin/main.");
    }

    return;
  }

  if (!branch.startsWith("codex/")) {
    if (allowDetached && ["main", "master"].includes(branch)) {
      const connectorWorkspaceAncestor = git(["merge-base", "--is-ancestor", "origin/main", "HEAD"], {
        allowFailure: true
      });
      if (!connectorWorkspaceAncestor.ok) {
        throw new Error(`${branch} workspace does not include setup-fetched origin/main.`);
      }

      return;
    }

    throw new Error(`Expected a codex/ branch, got ${branch}.`);
  }

  const ancestor = git(["merge-base", "--is-ancestor", "origin/main", "HEAD"], { allowFailure: true });
  if (!ancestor.ok) {
    throw new Error("HEAD does not include fetched origin/main.");
  }
});

runCheck("worktree cleanliness matches preflight mode", () => {
  if (allowDirty || role === "quality-gate") {
    return;
  }

  const status = git(["status", "--porcelain"]).stdout;
  if (status.length > 0) {
    throw new Error("Worktree must be clean before unattended mutable work starts. Pass --allow-dirty for post-edit checks.");
  }
});

function parseArgs(argv) {
  const parsed = {};

  for (const arg of argv) {
    if (arg === "--") {
      continue;
    }

    if (!arg.startsWith("--")) {
      continue;
    }

    const [rawKey, rawValue] = arg.slice(2).split("=", 2);
    parsed[rawKey] = rawValue ?? true;
  }

  return parsed;
}

function defaultGitHubWriteMode(selectedRole) {
  return ["green-pr-merger", "issue-worker", "branch-preparer", "pr-updater"].includes(selectedRole)
    ? "required"
    : "skip";
}

function hasNonInteractiveGitHubAccess() {
  return Boolean(
    process.env.GITHUB_TOKEN ||
      process.env.GH_TOKEN ||
      /^enabled|true|1$/iu.test(process.env.CODEX_GITHUB_CONNECTOR ?? "")
  );
}

function git(args, options = {}) {
  const result = spawnSync("git", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });

  const output = {
    ok: result.status === 0,
    stdout: result.stdout.trim(),
    stderr: result.stderr.trim()
  };

  if (!output.ok && !options.allowFailure) {
    throw new Error(`git ${args.join(" ")} failed: ${output.stderr || "no stderr"}`);
  }

  return output;
}
