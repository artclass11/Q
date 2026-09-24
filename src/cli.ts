#!/usr/bin/env node
import path from "node:path";
import { formatMarkdown, queryProject, scanProject } from "./core/engine.js";
import { initPolicy, loadPolicy } from "./core/policy.js";
import { startServer } from "./server.js";

function usage(): never {
  console.error([
    "Q — local context firewall",
    "",
    "Usage:",
    "  q init [root]",
    "  q scan [root] [--json]",
    "  q query <root> <question> [--top N] [--json]",
    "  q pack <root> <question> [--top N]",
    "  q doctor [root]",
    "  q server [root]"
  ].join("\n"));
  process.exit(1);
}

function valueAfter(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}

async function main(): Promise<void> {
  const [command, ...rest] = process.argv.slice(2);

  switch (command) {
    case "init": {
      const root = path.resolve(rest[0] ?? ".");
      console.log("Policy ready at " + (await initPolicy(root)));
      return;
    }

    case "scan": {
      const root = path.resolve(rest.find((arg) => !arg.startsWith("--")) ?? ".");
      const documents = await scanProject(root);
      if (rest.includes("--json")) {
        console.log(JSON.stringify(documents.map(({ content: _content, ...document }) => document), null, 2));
      } else {
        console.log("Scanned " + String(documents.length) + " permitted text sources.");
        for (const document of documents) console.log(document.path + "  " + document.sha256.slice(0, 16));
      }
      return;
    }

    case "query":
    case "pack": {
      if (!rest[0]) usage();
      const root = path.resolve(rest[0]);
      const top = valueAfter(rest, "--top");
      const topK = top ? Number(top) : undefined;
      const question = rest
        .slice(1)
        .filter((arg, index, all) => arg !== "--json" && arg !== "--top" && all[index - 1] !== "--top")
        .join(" ")
        .trim();

      if (!question) usage();

      const pack = await queryProject(root, question, Number.isFinite(topK) ? { topK } : {});
      console.log(command === "pack" ? formatMarkdown(pack) : JSON.stringify(pack, null, 2));
      return;
    }

    case "doctor": {
      const root = path.resolve(rest[0] ?? ".");
      const policy = await loadPolicy(root);
      const documents = await scanProject(root, policy);
      console.log(JSON.stringify({
        ok: true,
        root,
        policy: {
          denyPatterns: policy.deny.length,
          allowPatterns: policy.allow.length,
          maxBytes: policy.maxBytes,
          maxResults: policy.maxResults
        },
        permittedTextSources: documents.length
      }, null, 2));
      return;
    }

    case "server":
      startServer(path.resolve(rest[0] ?? "."));
      return;

    default:
      usage();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
