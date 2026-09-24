import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { PolicyConfig } from "./types.js";

export const DEFAULT_DENY = [
  ".env",
  ".env.*",
  "*.pem",
  "*.key",
  "*.p12",
  "*.pfx",
  "id_rsa*",
  "id_ed25519*",
  "*credentials*",
  "*secret*",
  "*token*",
  ".npmrc",
  ".pypirc",
  "*.sqlite",
  "*.sqlite3",
  "*.db",
  "*.dump"
];

export const DEFAULT_POLICY: Required<PolicyConfig> = {
  deny: DEFAULT_DENY,
  allow: [],
  maxBytes: 1_048_576,
  maxResults: 8
};

function escapeRegExp(value: string): string {
  return value.split("").map((char) => /[.*+?^()|[\]\\]/.test(char) ? "\\" + char : char).join("");
}

function globToRegExp(pattern: string): RegExp {
  const normalized = pattern.replace(/\\/g, "/").replace(/^\.\//, "");
  const pieces = normalized.split("*");
  return new RegExp("^" + pieces.map(escapeRegExp).join(".*") + "$", "i");
}

export function matchesPattern(relativePath: string, pattern: string): boolean {
  return globToRegExp(pattern).test(relativePath.replace(/\\/g, "/"));
}

export function isPathPermitted(relativePath: string, policy: PolicyConfig): boolean {
  const deny = policy.deny ?? DEFAULT_DENY;
  const allow = policy.allow ?? [];

  if (deny.some((pattern) => matchesPattern(relativePath, pattern))) {
    return false;
  }

  if (allow.length > 0 && !allow.some((pattern) => matchesPattern(relativePath, pattern))) {
    return false;
  }

  return true;
}

export async function loadPolicy(root: string): Promise<Required<PolicyConfig>> {
  const policyPath = path.join(root, ".q", "policy.json");

  try {
    const raw = await readFile(policyPath, "utf8");
    const parsed = JSON.parse(raw) as PolicyConfig;
    return {
      deny: parsed.deny ?? DEFAULT_DENY,
      allow: parsed.allow ?? [],
      maxBytes: parsed.maxBytes ?? DEFAULT_POLICY.maxBytes,
      maxResults: parsed.maxResults ?? DEFAULT_POLICY.maxResults
    };
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String((error as { code: unknown }).code) : "";
    if (code !== "ENOENT") throw error;
    return DEFAULT_POLICY;
  }
}

export async function initPolicy(root: string): Promise<string> {
  const dir = path.join(root, ".q");
  const target = path.join(dir, "policy.json");
  await mkdir(dir, { recursive: true });

  try {
    await readFile(target, "utf8");
    return target;
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String((error as { code: unknown }).code) : "";
    if (code !== "ENOENT") throw error;
  }

  const content = JSON.stringify({
    deny: DEFAULT_DENY,
    allow: [],
    maxBytes: DEFAULT_POLICY.maxBytes,
    maxResults: DEFAULT_POLICY.maxResults
  }, null, 2) + "\n";

  await writeFile(target, content, { encoding: "utf8", flag: "wx" });
  return target;
}
