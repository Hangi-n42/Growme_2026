import { findTextFiles, listFiles, readJson, readText, runCheck } from "./lib/repo.mjs";

const workspacePackages = [
  "package.json",
  "apps/game-web/package.json",
  "packages/sim-core/package.json",
  "packages/content-schema/package.json",
  "tools/content-validator/package.json",
  "tools/economy-sim/package.json",
  "tools/npc-sim/package.json",
  "tools/quality-eval/package.json"
];

runCheck("workspace package manifests are valid", () => {
  for (const manifestPath of workspacePackages) {
    readJson(manifestPath);
  }
});

runCheck("sim-core does not import browser presentation dependencies", () => {
  const simCoreSources = listFiles().filter(
    (file) => file.startsWith("packages/sim-core/src/") && file.endsWith(".ts")
  );

  for (const path of simCoreSources) {
    const text = readText(path).toLowerCase();
    if (text.includes("phaser") || text.includes("localstorage") || text.includes("document.")) {
      throw new Error(`${path} contains a browser or Phaser dependency.`);
    }
  }
});

runCheck("forbidden dependencies are absent", () => {
  for (const manifestPath of workspacePackages) {
    const manifest = readJson(manifestPath);
    const dependencies = {
      ...(manifest.dependencies ?? {}),
      ...(manifest.devDependencies ?? {})
    };

    for (const dependencyName of Object.keys(dependencies)) {
      if (dependencyName.toLowerCase().includes("pixi")) {
        throw new Error(`${manifestPath} declares forbidden dependency ${dependencyName}.`);
      }
    }
  }
});

runCheck("root quality files are present", () => {
  for (const requiredPath of ["AGENTS.md", "QUALITY_BAR.md", "quality-gates.yml", "pnpm-workspace.yaml"]) {
    readText(requiredPath);
  }
});

runCheck("text files do not contain unresolved merge conflict markers", () => {
  const markerPatterns = [
    { label: "conflict start", pattern: new RegExp(`^${"<".repeat(7)}[^\r\n]*$`, "mu") },
    { label: "conflict separator", pattern: new RegExp(`^${"=".repeat(7)}$`, "mu") },
    { label: "conflict end", pattern: new RegExp(`^${">".repeat(7)}[^\r\n]*$`, "mu") }
  ];

  for (const path of findTextFiles()) {
    const text = readText(path);

    for (const { label, pattern } of markerPatterns) {
      const match = pattern.exec(text);
      if (match) {
        const line = text.slice(0, match.index).split(/\r?\n/u).length;
        throw new Error(`${path}:${line} contains ${label}.`);
      }
    }
  }
});

runCheck("pull request template exposes required review evidence sections", () => {
  const template = readText(".github/PULL_REQUEST_TEMPLATE.md");
  const requiredSections = [
    "## 요약",
    "## 완료한 작업",
    "## 변경된 파일",
    "## 추가/수정한 테스트",
    "## 실행한 명령",
    "## 결과",
    "## 리스크 / 남은 우려",
    "## 후속 작업",
    "## 연결된 이슈"
  ];

  for (const section of requiredSections) {
    if (!template.includes(section)) {
      throw new Error(`PR template is missing required section: ${section}`);
    }
  }
});
