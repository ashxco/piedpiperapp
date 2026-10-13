import * as Layer from "effect/Layer";
import * as References from "effect/References";
import type * as Tracer from "effect/Tracer";

export function setDelegate(_next: Tracer.Tracer | null): void {}
export function hasDelegate(): boolean {
  return false;
}
export const layer = Layer.mergeAll(
  Layer.succeed(References.TracerEnabled, false),
  Layer.succeed(References.TracerTimingEnabled, false),
);
