import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { queryProject, scanProject } from "../src/core/engine.js";
import { DEFAULT_DENY, initPolicy, matchesPattern } from "../src/core/policy.js";

test("default policy blocks common secret files", () => {
  assert.equal(matchesPattern(".env", DEFAULT_DENY[0]!), true);
  assert.equal(matchesPattern("keys/private.pem", "*.pem"), true);
  assert.equal(matchesPattern("src/app.ts", "*.pem"), false);
});

test("scan hashes permitted text sources and excludes denied files", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "q-test-"));
  try {
    await writeFile(path.join(root, "README.md"), "authentication lives here");
    await writeFile(path.join(root, ".env"), "API_KEY=do-not-index");
    const docs = await scanProject(root);
    assert.deepEqual(docs.map((doc) => doc.path), ["README.md"]);
    assert.equal(docs[0]?.sha256.length, 64);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("query ranking is deterministic and produces provenance", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "q-test-"));
  try {
    await writeFile(path.join(root, "auth.ts"), "export function authenticate(user: string) { return user; }");
    await writeFile(path.join(root, "notes.md"), "design notes about the release process");
    const first = await queryProject(root, "where is authenticate implemented?");
    const second = await queryProject(root, "where is authenticate implemented?");

    assert.equal(first.sources[0]?.source.path, "auth.ts");
    assert.deepEqual(
      first.sources.map((item) => [item.source.path, item.source.sha256, item.score]),
      second.sources.map((item) => [item.source.path, item.source.sha256, item.score])
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("init creates an explicit policy file", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "q-test-"));
  try {
    const policyPath = await initPolicy(root);
    const policy = JSON.parse(await readFile(policyPath, "utf8")) as { deny: string[] };
    assert.ok(policy.deny.length > 0);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
