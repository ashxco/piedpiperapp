import {
  AntigravitySettings,
  ClaudeSettings,
  CodexSettings,
  ProviderDriverKind,
} from "@piedpiperapp/contracts";
import { acpRegistryClient } from "@piedpiperapp/provider-acp-registry/client";
import { makeProviderClientRegistry } from "@piedpiperapp/provider-core/client";
import { cursorClient } from "@piedpiperapp/provider-cursor/client";
import { grokClient } from "@piedpiperapp/provider-grok/client";
import { museClient } from "@piedpiperapp/provider-muse/client";
import { openCodeClient } from "@piedpiperapp/provider-opencode/client";
import { piClient } from "@piedpiperapp/provider-pi/client";

/** The provider client definitions this web build ships, in presentation order. */
export const providerClients = makeProviderClientRegistry([
  {
    driverKind: ProviderDriverKind.make("codex"),
    label: "Codex",
    settingsSchema: CodexSettings,
  },
  {
    driverKind: ProviderDriverKind.make("claudeAgent"),
    label: "Claude",
    settingsSchema: ClaudeSettings,
  },
  cursorClient,
  grokClient,
  openCodeClient,
  {
    driverKind: ProviderDriverKind.make("antigravity"),
    label: "Antigravity",
    settingsSchema: AntigravitySettings,
  },
  museClient,
  piClient,
  acpRegistryClient,
]);
