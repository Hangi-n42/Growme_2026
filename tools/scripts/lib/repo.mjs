import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

export const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));

const ignoredDirectories = new Set([".git", "node_modules", "dist", "coverage", "playwright-report"]);

export function readText(path) {
  return readFileSync(join(repoRoot, path), "utf8");
}

export function readJson(path) {
  return JSON.parse(readText(path));
}

export function listFiles(start = repoRoot) {
  const files = [];

  for (const entry of readdirSync(start)) {
    if (ignoredDirectories.has(entry)) {
      continue;
    }

    const fullPath = join(start, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      files.push(...listFiles(fullPath));
      continue;
    }

    files.push(relative(repoRoot, fullPath).replaceAll("\\", "/"));
  }

  return files;
}

export function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

export function pass(message) {
  console.log(`PASS ${message}`);
}

export function runCheck(name, fn) {
  try {
    fn();
    pass(name);
  } catch (error) {
    console.error(`FAIL ${name}`);
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

export function findTextFiles() {
  const extensions = new Set([
    ".css",
    ".html",
    ".js",
    ".json",
    ".md",
    ".mjs",
    ".ts",
    ".toml",
    ".yml",
    ".yaml"
  ]);

  return listFiles().filter((file) => {
    const lower = file.toLowerCase();
    return [...extensions].some((extension) => lower.endsWith(extension));
  });
}
