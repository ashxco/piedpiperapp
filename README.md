# Pied Piper

A local-first workspace for coding agents, maintained at [ashxco/piedpiperapp](https://github.com/ashxco/piedpiperapp). Project domain: **piedpiperapp.com**.

Pied Piper provides web, desktop, and mobile clients for working with your coding agents. Product analytics and telemetry collection/export are disabled. See LICENSE for licensing information.

## Run locally

Install Node.js 24 and [Vite+](https://viteplus.dev/guide/), then:

```sh
git clone https://github.com/ashxco/piedpiperapp.git
cd piedpiperapp
vp install
vp run dev
```

Connect an installed coding provider (Codex, Claude Code, Cursor, Grok, OpenCode, or Antigravity) with your own account. Web, Electron desktop, and React Native mobile clients share the server. See [development](docs/operations/development.md) and [architecture](docs/internals/overview.md).

## Privacy

No PostHog events or analytics identity. No OpenTelemetry exporters or browser trace intake. No process telemetry sampler. Operational console and failure logs remain local. Existing telemetry environment variables or saved export settings cannot enable telemetry. Provider tools and external services you choose to connect retain their own privacy behavior.

Cloud credentials, mobile app-store listings, and upstream Expo updates are not bundled with this fork. Optional relay infrastructure requires your own configuration. No site is published by the local development setup.

## Branding

The application is **Pied Piper**, the CLI/package is `piedpiperapp`, and fork-owned links use `piedpiperapp.com`. Runtime state uses `~/.piedpiperapp` and `PIEDPIPER_*` environment variables.
