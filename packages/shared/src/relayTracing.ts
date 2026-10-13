import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as References from "effect/References";
import type * as Tracer from "effect/Tracer";

export interface RelayClientTracingConfig {
  readonly tracesUrl: string;
  readonly tracesDataset: string;
  readonly tracesToken: string;
}
export interface RelayClientTracingResource {
  readonly serviceName: string;
  readonly serviceVersion?: string;
  readonly runtime: string;
  readonly client: string;
  readonly component?: string;
}
export class RelayClientTracer extends Context.Reference(
  "@piedpiperapp/shared/relayTracing/RelayClientTracer",
  {
    defaultValue: () => Option.none<Tracer.Tracer>(),
  },
) {}
export const withRelayClientTracing = <A, E, R>(
  effect: Effect.Effect<A, E, R>,
): Effect.Effect<A, E, R> => effect;
export const withLocalTracing = withRelayClientTracing;
export function layer(
  _config: RelayClientTracingConfig | null,
  _resource: RelayClientTracingResource,
) {
  return Layer.mergeAll(
    Layer.succeed(RelayClientTracer, Option.none()),
    Layer.succeed(References.TracerEnabled, false),
    Layer.succeed(References.TracerTimingEnabled, false),
  );
}
