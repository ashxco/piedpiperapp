import type { OtlpEndpointCheckInput, OtlpEndpointCheckResult } from "@piedpiperapp/contracts";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
export class OtlpEndpointCheck extends Context.Service<
  OtlpEndpointCheck,
  {
    readonly check: (input: OtlpEndpointCheckInput) => Effect.Effect<OtlpEndpointCheckResult>;
  }
>()("piedpiperapp/observability/OtlpEndpointCheck") {}
// Older clients may still invoke this RPC. Never contact the supplied endpoint.
export const layer = Layer.succeed(OtlpEndpointCheck, {
  check: () => Effect.succeed({ _tag: "Unreachable", timedOut: false }),
});
