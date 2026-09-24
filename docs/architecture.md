# Architecture

Q is intentionally small.

## 1. Policy gate

Paths are evaluated before their contents become documents. Deny patterns are evaluated first. An allow list can optionally narrow the project further.

The default policy is conservative because an accidental secret leak is more expensive than a missed document.

## 2. Fingerprinting

Every permitted file receives a SHA-256 digest. The digest is derived from the exact bytes read from disk, not from a normalized representation.

This gives downstream systems a stable provenance anchor:

1. read bytes
2. hash bytes
3. retrieve from the source
4. cite the hash

## 3. Retrieval

The MVP uses deterministic lexical retrieval. It intentionally avoids a vector database or external embedding service.

The score combines term frequency, a small density adjustment, and path matches.

Ties are broken by path, so results are stable.

## 4. Context packs

A context pack is a small, portable JSON document containing the question and source references. Markdown output is a human-readable view of the same data.

The core package has no model call. Any LLM, agent runtime, or application can consume the pack.

## 5. Local API

The server exposes GET /health and POST /query.

The default listener is 127.0.0.1. Remote binding requires Q_ALLOW_REMOTE=1 and should only be used behind an authentication layer.

## Future adapters

The same core can support MCP transport, signed manifests, encrypted local indexes, semantic retrieval, model adapters, and file watchers without making the core depend on one provider.
