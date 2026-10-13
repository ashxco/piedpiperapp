import type { ResourceAttributionSnapshot } from "@piedpiperapp/contracts";
import * as Context from "effect/Context";
import * as DateTime from "effect/DateTime";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

export interface ResourceAttributionRecord {
  readonly component: string;
  readonly operation: string;
  readonly logicalReadBytes?: number;
  readonly logicalWriteBytes?: number;
  readonly count?: number;
  readonly durationMs?: number;
}

export class ResourceAttribution extends Context.Service<
  ResourceAttribution,
  {
    readonly record: (input: ResourceAttributionRecord) => Effect.Effect<void>;
    readonly snapshot: Effect.Effect<ResourceAttributionSnapshot>;
  }
>()("piedpiperapp/resourceTelemetry/ResourceAttribution") {}

export const make = () =>
  Effect.succeed(
    ResourceAttribution.of({
      record: () => Effect.void,
      snapshot: DateTime.now.pipe(Effect.map((readAt) => ({ readAt, entries: [] }))),
    }),
  );
export const layer = Layer.effect(ResourceAttribution, make());
