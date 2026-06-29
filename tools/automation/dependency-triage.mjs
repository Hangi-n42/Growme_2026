import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const args = parseArgs(process.argv.slice(2));
const repository = args.repo ?? process.env.GROWME_REPOSITORY ?? "Hangi-n42/Growme_2026";
const milestoneTitle = args.milestone ?? "v0.1 Solo NPC Economy Slice";
const dryRun = args.apply !== true;
const staleWorkingHours = Number(args["stale-hours"] ?? 48);
const maxUnlocks = Number(args["max-unlocks"] ?? 3);

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}

function main() {
  preflight();

  const milestone = findMilestone(milestoneTitle);
  const milestoneIssues = listMilestoneIssues(milestone.number);
  const dependencyIssues = fetchReferencedDependencyIssues(milestoneIssues);
  const openPrs = listOpenPrs();
  const plan = createDependencyTriagePlan({
    issues: [...milestoneIssues, ...dependencyIssues],
    milestoneIssueNumbers: milestoneIssues.map((issue) => issue.number),
    openPrs,
    now: new Date(),
    staleWorkingHours,
    maxUnlocks
  });
  const applied = dryRun ? emptyAppliedSummary() : applyDependencyTriagePlan(plan);

  report({
    status: dryRun ? "DEPENDENCY_TRIAGE_DRY_RUN" : "DEPENDENCY_TRIAGE_APPLIED",
    dryRun,
    repository,
    milestone: milestone.title,
    closedIssuesVerified: plan.closedIssuesVerified,
    labelsToRemove: plan.labelsToRemove,
    labelsRemoved: applied.labelsRemoved,
    codexWorkingStaleCandidates: plan.codexWorkingStaleCandidates,
    blockedIssuesInspected: plan.blockedIssuesInspected,
    newlyCodexReadyPlanned: plan.newlyCodexReadyPlanned,
    newlyCodexReadyApplied: applied.newlyCodexReadyApplied,
    stillBlockedIssues: plan.stillBlockedIssues,
    recommendedNextImplementationIssue: plan.recommendedNextImplementationIssue,
    outcome: plan.outcome
  });
}

function preflight() {
  if (!process.env.GH_TOKEN && !process.env.GITHUB_TOKEN) {
    throw new Error("BLOCKED_GITHUB_ACCESS: Missing GH_TOKEN or GITHUB_TOKEN.");
  }

  gh(["api", "user", "--jq", ".login"]);
  gh(["api", `repos/${repository}`, "--jq", ".full_name"]);
}

function findMilestone(title) {
  const milestones = pagedGhJson(`repos/${repository}/milestones?state=all&per_page=100`);
  const milestone = milestones.find((candidate) => candidate.title === title);

  if (!milestone) {
    throw new Error(`NO_ACTION_MILESTONE_NOT_FOUND: ${title}`);
  }

  return milestone;
}

function listMilestoneIssues(milestoneNumber) {
  return pagedGhJson(`repos/${repository}/issues?state=all&milestone=${milestoneNumber}&per_page=100`).filter(
    (issue) => !issue.pull_request
  );
}

function fetchReferencedDependencyIssues(issues) {
  const knownIssueNumbers = new Set(issues.map((issue) => issue.number));
  const dependencyNumbers = new Set();

  for (const issue of issues) {
    const parsed = parseDependencyReferences(issue.body ?? "");
    for (const number of parsed.issueNumbers) {
      if (!knownIssueNumbers.has(number)) {
        dependencyNumbers.add(number);
      }
    }
  }

  return [...dependencyNumbers].map((number) => ghJson(["api", `repos/${repository}/issues/${number}`]));
}

function listOpenPrs() {
  return ghJson([
    "pr",
    "list",
    "--repo",
    repository,
    "--state",
    "open",
    "--limit",
    "100",
    "--json",
    "number,title,body,headRefName,url,closingIssuesReferences"
  ]);
}

export function createDependencyTriagePlan({
  issues,
  milestoneIssueNumbers,
  openPrs,
  now,
  staleWorkingHours: staleHours = 48,
  maxUnlocks: unlockLimit = 3
}) {
  const milestoneIssueSet = new Set(milestoneIssueNumbers ?? issues.map((issue) => issue.number));
  const milestoneIssues = issues.filter((issue) => milestoneIssueSet.has(issue.number));
  const issueByNumber = new Map(issues.map((issue) => [issue.number, issue]));
  const closedVsIssues = milestoneIssues.filter((issue) => issue.state === "closed" && isVsIssue(issue));
  const labelsToRemove = closedVsIssues
    .filter((issue) => hasLabel(issue, "codex-working"))
    .map((issue) => issueLabelSummary(issue, "codex-working"));
  const codexWorkingStaleCandidates = milestoneIssues
    .filter((issue) => issue.state === "open" && hasLabel(issue, "codex-working"))
    .filter((issue) => !openPrs.some((pr) => prMentionsIssue(pr, issue)))
    .map((issue) => {
      const ageHours = Math.floor((now.getTime() - new Date(issue.updated_at).getTime()) / 36_000) / 100;
      return {
        ...issueSummary(issue),
        updatedAt: issue.updated_at,
        staleHours: ageHours,
        staleThresholdHours: staleHours
      };
    })
    .filter((issue) => issue.staleHours >= staleHours);
  const openFeatureIssues = milestoneIssues.filter(
    (issue) => issue.state === "open" && isVsIssue(issue) && !hasLabel(issue, "release-candidate")
  );
  const blockedIssues = milestoneIssues.filter((issue) => issue.state === "open" && hasLabel(issue, "codex-blocked"));
  const blockedIssuesInspected = [];
  const stillBlockedIssues = [];
  const unlockCandidates = [];

  for (const issue of blockedIssues) {
    const parsedDependencies = parseDependencyReferences(issue.body ?? "");
    const dependencyStates = parsedDependencies.issueNumbers.map((number) => {
      const dependencyIssue = issueByNumber.get(number);
      return {
        number,
        title: dependencyIssue?.title ?? null,
        state: dependencyIssue?.state ?? "unknown",
        url: dependencyIssue?.html_url ?? null
      };
    });
    const openDependencies = dependencyStates.filter((dependency) => dependency.state !== "closed");
    const isReleaseCandidate = hasLabel(issue, "release-candidate");
    const releaseCandidateBlocked = isReleaseCandidate && openFeatureIssues.some((featureIssue) => featureIssue.number !== issue.number);
    const inspection = {
      ...issueSummary(issue),
      dependencies: dependencyStates,
      ambiguousDependencies: parsedDependencies.ambiguous,
      explicitNoDependencies: parsedDependencies.explicitNone,
      openDependencies
    };

    blockedIssuesInspected.push(inspection);

    if (parsedDependencies.ambiguous) {
      stillBlockedIssues.push({
        ...issueSummary(issue),
        reason: "ambiguous dependency list",
        openDependencies
      });
      continue;
    }

    if (openDependencies.length > 0) {
      stillBlockedIssues.push({
        ...issueSummary(issue),
        reason: "open dependencies remain",
        openDependencies
      });
      continue;
    }

    if (releaseCandidateBlocked) {
      stillBlockedIssues.push({
        ...issueSummary(issue),
        reason: "release-candidate waits for all v0.1 feature issues",
        openDependencies: openFeatureIssues.filter((featureIssue) => featureIssue.number !== issue.number).map(issueSummary)
      });
      continue;
    }

    unlockCandidates.push({
      ...issueSummary(issue),
      dependencies: dependencyStates,
      priority: dependencyPriority(issue)
    });
  }

  const newlyCodexReadyPlanned = unlockCandidates
    .sort((left, right) => left.priority - right.priority || vsNumber(left.title) - vsNumber(right.title) || left.number - right.number)
    .slice(0, unlockLimit);
  const recommendedNextImplementationIssue = findRecommendedNextIssue(milestoneIssues, newlyCodexReadyPlanned);

  return {
    outcome: buildOutcome({ labelsToRemove, newlyCodexReadyPlanned, codexWorkingStaleCandidates }),
    closedIssuesVerified: closedVsIssues.map(issueSummary),
    labelsToRemove,
    codexWorkingStaleCandidates,
    blockedIssuesInspected,
    newlyCodexReadyPlanned,
    stillBlockedIssues,
    recommendedNextImplementationIssue
  };
}

function applyDependencyTriagePlan(plan) {
  const labelsRemoved = [];
  const newlyCodexReadyApplied = [];

  for (const item of plan.labelsToRemove) {
    removeIssueLabel(item.number, item.label);
    labelsRemoved.push(item);
  }

  for (const item of plan.newlyCodexReadyPlanned) {
    removeIssueLabel(item.number, "codex-blocked");
    addIssueLabels(item.number, ["codex-ready"]);
    newlyCodexReadyApplied.push(item);
  }

  return { labelsRemoved, newlyCodexReadyApplied };
}

function emptyAppliedSummary() {
  return {
    labelsRemoved: [],
    newlyCodexReadyApplied: []
  };
}

function removeIssueLabel(issueNumber, label) {
  const result = gh(["api", `repos/${repository}/issues/${issueNumber}/labels/${encodeURIComponent(label)}`, "-X", "DELETE"], {
    allowFailure: true
  });

  if (!result.ok && !/404|not found/iu.test(result.stderr)) {
    throw new Error(`BLOCKED_GITHUB_WRITE: Failed to remove ${label} from #${issueNumber}: ${result.stderr}`);
  }
}

function addIssueLabels(issueNumber, labels) {
  const commandArgs = ["api", `repos/${repository}/issues/${issueNumber}/labels`, "-X", "POST"];

  for (const label of labels) {
    commandArgs.push("-f", `labels[]=${label}`);
  }

  gh(commandArgs);
}

export function parseDependencyReferences(body) {
  const lines = String(body ?? "").split(/\r?\n/u);
  const issueNumbers = new Set();
  let sawDependencySection = false;
  let explicitNone = false;
  let captureSection = false;
  let capturedDependencyLineWithoutReference = false;

  for (const line of lines) {
    const trimmed = line.trim();
    const startsDependencySection = /\b(depends on|dependencies|dependency list|blocked by|blocking dependencies|required dependencies|requires)\b/iu.test(
      trimmed
    );
    const isHeading = /^#{1,6}\s+/u.test(trimmed);
    const isBullet = /^[-*+]\s+/u.test(trimmed) || /^\d+[.)]\s+/u.test(trimmed);

    if (startsDependencySection) {
      sawDependencySection = true;
      captureSection = true;
      collectIssueNumbers(trimmed, issueNumbers);
      if (isExplicitNoDependencyLine(trimmed)) {
        explicitNone = true;
      }
      if (extractIssueNumbers(trimmed).length === 0 && !isExplicitNoDependencyLine(trimmed)) {
        capturedDependencyLineWithoutReference = true;
      }
      continue;
    }

    if (!captureSection) {
      continue;
    }

    if (isHeading || trimmed === "") {
      captureSection = false;
      continue;
    }

    if (!isBullet && extractIssueNumbers(trimmed).length === 0) {
      captureSection = false;
      continue;
    }

    collectIssueNumbers(trimmed, issueNumbers);
    if (isExplicitNoDependencyLine(trimmed)) {
      explicitNone = true;
    }
  }

  return {
    issueNumbers: [...issueNumbers].sort((left, right) => left - right),
    ambiguous: sawDependencySection && issueNumbers.size === 0 && !explicitNone && capturedDependencyLineWithoutReference,
    explicitNone
  };
}

function collectIssueNumbers(text, issueNumbers) {
  for (const number of extractIssueNumbers(text)) {
    issueNumbers.add(number);
  }
}

function extractIssueNumbers(text) {
  return [...String(text ?? "").matchAll(/#(\d+)/gu)].map((match) => Number(match[1])).filter(Number.isInteger);
}

function isExplicitNoDependencyLine(line) {
  return /\b(no dependencies|none|n\/a|not applicable|없음)\b/iu.test(line);
}

function findRecommendedNextIssue(milestoneIssues, newlyReadyIssues) {
  const virtualReadyNumbers = new Set(newlyReadyIssues.map((issue) => issue.number));
  const eligible = milestoneIssues
    .filter((issue) => issue.state === "open" && isVsIssue(issue))
    .filter((issue) => !hasLabel(issue, "codex-working"))
    .filter((issue) => !hasLabel(issue, "codex-blocked") || virtualReadyNumbers.has(issue.number))
    .filter((issue) => !hasLabel(issue, "release-candidate"))
    .filter((issue) => hasLabel(issue, "codex-ready") || virtualReadyNumbers.has(issue.number))
    .sort((left, right) => vsNumber(left.title) - vsNumber(right.title) || left.number - right.number);

  return eligible.length > 0 ? issueSummary(eligible[0]) : null;
}

function buildOutcome({ labelsToRemove, newlyCodexReadyPlanned, codexWorkingStaleCandidates }) {
  if (labelsToRemove.length === 0 && newlyCodexReadyPlanned.length === 0 && codexWorkingStaleCandidates.length === 0) {
    return "NO_ACTION_DEPENDENCY_TRIAGE_CLEAN";
  }

  return "DEPENDENCY_TRIAGE_CHANGES_AVAILABLE";
}

function issueLabelSummary(issue, label) {
  return {
    ...issueSummary(issue),
    label
  };
}

function issueSummary(issue) {
  return {
    number: issue.number,
    title: issue.title,
    url: issue.html_url ?? issue.url ?? null
  };
}

function hasLabel(issue, labelName) {
  return (issue.labels ?? []).some((label) => (typeof label === "string" ? label : label.name) === labelName);
}

function isVsIssue(issue) {
  return /^VS-\d+/iu.test(issue.title ?? "");
}

function vsNumber(title) {
  return Number(/^VS-(\d+)/iu.exec(title ?? "")?.[1] ?? Number.MAX_SAFE_INTEGER);
}

function prMentionsIssue(pr, issue) {
  const issueNumbers = new Set([
    ...extractIssueNumbers(pr.body ?? ""),
    ...((pr.closingIssuesReferences ?? []).map((reference) => reference.number).filter(Number.isInteger))
  ]);
  const vsId = /^VS-\d+/iu.exec(issue.title ?? "")?.[0]?.toLowerCase();
  const prText = `${pr.title ?? ""} ${pr.headRefName ?? ""}`.toLowerCase();

  return issueNumbers.has(issue.number) || Boolean(vsId && prText.includes(vsId));
}

function dependencyPriority(issue) {
  const text = `${issue.title ?? ""} ${issue.body ?? ""} ${labelNames(issue).join(" ")}`.toLowerCase();
  const priorityRules = [
    /sim-core|sim core|simulation|foundation/u,
    /inventory|currency/u,
    /save|load|persistence/u,
    /farming|crop/u,
    /content schema|npc data|content/u,
    /npc schedule|schedule|dialogue|relationship/u,
    /economy|contract|shop|pricing/u,
    /action zone|resource node|gather/u,
    /phaser|browser ui|client|ui/u,
    /e2e|quality|playwright|qa/u
  ];
  const matchedIndex = priorityRules.findIndex((rule) => rule.test(text));

  return matchedIndex === -1 ? priorityRules.length : matchedIndex;
}

function labelNames(issue) {
  return (issue.labels ?? []).map((label) => (typeof label === "string" ? label : label.name));
}

function pagedGhJson(endpoint) {
  const results = [];
  let page = 1;

  while (true) {
    const separator = endpoint.includes("?") ? "&" : "?";
    const pageResults = ghJson(["api", `${endpoint}${separator}page=${page}`]);

    if (!Array.isArray(pageResults)) {
      throw new Error(`Expected paged GitHub API response to be an array for ${endpoint}.`);
    }

    results.push(...pageResults);

    if (pageResults.length < 100) {
      break;
    }

    page += 1;
  }

  return results;
}

function report(summary) {
  console.log(summary.status);
  console.log(JSON.stringify(summary, null, 2));
}

function ghJson(commandArgs) {
  const result = gh(commandArgs);
  try {
    return JSON.parse(result.stdout || "null");
  } catch (error) {
    throw new Error(`Failed to parse JSON from gh ${commandArgs.join(" ")}: ${error.message}`);
  }
}

function gh(commandArgs, options = {}) {
  const result = spawnSync("gh", commandArgs, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      GIT_TERMINAL_PROMPT: "0"
    }
  });
  const output = {
    ok: result.status === 0,
    stdout: result.stdout.trim(),
    stderr: result.stderr.trim()
  };

  if (!output.ok && !options.allowFailure) {
    throw new Error(`${classifyGhFailure(output.stderr)}: gh ${commandArgs.join(" ")} failed: ${output.stderr || "no stderr"}`);
  }

  return output;
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

  if (/bad credentials|requires authentication|not authenticated|401|403/u.test(message)) {
    return "BLOCKED_GITHUB_ACCESS";
  }

  return "BLOCKED_GITHUB_ACCESS";
}

function parseArgs(argv) {
  const parsed = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (!arg.startsWith("--")) {
      continue;
    }

    const [key, inlineValue] = arg.slice(2).split("=", 2);
    if (inlineValue !== undefined) {
      parsed[key] = inlineValue;
      continue;
    }

    const next = argv[index + 1];
    if (next && !next.startsWith("--")) {
      parsed[key] = next;
      index += 1;
      continue;
    }

    parsed[key] = true;
  }

  return parsed;
}
