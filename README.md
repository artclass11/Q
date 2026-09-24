# Q — Local Context Firewall

> **Safe context in. Verifiable context out.**

Q is a zero-runtime-dependency, local-first context firewall for AI workflows.

It sits between your local files and an AI tool. Q decides what may enter context, fingerprints every source, retrieves relevant passages deterministically, and emits a portable context pack with citations.

## Why Q?

AI tools are becoming part of everyday engineering, but local data is messy: secrets, credentials, private notes, source code, exports, and documents often live side-by-side. Q treats context as a security and provenance problem instead of only a retrieval problem.

## Core ideas

- **Deny by default for risky files** — environment files, private keys, credentials, tokens, dumps, and common secret formats are excluded before indexing.
- **Local-first** — scanning and retrieval happen on your machine. No API key and no cloud service are required.
- **Content-addressed sources** — every source gets a SHA-256 fingerprint so outputs can be traced back to exact bytes.
- **Deterministic retrieval** — identical inputs, policy, and query produce the same ordering.
- **Portable context packs** — JSON or Markdown output can be passed to any model or agent.
- **Human-auditable policy** — the allow/deny rules are ordinary JSON.
- **Safe localhost server** — optional HTTP access for desktop apps and local agents, bound to 127.0.0.1 by default.

## Quick start

~~~bash
npm install
npm run build

node dist/cli.js scan .
node dist/cli.js query . "Where is authentication implemented?"
node dist/cli.js init .
~~~

The CLI is also exposed as q when installed globally or through an npm-linked checkout.

## Output

A query returns source references such as S1 and S2, plus relative path, retrieval score, source SHA-256, short excerpt, and query metadata. The JSON format is designed to be stable enough for scripts and agent adapters.

## Architecture

~~~text
                 local files
                     │
                     ▼
              ┌──────────────┐
              │ Policy Gate  │  deny/allow + size checks
              └──────┬───────┘
                     ▼
              ┌──────────────┐
              │ Fingerprint  │  SHA-256 per source
              └──────┬───────┘
                     ▼
              ┌──────────────┐
              │   Retriever  │  deterministic lexical scoring
              └──────┬───────┘
                     ▼
              ┌──────────────┐
              │ Context Pack │  citations + provenance
              └──────┬───────┘
                     ▼
            any model / agent / app
~~~

The core deliberately does not call an LLM. This keeps the trust boundary small and lets users choose their model, API, or local runtime.

## Security posture

Q is designed for local use. It does not transmit scanned content by itself.

The default policy is intentionally conservative, but no secret detector is perfect. Review the .q/policy.json file for your environment and treat the generated context as sensitive data.

See SECURITY.md.

## Status

**v0.1.0 — usable MVP.**

The first release focuses on the trust boundary: policy → fingerprint → retrieve → cite.

Planned extensions include encrypted indexes, pluggable semantic retrievers, model adapters, MCP transport, signed context manifests, and filesystem watchers.

## License

MIT
