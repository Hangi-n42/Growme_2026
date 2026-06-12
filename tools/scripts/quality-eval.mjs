import { readJson, readText, runCheck } from "./lib/repo.mjs";

const releaseGateExpectations = [
  {
    id: "determinism.command_replay",
    area: "determinism",
    gateText: "gameplay_authority: deterministic_typescript_sim_core",
    docsText: "Same seed plus command log replays exactly"
  },
  {
    id: "economy.zero_loops",
    area: "economy_integrity",
    gateText: "infinite_money_loop_count: 0",
    docsText: "Economy simulation finds 0 infinite money loops"
  },
  {
    id: "economy.zero_deadlocks",
    area: "economy_integrity",
    gateText: "progression_deadlock_count: 0",
    docsText: "Economy simulation finds 0 progression deadlocks"
  },
  {
    id: "boundary.phaser_rule_duplication",
    area: "boundary_integrity",
    gateText: "phaser_rule_duplication: forbidden",
    docsText: "Phaser is presentation and input only"
  },
  {
    id: "scope.no_multiplayer",
    area: "scope_integrity",
    gateText: "v0_1_mode: solo_only",
    docsText: "No multiplayer"
  },
  {
    id: "scope.no_runtime_llm_dialogue",
    area: "scope_integrity",
    gateText: "runtime_llm_dialogue: forbidden",
    docsText: "No runtime LLM NPC dialogue"
  },
  {
    id: "player_loop.first_3_days",
    area: "player_loop",
    gateText: "first_3_days_playable: required",
    docsText: "first 3 in-game days"
  },
  {
    id: "player_loop.full_slice_actions",
    area: "player_loop",
    gateText: "player_farm_craft_gather_action_trade_contract_relationship_decorate_save_reload: required",
    docsText: "farm, craft, gather/action, buy/sell"
  },
  {
    id: "stability.runtime_network_dependency",
    area: "stability",
    gateText: "runtime_network_gameplay_dependency: forbidden",
    docsText: "failed asset load"
  },
  {
    id: "visual.no_placeholder_rectangles",
    area: "visual_readiness",
    gateText: "core_gameplay_placeholder_rectangles: 0",
    docsText: "placeholder rectangles"
  }
];

const protectedThresholds = [
  "vendor_buy_multiplier_min: 0.35",
  "vendor_buy_multiplier_max: 0.60",
  "vendor_sell_multiplier_min: 1.00",
  "vendor_sell_multiplier_max: 1.50",
  "dynamic_price_multiplier_min: 0.65",
  "dynamic_price_multiplier_max: 1.75",
  "crafted_item_roi_default_min: 0.75",
  "crafted_item_roi_default_max: 1.15",
  "dominant_activity_efficiency_delta_max: 0.35",
  "required_source_surplus_min: 0.10",
  "required_source_surplus_target: 0.20",
  "desktop_boot_to_first_playable_ms_max: 3000",
  "save_load_roundtrip_ms_max: 250",
  "average_frame_ms_max: 20",
  "first_3_days_memory_mb_max: 512"
];

const scaffoldedReleaseBlockers = [
  {
    id: "rc.first_3_days_playable",
    command: "pnpm test:first-3-days",
    status: "scaffolded_blocker",
    summary: "Needs full browser automation before release candidate."
  },
  {
    id: "rc.economy_integrity",
    command: "pnpm sim:7days && pnpm sim:30days",
    status: "scaffolded_blocker",
    summary: "Needs real economy simulation reports with zero loops and deadlocks."
  },
  {
    id: "rc.visual_placeholder_audit",
    command: "pnpm eval:quality",
    status: "scaffolded_blocker",
    summary: "Needs release placeholder audit evidence before release candidate."
  }
];

runCheck("quality eval release gates are represented", () => {
  const gates = readText("quality-gates.yml");
  const qualityBar = readText("QUALITY_BAR.md");
  const testPlan = readText("docs/test-plan.md");
  const releaseChecklist = readText("docs/release-checklist.md");
  const gdd = readText("docs/02_gdd.md");
  const releaseEvidenceDocs = [qualityBar, testPlan, releaseChecklist, gdd];

  for (const expectation of releaseGateExpectations) {
    if (!gates.includes(expectation.gateText)) {
      throw new Error(`Missing ${expectation.area} quality gate ${expectation.id}: ${expectation.gateText}`);
    }

    if (!releaseEvidenceDocs.some((doc) => doc.includes(expectation.docsText))) {
      throw new Error(`Missing release-gate documentation for ${expectation.id}: ${expectation.docsText}`);
    }
  }

  if (!qualityBar.includes("The quality bar is a release contract")) {
    throw new Error("QUALITY_BAR.md must define release-contract expectations.");
  }
});

runCheck("required quality commands are wired in package scripts and CI", () => {
  const packageJson = readJson("package.json");
  const gates = readText("quality-gates.yml");
  const workflow = readText(".github/workflows/quality-gate.yml");
  const requiredCommands = extractRequiredCommands(gates);

  if (requiredCommands.length === 0) {
    throw new Error("quality-gates.yml must list required_scripts.");
  }

  for (const command of requiredCommands) {
    const scriptName = command.replace(/^pnpm\s+/u, "");
    if (typeof packageJson.scripts?.[scriptName] !== "string" || packageJson.scripts[scriptName].trim().length === 0) {
      throw new Error(`package.json is missing required script for ${command}.`);
    }

    if (!workflow.includes(command)) {
      throw new Error(`quality-gate workflow does not run required command: ${command}.`);
    }
  }
});

runCheck("protected thresholds are explicitly enforced", () => {
  const gates = readText("quality-gates.yml");

  for (const threshold of protectedThresholds) {
    if (!gates.includes(threshold)) {
      throw new Error(`Missing protected threshold: ${threshold}`);
    }
  }

  if (/\boptional\b/iu.test(gates)) {
    throw new Error("Release gates must not be marked optional in quality-gates.yml.");
  }
});

runCheck("release-candidate scaffold blockers are named", () => {
  const qualityBar = readText("QUALITY_BAR.md");
  const releaseChecklist = readText("docs/release-checklist.md");

  for (const blocker of scaffoldedReleaseBlockers) {
    if (!blocker.id || !blocker.command || !blocker.summary) {
      throw new Error(`Scaffold blocker is missing actionable metadata: ${JSON.stringify(blocker)}`);
    }
  }

  for (const requiredText of [
    "Automated first-3-days test",
    "Economy sim reports 0 infinite money loops",
    "No core gameplay placeholder rectangles"
  ]) {
    if (!releaseChecklist.includes(requiredText) && !qualityBar.includes(requiredText)) {
      throw new Error(`Release-candidate blocker is not visible in release docs: ${requiredText}`);
    }
  }

  console.log(`SCAFFOLDED_RELEASE_BLOCKERS ${JSON.stringify(scaffoldedReleaseBlockers)}`);
});

function extractRequiredCommands(gatesText) {
  const match = /^required_scripts:\s*$(?<body>[\s\S]*)/mu.exec(gatesText);
  if (!match?.groups?.body) {
    return [];
  }

  return [...match.groups.body.matchAll(/^\s*-\s+(pnpm [^\r\n]+)/gmu)].map((commandMatch) => commandMatch[1]);
}
