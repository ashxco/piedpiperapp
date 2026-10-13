import { isProviderDriverKind } from "@piedpiperapp/contracts";
import { acpRegistryClient } from "@piedpiperapp/provider-acp-registry/client";
import { makeProviderClientRegistry } from "@piedpiperapp/provider-core/client";
import { cursorClient } from "@piedpiperapp/provider-cursor/client";
import { grokClient } from "@piedpiperapp/provider-grok/client";
import { museClient } from "@piedpiperapp/provider-muse/client";
import { openCodeClient } from "@piedpiperapp/provider-opencode/client";
import { piClient } from "@piedpiperapp/provider-pi/client";

/** The provider client definitions this mobile build ships. */
const providerClients = makeProviderClientRegistry([
  cursorClient,
  grokClient,
  museClient,
  openCodeClient,
  piClient,
  acpRegistryClient,
]);

/** The client definition for a driver kind, or `undefined` for drivers drawn by hand. */
export function getProviderClient(driver: string | null | undefined) {
  return isProviderDriverKind(driver) ? providerClients.get(driver) : undefined;
}
