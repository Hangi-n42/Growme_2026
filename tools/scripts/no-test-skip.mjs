import { findTextFiles, readText, runCheck } from "./lib/repo.mjs";

const forbiddenPatterns = [
  { label: "test.only", pattern: /\btest\s*\.\s*only\b/u },
  { label: "describe.only", pattern: /\bdescribe\s*\.\s*only\b/u },
  { label: "it.only", pattern: /\bit\s*\.\s*only\b/u },
  { label: "suite.only", pattern: /\bsuite\s*\.\s*only\b/u },
  { label: "test.skip", pattern: /\btest\s*\.\s*skip\b/u },
  { label: "describe.skip", pattern: /\bdescribe\s*\.\s*skip\b/u },
  { label: "it.skip", pattern: /\bit\s*\.\s*skip\b/u },
  { label: "suite.skip", pattern: /\bsuite\s*\.\s*skip\b/u },
  { label: "test.todo", pattern: /\btest\s*\.\s*todo\b/u },
  { label: "xit", pattern: /\bxit\s*\(/u },
  { label: "xdescribe", pattern: /\bxdescribe\s*\(/u }
];

runCheck("committed tests are not focused or disabled", () => {
  for (const file of findTextFiles()) {
    if (file === "tools/scripts/no-test-skip.mjs") {
      continue;
    }

    const text = readText(file);

    for (const { label, pattern } of forbiddenPatterns) {
      const match = pattern.exec(text);
      if (match) {
        const line = text.slice(0, match.index).split(/\r?\n/u).length;
        throw new Error(`${file}:${line} contains forbidden test control pattern ${label}.`);
      }
    }
  }
});
