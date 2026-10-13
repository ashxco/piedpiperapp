import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import type { OtlpProtocol, SignalExport } from "./observability.ts";

export type OtelSignal = Data.TaggedEnum<{
  Unset: {};
  Off: {};
  Export: {
    readonly url: string;
    readonly protocol: OtlpProtocol;
    readonly headers: Readonly<Record<string, string>> | undefined;
  };
}>;
export const OtelSignal = Data.taggedEnum<OtelSignal>();
export interface OtelEnvironment {
  readonly disabled: boolean;
  readonly warnings: ReadonlyArray<string>;
  readonly resourceAttributes: Readonly<Record<string, string>>;
  readonly traces: OtelSignal;
  readonly metrics: OtelSignal;
  readonly logs: OtelSignal;
}
export type SignalName = "traces" | "metrics" | "logs";
export interface SignalEndpoint {
  readonly url: string;
  readonly export: SignalExport;
}

// Immutable policy: environment variables and saved settings cannot enable export.
export const none: OtelEnvironment = {
  disabled: true,
  warnings: [],
  resourceAttributes: {},
  traces: OtelSignal.Off(),
  metrics: OtelSignal.Off(),
  logs: OtelSignal.Off(),
};
export const load: Effect.Effect<OtelEnvironment> = Effect.succeed(none);
export const resolveSignalEndpoint = (
  _otel: OtelEnvironment,
  _signal: SignalName,
  _app: { readonly url: string | undefined; readonly export: SignalExport },
  ..._fallbackUrls: ReadonlyArray<string | undefined>
): SignalEndpoint | undefined => undefined;
export const layerResourceAttributes = (_attributes: Readonly<Record<string, string>>) =>
  Layer.empty;
