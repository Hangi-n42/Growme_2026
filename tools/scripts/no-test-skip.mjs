import { findTextFiles, readText, runCheck } from "./lib/repo.mjs";

const forbiddenPatterns = [
  ["test", "only"],
  ["describe", "only"],
  ["it", "only"],
  ["test", "skip"],
  ["describe", "skip"],
  ["it", "skip"]
].map((parts) => parts.join("."));

runCheck("committed tests are not focused or disabled", () => {
  for (const file of findTextFiles()) {
    if (file === "tools/scripts/no-test-skip.mjs") {
      continue;
    }

    const text = readText(file);

    for (const pattern of forbiddenPatterns) {
      if (text.includes(pattern)) {
        throw new Error(`${file} contains forbidden test control pattern ${pattern}.`);
      }
    }
  }
});
