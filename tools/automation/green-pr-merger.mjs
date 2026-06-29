import { spawnSync } from "node:child_process";

const args = parseArgs(process.argv.slice(2));
const repository = args.repo ?? process.env.GROWME_REPOSITORY ?? "Hangi-n42/Growme_2026";
const dryRun = args["dry-run"] || !args.merge;
const maxPrs = Number(args.limit ?? 100);

main();

function main() {
  preflight();

  const prs = listOpenPrs()
    .filter(isCodexImplementationPr)
    .sort((left, right) => String(left.createdAt).localeCompare(String(right.createdAt)));

  if (prs.length === 0) {
    report("NO_ACTION_NO_OPEN_PRS", ["No open Codex implementation PRs were found."]);
    return;
  }

  const rejected = [];

  for (const pr of prs) {
    const decision = evaluatePr(pr);
    if (!decision.eligible) {
      rejected.push({ pr, reasons: decision.reasons });
      continue;
    }

    if (dryRun) {
      report("DRY_RUN_ELIGIBLE_PR", [
        `Would squash merge PR #${pr.number}: ${pr.title}`,
        `PR URL: ${pr.url}`,
        ...formatRejected(rejected)
      ]);
      return;
    }

    if (decision.p2Findings.length > 0) {
      ensureP2Followup(pr, decision.p2Findings);
    }

    mergePr(pr);
    report("MERGED_GREEN_PR", [
      `Merged PR #${pr.number}: ${pr.title}`,
      `PR URL: ${pr.url}`,
      "Merge method: squash",
      "Branch deletion: requested with gh pr merge --delete-branch",
      ...formatRejected(rejected)
    ]);
    return;
  }

  report("NO_ACTION_NO_ELIGIBLE_GREEN_PR", [
    "Open Codex implementation PRs exist, but none satisfied merge policy.",
    ...formatRejected(rejected)
  ]);
}

function preflight() {
  if (!process.env.GH_TOKEN && !process.env.GITHUB_TOKEN) {
    throw new Error("BLOCKED_GITHUB_ACCESS: Missing GH_TOKEN or GITHUB_TOKEN.");
  }

  gh(["api", "user", "--jq", ".login"]);
  gh(["api", `repos/${repository}`, "--jq", ".full_name"]);
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
    String(maxPrs),
    "--json",
    "number,title,baseRefName,headRefName,isDraft,labels,body,createdAt,url,headRefOid,mergeStateStatus"
  ]);
}

function isCodexImplementationPr(pr) {
  return pr.headRefName?.startsWith("codex/") || pr.title?.startsWith("VS-");
}

function evaluatePr(pr) {
  const reasons = [];
  const p2Findings = [];

  if (pr.isDraft) {
    reasons.push("draft PR");
  }

  if (hasLabel(pr, "release-candidate")) {
    reasons.push("release-candidate PR");
  }

  if (pr.baseRefName !== "main") {
    reasons.push(`base branch is ${pr.baseRefName}`);
  }

  if (["BEHIND", "BLOCKED", "DIRTY", "DRAFT", "UNKNOWN", "UNSTABLE"].includes(pr.mergeStateStatus)) {
    reasons.push(`mergeStateStatus is ${pr.mergeStateStatus}`);
  }

  if (!/Closes\s+#\d+/iu.test(pr.body ?? "")) {
    reasons.push("PR body does not contain Closes #...");
  }

  const checkDecision = evaluateChecks(pr);
  reasons.push(...checkDecision.reasons);

  const reviewDecision = evaluateReviewFindings(pr);
  reasons.push(...reviewDecision.reasons);
  p2Findings.push(...reviewDecision.p2Findings);

  return {
    eligible: reasons.length === 0,
    reasons,
    p2Findings
  };
}

function evaluateChecks(pr) {
  const reasons = [];
  const checkRunsResponse = ghJson(["api", `repos/${repository}/commits/${pr.headRefOid}/check-runs?per_page=100`]);
  const statusResponse = ghJson(["api", `repos/${repository}/commits/${pr.headRefOid}/status`]);
  const checkRuns = checkRunsResponse.check_runs ?? [];
  const statuses = statusResponse.statuses ?? [];

  if (checkRuns.length === 0 && statuses.length === 0) {
    reasons.push("no checks or commit statuses found");
  }

  const badCheckRuns = checkRuns.filter((check) => {
    if (check.status !== "completed") {
      return true;
    }

    return !["success", "neutral", "skipped"].includes(check.conclusion);
  });

  if (badCheckRuns.length > 0) {
    reasons.push(`non-success check runs: ${badCheckRuns.map((check) => check.name).join(", ")}`);
  }

  if (statuses.length > 0 && statusResponse.state !== "success") {
    reasons.push(`combined commit status is ${statusResponse.state}`);
  }

  const qualityGate = checkRuns.find((check) => {
    const suiteName = check.check_suite?.name ?? "";
    return /quality-gate/iu.test(check.name ?? "") || /quality-gate/iu.test(suiteName);
  });

  if (!qualityGate) {
    reasons.push("quality-gate check run not found");
  } else if (qualityGate.status !== "completed" || qualityGate.conclusion !== "success") {
    reasons.push(`quality-gate is ${qualityGate.status}/${qualityGate.conclusion ?? "no conclusion"}`);
  }

  return { reasons };
}

function evaluateReviewFindings(pr) {
  const reasons = [];
  const p2Findings = [];
  const reviewBodies = collectReviewBodies(pr.number);

  for (const item of reviewBodies) {
    const body = item.body ?? "";

    if (hasSeverity(body, 0) || hasSeverity(body, 1)) {
      reasons.push(`unresolved P0/P1 marker found in ${item.source}`);
    }

    if (hasSeverity(body, 2)) {
      p2Findings.push({
        source: item.source,
        body: firstLine(body)
      });
    }
  }

  return { reasons, p2Findings };
}

function collectReviewBodies(prNumber) {
  const reviews = ghJson(["api", `repos/${repository}/pulls/${prNumber}/reviews?per_page=100`]);
  const issueComments = ghJson(["api", `repos/${repository}/issues/${prNumber}/comments?per_page=100`]);
  const reviewComments = ghJson(["api", `repos/${repository}/pulls/${prNumber}/comments?per_page=100`]);

  return [
    ...reviews.map((review) => ({ source: `review ${review.id}`, body: review.body })),
    ...issueComments.map((comment) => ({ source: `issue comment ${comment.id}`, body: comment.body })),
    ...reviewComments.map((comment) => ({ source: `review comment ${comment.id}`, body: comment.body }))
  ].filter((item) => item.body);
}

function ensureP2Followup(pr, p2Findings) {
  const duplicateQuery = `repo:${repository} is:issue "P2 follow-up for PR #${pr.number}"`;
  const existing = ghJson(["api", "search/issues", "-f", `q=${duplicateQuery}`]);

  if ((existing.items ?? []).length > 0) {
    return;
  }

  const title = `P2 follow-up for PR #${pr.number}: ${truncate(pr.title, 70)}`;
  const body = [
    `PR #${pr.number}의 non-blocking P2 review feedback 후속 작업입니다.`,
    "",
    `PR: ${pr.url}`,
    "",
    "확인된 P2 finding:",
    ...p2Findings.map((finding) => `- ${finding.source}: ${finding.body}`),
    "",
    "이 이슈는 green-pr-merger가 P2를 merge blocker로 보지 않기 때문에 생성되었습니다."
  ].join("\n");

  const result = gh(
    ["issue", "create", "--repo", repository, "--title", title, "--body", body, "--label", "severity/p2", "--label", "area/qa"],
    { allowFailure: true }
  );

  if (!result.ok) {
    gh(["issue", "create", "--repo", repository, "--title", title, "--body", body]);
  }
}

function mergePr(pr) {
  const latest = ghJson([
    "pr",
    "view",
    String(pr.number),
    "--repo",
    repository,
    "--json",
    "headRefOid,mergeStateStatus,isDraft"
  ]);

  if (latest.headRefOid !== pr.headRefOid) {
    throw new Error(`BLOCKED_HEAD_CHANGED: PR #${pr.number} head changed before merge.`);
  }

  if (latest.isDraft) {
    throw new Error(`BLOCKED_DRAFT_PR: PR #${pr.number} became draft before merge.`);
  }

  if (["BEHIND", "BLOCKED", "DIRTY", "DRAFT", "UNKNOWN", "UNSTABLE"].includes(latest.mergeStateStatus)) {
    throw new Error(`BLOCKED_MERGE_STATE: PR #${pr.number} mergeStateStatus is ${latest.mergeStateStatus}.`);
  }

  gh(["pr", "merge", String(pr.number), "--repo", repository, "--squash", "--delete-branch"]);
}

function hasLabel(pr, labelName) {
  return (pr.labels ?? []).some((label) => label.name === labelName);
}

function hasSeverity(body, severity) {
  const marker = `p${severity}`;
  return new RegExp(`(?:\\[${marker}\\]|\\b${marker}\\b|severity\\/${marker})`, "iu").test(body);
}

function firstLine(value) {
  return truncate(String(value).split(/\r?\n/u).find((line) => line.trim()) ?? "", 160);
}

function truncate(value, maxLength) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 3)}...`;
}

function formatRejected(rejected) {
  if (rejected.length === 0) {
    return [];
  }

  return [
    "Rejected candidates:",
    ...rejected.map(({ pr, reasons }) => `- PR #${pr.number}: ${reasons.join("; ")}`)
  ];
}

function report(status, lines) {
  console.log(status);
  for (const line of lines) {
    console.log(line);
  }
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
