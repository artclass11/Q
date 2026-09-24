# Security Policy

## Scope

Q is designed to reduce accidental context leakage when local files are used with AI systems.

It is not a complete secret scanner, DLP platform, malware detector, or sandbox.

## Reporting

Please do not open a public issue for a suspected vulnerability.

Use GitHub's private security advisory flow for this repository when available. Include reproduction steps, affected versions, expected versus actual behavior, and suggested mitigation.

## Threat model

Q assumes the machine running it is trusted. Local filesystem permissions are trusted. The caller is trusted unless the server is deliberately exposed. The selected model or downstream agent may be untrusted.

Important limits:

- filename-based deny rules can miss secrets stored under unusual names
- content is read locally and can still appear in terminal output or downstream applications
- Q does not inspect binaries
- Q does not authenticate remote API clients

## Safe deployment

Keep the API on localhost unless you have added authentication and network controls.

Before sharing a context pack externally, inspect its source paths and excerpts.

Customize .q/policy.json for project-specific sensitive paths.
