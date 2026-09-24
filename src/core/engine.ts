import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { sha256 } from "./hash.js";
import { isPathPermitted, loadPolicy } from "./policy.js";
import type { ContextPack, PolicyConfig, SearchHit, SourceDocument } from "./types.js";

const SKIP_DIRS = new Set([".git", "node_modules", "dist", "coverage", ".q"]);

function tokenize(value: string): string[] {
  return value.toLowerCase().match(/[a-z0-9][a-z0-9_:-]{1,}/g) ?? [];
}

function scoreDocument(document: SourceDocument, terms: string[]): number {
  if (terms.length === 0) return 0;

  const lower = document.content.toLowerCase();
  const lowerPath = document.path.toLowerCase();
  let score = 0;

  for (const term of terms) {
    let index = 0;
    let count = 0;
    while ((index = lower.indexOf(term, index)) !== -1) {
      count += 1;
      index += term.length;
      if (count >= 12) break;
    }

    score += count;
    if (lowerPath.includes(term)) score += 4;
  }

  const density = Math.min(score / Math.max(document.content.length / 2000, 1), 3);
  return Number((score + density).toFixed(6));
}

function makeExcerpt(content: string, terms: string[]): string {
  const normalized = content.replace(/\s+/g, " ").trim();
  if (normalized.length <= 320) return normalized;

  const lower = normalized.toLowerCase();
  let bestIndex = -1;

  for (const term of terms) {
    const index = lower.indexOf(term);
    if (index >= 0 && (bestIndex === -1 || index < bestIndex)) bestIndex = index;
  }

  if (bestIndex === -1) return normalized.slice(0, 320) + "…";

  const start = Math.max(0, bestIndex - 110);
  const end = Math.min(normalized.length, bestIndex + 210);
  return (start > 0 ? "…" : "") + normalized.slice(start, end) + (end < normalized.length ? "…" : "");
}

async function isTextFile(filePath: string): Promise<boolean> {
  const buffer = await readFile(filePath);
  const probe = buffer.subarray(0, Math.min(buffer.length, 4096));
  return !probe.includes(0);
}

async function walkFiles(root: string, current: string, out: string[]): Promise<void> {
  const entries = await readdir(current, { withFileTypes: true });

  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const full = path.join(current, entry.name);

    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) await walkFiles(root, full, out);
      continue;
    }

    if (entry.isFile()) {
      out.push(path.relative(root, full).split(path.sep).join("/"));
    }
  }
}

export async function scanProject(root: string, suppliedPolicy?: PolicyConfig): Promise<SourceDocument[]> {
  const absoluteRoot = path.resolve(root);
  const loaded = suppliedPolicy
    ? {
        deny: suppliedPolicy.deny ?? [],
        allow: suppliedPolicy.allow ?? [],
        maxBytes: suppliedPolicy.maxBytes ?? 1_048_576,
        maxResults: suppliedPolicy.maxResults ?? 8
      }
    : await loadPolicy(absoluteRoot);

  const relativePaths: string[] = [];
  await walkFiles(absoluteRoot, absoluteRoot, relativePaths);
  const documents: SourceDocument[] = [];

  for (const relativePath of relativePaths) {
    if (!isPathPermitted(relativePath, loaded)) continue;

    const fullPath = path.join(absoluteRoot, relativePath);
    const fileStat = await stat(fullPath);
    if (fileStat.size > loaded.maxBytes) continue;
    if (!(await isTextFile(fullPath))) continue;

    const bytes = await readFile(fullPath);
    const digest = sha256(bytes);
    documents.push({
      id: digest.slice(0, 16),
      path: relativePath,
      sha256: digest,
      bytes: bytes.length,
      content: bytes.toString("utf8")
    });
  }

  return documents.sort((a, b) => a.path.localeCompare(b.path));
}

export async function queryProject(root: string, question: string, options: { topK?: number } = {}): Promise<ContextPack> {
  const policy = await loadPolicy(path.resolve(root));
  const docs = await scanProject(root, policy);
  const terms = [...new Set(tokenize(question))];

  const hits = docs
    .map((document): SearchHit => ({
      source: {
        id: document.id,
        path: document.path,
        sha256: document.sha256,
        bytes: document.bytes
      },
      score: scoreDocument(document, terms),
      excerpt: makeExcerpt(document.content, terms)
    }))
    .filter((hit) => hit.score > 0)
    .sort((a, b) => b.score - a.score || a.source.path.localeCompare(b.source.path))
    .slice(0, options.topK ?? policy.maxResults);

  return {
    version: "1",
    question,
    generatedAt: new Date().toISOString(),
    sources: hits
  };
}

export function formatMarkdown(pack: ContextPack): string {
  const lines = [
    "# Q Context Pack",
    "",
    "Question: " + pack.question,
    "",
    "Generated: " + pack.generatedAt,
    ""
  ];

  if (pack.sources.length === 0) {
    lines.push("No permitted sources matched this question.");
    return lines.join("\n") + "\n";
  }

  for (let index = 0; index < pack.sources.length; index += 1) {
    const hit = pack.sources[index];
    lines.push(
      "## S" + String(index + 1) + " — " + hit.source.path,
      "",
      "Score: " + String(hit.score),
      "SHA-256: " + hit.source.sha256,
      "Excerpt:",
      "",
      "> " + hit.excerpt.replace(/\n/g, "\n> "),
      ""
    );
  }

  return lines.join("\n") + "\n";
}
