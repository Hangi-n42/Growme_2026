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

export function listWorkspacePackageManifests() {
  const workspaceText = readText("pnpm-workspace.yaml");
  const workspaceGlobs = extractWorkspacePackageGlobs(workspaceText);
  const manifests = new Set(["package.json"]);

  for (const file of listFiles()) {
    if (!file.endsWith("/package.json")) {
      continue;
    }

    const packageDir = file.slice(0, -"/package.json".length);
    if (workspaceGlobs.some((glob) => workspaceGlobMatchesPackageDir(glob, packageDir))) {
      manifests.add(file);
    }
  }

  return [...manifests].sort();
}

export function extractWorkspacePackageGlobs(workspaceText) {
  const globs = [];
  const lines = workspaceText.split(/\r?\n/u);
  let inPackages = false;
  let packagesIndent = 0;

  for (const line of lines) {
    if (/^\s*(?:#.*)?$/u.test(line)) {
      continue;
    }

    const packagesMatch = /^(\s*)packages\s*:\s*(?:#.*)?$/u.exec(line);
    if (packagesMatch) {
      inPackages = true;
      packagesIndent = packagesMatch[1].length;
      continue;
    }

    if (!inPackages) {
      continue;
    }

    const indent = /^\s*/u.exec(line)?.[0].length ?? 0;
    if (indent <= packagesIndent && !/^\s*-/u.test(line)) {
      break;
    }

    const itemMatch = /^\s*-\s*["']?([^"'\r\n#]+)["']?\s*(?:#.*)?$/u.exec(line);
    if (itemMatch) {
      globs.push(itemMatch[1].trim().replaceAll("\\", "/"));
    }
  }

  return globs;
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

function workspaceGlobMatchesPackageDir(workspaceGlob, packageDir) {
  const normalizedGlob = workspaceGlob.replaceAll("\\", "/").replace(/\/+$/u, "");
  const target = normalizedGlob.endsWith("/package.json") ? `${packageDir}/package.json` : packageDir;
  return globToRegExp(normalizedGlob).test(target);
}

function globToRegExp(glob) {
  let pattern = "";

  for (let index = 0; index < glob.length; index += 1) {
    const char = glob[index];
    const nextChar = glob[index + 1];

    if (char === "*" && nextChar === "*") {
      pattern += ".*";
      index += 1;
      continue;
    }

    if (char === "*") {
      pattern += "[^/]*";
      continue;
    }

    pattern += escapeRegExp(char);
  }

  return new RegExp(`^${pattern}$`, "u");
}

function escapeRegExp(value) {
  return value.replace(/[\\^$.*+?()[\]{}|]/gu, "\\$&");
}
