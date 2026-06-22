import { spawnSync } from "node:child_process";
import { readText, runCheck } from "./lib/repo.mjs";

const args = parseArgs(process.argv.slice(2));
const full = Boolean(args.full);
const base = args.base ?? "origin/main";

const gateProfiles = [
  {
    name: "automation",
    matches: [
      /^docs\/automation\//u,
      /^tools\/scripts\//u,
      /^\.github\/workflows\//u,
      /^\.codex\/agents\//u,
      /^\.codex\/environments\//u,
      /^package\.json$/u,
      /^pnpm-workspace\.yaml$/u
    ],
    commands: [
      "node tools/scripts/lint.mjs",
      "node tools/scripts/automation-contract.mjs",
      "node tools/scripts/protected-files.mjs",
      "node tools/scripts/no-test-skip.mjs",
      "node tools/scripts/no-quality-threshold-lowering.mjs"
    ]
  },
  {
    name: "documentation",
    matches: [/^docs\//u, /^AGENTS\.md$/u, /^QUALITY_BAR\.md$/u, /^\.github\/PULL_REQUEST_TEMPLATE\.md$/u],
    commands: [
      "node tools/scripts/lint.mjs",
      "node tools/scripts/automation-contract.mjs",
      "node tools/scripts/protected-files.mjs",
      "node tools/scripts/no-test-skip.mjs",
      "node tools/scripts/no-quality-threshold-lowering.mjs"
    ]
  },
  {
    name: "sim-core",
    matches: [/^packages\/sim-core\//u],
    commands: [
      "node tools/scripts/lint.mjs",
      "node tools/scripts/typecheck.mjs",
      "node tools/scripts/unit-smoke.mjs",
      "node tools/scripts/sim-smoke.mjs",
      "node tools/scripts/save-load-smoke.mjs"
    ]
  },
  {
    name: "content",
    matches: [/^packages\/content-schema\//u, /^tools\/content-validator\//u, /^content\//u],
    commands: ["node tools/scripts/lint.mjs", "node tools/scripts/typecheck.mjs", "node tools/scripts/content-smoke.mjs"]
  },
  {
    name: "economy",
    matches: [/^tools\/economy-sim\//u],
    commands: [
      "node tools/scripts/lint.mjs",
      "node tools/scripts/typecheck.mjs",
      "node tools/scripts/economy-smoke.mjs",
      "node tools/scripts/sim-runner.mjs 7",
      "node tools/scripts/sim-runner.mjs 30"
    ]
  },
  {
    name: "npc",
    matches: [/^tools\/npc-sim\//u],
    commands: ["node tools/scripts/lint.mjs", "node tools/scripts/typecheck.mjs", "node tools/scripts/npc-smoke.mjs"]
  },
  {
    name: "browser",
    matches: [/^apps\/game-web\//u],
    commands: [
      "node tools/scripts/lint.mjs",
      "node tools/scripts/typecheck.mjs",
      "node tools/scripts/e2e-smoke.mjs",
      "node tools/scripts/first-3-days-smoke.mjs",
      "node tools/scripts/perf-smoke.mjs"
    ]
  },
  {
    name: "quality-eval",
    matches: [/^tools\/quality-eval\//u, /^quality-gates\.yml$/u],
    commands: ["node tools/scripts/lint.mjs", "node tools/scripts/typecheck.mjs", "node tools/scripts/quality-eval.mjs"]
  }
];

const protectedCommands = [
  "node tools/scripts/protected-files.mjs",
  "node tools/scripts/no-test-skip.mjs",
  "node tools/scripts/no-quality-threshold-lowering.mjs"
];

runCheck("automation gate plan can classify changed files", () => {
  const changedFiles = full ? [] : listChangedFiles();
  const fullReleaseCommands = extractRequiredCommands(readText("quality-gates.yml")).map(toApprovalFreeCommand);
  const selectedProfiles = full ? ["full-release"] : selectProfiles(changedFiles);
  const commands = full ? fullReleaseCommands : selectCommands(selectedProfiles);

  if (commands.length === 0) {
    throw new Error("Automation gate plan produced no commands.");
  }

  const result = {
    mode: full ? "full-release" : "touched-surface",
    base,
    changedFiles,
    profiles: selectedProfiles,
    commands
  };

  console.log(`AUTOMATION_GATE_PLAN ${JSON.stringify(result)}`);
});

function listChangedFiles() {
  if (typeof args.changed === "string" && args.changed.trim().length > 0) {
    return args.changed
      .split(",")
      .map((file) => normalizePath(file.trim()))
      .filter(Boolean);
  }

  const files = new Set();
  const diff = git(["diff", "--name-only", "--diff-filter=ACMRTUXB", `${base}...HEAD`], { allowFailure: true });
  const workingTreeDiff = git(["diff", "--name-only", "--diff-filter=ACMRTUXB"], { allowFailure: true });
  const untracked = git(["ls-files", "--others", "--exclude-standard"], { allowFailure: true });

  for (const output of [diff, workingTreeDiff, untracked]) {
    for (const file of output.stdout.split(/\r?\n/u).map(normalizePath).filter(Boolean)) {
      files.add(file);
    }
  }

  return [...files].sort();
}

function selectProfiles(changedFiles) {
  if (changedFiles.length === 0) {
    return ["automation"];
  }

  const profiles = new Set();
  const unknownFiles = [];

  for (const file of changedFiles) {
    const matchingProfiles = gateProfiles.filter((profile) => profile.matches.some((pattern) => pattern.test(file)));

    if (matchingProfiles.length === 0) {
      unknownFiles.push(file);
      continue;
    }

    for (const profile of matchingProfiles) {
      profiles.add(profile.name);
    }
  }

  if (unknownFiles.length > 0) {
    throw new Error(
      `Changed files do not map to a narrow gate profile: ${unknownFiles.join(", ")}. Run full release gates.`
    );
  }

  return [...profiles].sort();
}

function selectCommands(profileNames) {
  const commands = new Set();

  for (const profileName of profileNames) {
    const profile = gateProfiles.find((candidate) => candidate.name === profileName);
    if (!profile) {
      throw new Error(`Unknown gate profile: ${profileName}`);
    }

    for (const command of profile.commands) {
      commands.add(command);
    }
  }

  for (const command of protectedCommands) {
    commands.add(command);
  }

  return [...commands];
}

function extractRequiredCommands(gatesText) {
  const match = /^required_scripts:\s*$(?<body>[\s\S]*)/mu.exec(gatesText);
  if (!match?.groups?.body) {
    return [];
  }

  return [...match.groups.body.matchAll(/^\s*-\s+(pnpm [^\r\n]+)/gmu)].map((commandMatch) => commandMatch[1]);
}

function toApprovalFreeCommand(command) {
  const commandMap = {
    "pnpm lint": "node tools/scripts/lint.mjs",
    "pnpm typecheck": "node tools/scripts/typecheck.mjs",
    "pnpm test:unit": "node tools/scripts/unit-smoke.mjs",
    "pnpm test:sim": "node tools/scripts/sim-smoke.mjs",
    "pnpm test:npc": "node tools/scripts/npc-smoke.mjs",
    "pnpm test:economy": "node tools/scripts/economy-smoke.mjs",
    "pnpm test:content": "node tools/scripts/content-smoke.mjs",
    "pnpm test:save-load": "node tools/scripts/save-load-smoke.mjs",
    "pnpm test:e2e": "node tools/scripts/e2e-smoke.mjs",
    "pnpm test:first-3-days": "node tools/scripts/first-3-days-smoke.mjs",
    "pnpm test:perf-smoke": "node tools/scripts/perf-smoke.mjs",
    "pnpm sim:7days": "node tools/scripts/sim-runner.mjs 7",
    "pnpm sim:30days": "node tools/scripts/sim-runner.mjs 30",
    "pnpm eval:quality": "node tools/scripts/quality-eval.mjs",
    "pnpm check:protected-files": "node tools/scripts/protected-files.mjs",
    "pnpm check:automation-contract": "node tools/scripts/automation-contract.mjs",
    "pnpm check:no-test-skip": "node tools/scripts/no-test-skip.mjs",
    "pnpm check:no-quality-threshold-lowering": "node tools/scripts/no-quality-threshold-lowering.mjs"
  };

  const mapped = commandMap[command];
  if (!mapped) {
    throw new Error(`No approval-free command mapping for ${command}.`);
  }

  return mapped;
}

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

function normalizePath(file) {
  return file.replaceAll("\\", "/");
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
