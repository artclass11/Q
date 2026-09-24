# Contributing to Q

Thanks for helping make safe AI context tooling better.

## Development

Requirements:

- Node.js 20 or newer
- npm

Commands:

~~~bash
npm install
npm run typecheck
npm test
npm run build
~~~

## Pull requests

Keep changes focused. Add or update tests for behavior changes.

Please avoid adding runtime dependencies unless they materially improve the security or capability of the project.

## Design principle

Prefer small, auditable primitives over opaque infrastructure. A feature should make the trust boundary clearer, not wider.
