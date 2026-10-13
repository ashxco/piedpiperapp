import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

/** Compatibility boundary for older callers. Pied Piper never collects usage events. */
export class AnalyticsService extends Context.Service<
  AnalyticsService,
  {
    readonly record: (
      event: string,
      properties?: Readonly<Record<string, unknown>>,
    ) => Effect.Effect<void>;
    readonly flush: Effect.Effect<void>;
  }
>()("piedpiperapp/telemetry/AnalyticsService") {
  static readonly layerTest = Layer.succeed(AnalyticsService, {
    record: () => Effect.void,
    flush: Effect.void,
  });
}

export const make = Effect.succeed(
  AnalyticsService.of({ record: () => Effect.void, flush: Effect.void }),
);
export const layer = Layer.effect(AnalyticsService, make);
