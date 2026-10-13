import type {
  HostPowerSnapshot,
  ResourceMonitorCapabilities,
  ResourceMonitorExternalProcess,
  ResourceMonitorHelloEvent,
  ResourceMonitorProcessTableEntry,
  ResourceMonitorSnapshotEvent,
  ResourceTelemetrySourceStatus,
} from "@piedpiperapp/contracts";

import * as Context from "effect/Context";

import * as DateTime from "effect/DateTime";

import * as Effect from "effect/Effect";

import * as Layer from "effect/Layer";
import * as Option from "effect/Option";

import * as Ref from "effect/Ref";

import * as Schema from "effect/Schema";
import * as Semaphore from "effect/Semaphore";
import * as Scope from "effect/Scope";
import * as Stream from "effect/Stream";

import * as ResourceMonitorBinary from "./ResourceMonitorBinary.ts";

const SAMPLE_INTERVAL_MS = 1_000;
const UNKNOWN_BACKGROUND_SAMPLE_INTERVAL_MS = 5_000;
const BATTERY_SAMPLE_INTERVAL_MS = 5_000;
const CONSTRAINED_SAMPLE_INTERVAL_MS = 15_000;

const FAILURE_WINDOW_MS = 60_000;

export class NativeTelemetrySpawnFailed extends Schema.TaggedError<NativeTelemetrySpawnFailed>()(
  "NativeTelemetrySpawnFailed",
  {
    path: Schema.String,
    cause: Schema.Defect(),
  },
) {
  override get message(): string {
    return `Failed to start resource monitor '${this.path}'.`;
  }
}

export class NativeTelemetryHandshakeTimedOut extends Schema.TaggedError<NativeTelemetryHandshakeTimedOut>()(
  "NativeTelemetryHandshakeTimedOut",
  {
    timeoutMs: Schema.Number,
  },
) {
  override get message(): string {
    return `Resource monitor handshake timed out after ${this.timeoutMs}ms.`;
  }
}

class NativeTelemetryRequestTimedOut extends Schema.TaggedError<NativeTelemetryRequestTimedOut>()(
  "NativeTelemetryRequestTimedOut",
  {
    operation: Schema.Literals(["processTable", "readHistory", "sampleNow"]),
    timeoutMs: Schema.Number,
  },
) {
  override get message(): string {
    return `Resource monitor '${this.operation}' request timed out after ${this.timeoutMs}ms.`;
  }
}

export class NativeTelemetryProtocolMismatch extends Schema.TaggedError<NativeTelemetryProtocolMismatch>()(
  "NativeTelemetryProtocolMismatch",
  {
    expectedVersion: Schema.Number,
    receivedVersion: Schema.Number,
  },
) {
  override get message(): string {
    return `Resource monitor protocol ${this.receivedVersion} is incompatible with expected protocol ${this.expectedVersion}.`;
  }
}

export class NativeTelemetryDecodeFailed extends Schema.TaggedError<NativeTelemetryDecodeFailed>()(
  "NativeTelemetryDecodeFailed",
  {
    cause: Schema.Defect(),
  },
) {
  override get message(): string {
    return "Failed to decode resource monitor output.";
  }
}

export class NativeTelemetryCommandFailed extends Schema.TaggedError<NativeTelemetryCommandFailed>()(
  "NativeTelemetryCommandFailed",
  {
    operation: Schema.String,
    cause: Schema.Defect(),
  },
) {
  override get message(): string {
    return `Resource monitor command '${this.operation}' failed.`;
  }
}

export class NativeTelemetryExited extends Schema.TaggedError<NativeTelemetryExited>()(
  "NativeTelemetryExited",
  {
    exitCode: Schema.Number,
  },
) {
  override get message(): string {
    return `Resource monitor exited with code ${this.exitCode}.`;
  }
}

class NativeTelemetryStreamClosed extends Schema.TaggedError<NativeTelemetryStreamClosed>()(
  "NativeTelemetryStreamClosed",
  {},
) {
  override get message(): string {
    return "Resource monitor event stream closed unexpectedly.";
  }
}

export class NativeTelemetryUnavailable extends Schema.TaggedError<NativeTelemetryUnavailable>()(
  "NativeTelemetryUnavailable",
  {
    reason: Schema.String,
  },
) {
  override get message(): string {
    return `Resource monitor is unavailable: ${this.reason}`;
  }
}

export type NativeTelemetryClientError =
  | ResourceMonitorBinary.ResourceMonitorBinaryError
  | NativeTelemetrySpawnFailed
  | NativeTelemetryHandshakeTimedOut
  | NativeTelemetryRequestTimedOut
  | NativeTelemetryProtocolMismatch
  | NativeTelemetryDecodeFailed
  | NativeTelemetryCommandFailed
  | NativeTelemetryExited
  | NativeTelemetryStreamClosed
  | NativeTelemetryUnavailable;

export interface NativeTelemetryClientHealth {
  readonly status: ResourceTelemetrySourceStatus;
  readonly hello: Option.Option<ResourceMonitorHelloEvent>;
  readonly lastSampleAt: Option.Option<DateTime.Utc>;
  readonly lastError: Option.Option<string>;
  readonly restartCount: number;
  readonly sampleIntervalMs: number;
}

export interface NativeTelemetrySnapshot {
  readonly generation: number;
  readonly snapshot: ResourceMonitorSnapshotEvent;
}

export class NativeTelemetryClient extends Context.Service<
  NativeTelemetryClient,
  {
    readonly capabilities: Effect.Effect<ResourceMonitorCapabilities, NativeTelemetryClientError>;
    readonly snapshots: Stream.Stream<NativeTelemetrySnapshot, NativeTelemetryClientError>;
    readonly readHistory: (
      windowMs: number,
    ) => Effect.Effect<ReadonlyArray<ResourceMonitorSnapshotEvent>, NativeTelemetryClientError>;
    readonly setExternalProcesses: (
      processes: ReadonlyArray<ResourceMonitorExternalProcess>,
    ) => Effect.Effect<void, NativeTelemetryClientError>;
    readonly setHostPowerState: (
      snapshot: HostPowerSnapshot,
    ) => Effect.Effect<void, NativeTelemetryClientError>;
    readonly sampleNow: Effect.Effect<NativeTelemetrySnapshot, NativeTelemetryClientError>;
    readonly processTable: Effect.Effect<
      ReadonlyArray<ResourceMonitorProcessTableEntry>,
      NativeTelemetryClientError
    >;
    readonly retry: Effect.Effect<boolean>;
    readonly health: Effect.Effect<NativeTelemetryClientHealth>;
    readonly subscribeHealth: Effect.Effect<
      {
        readonly latest: NativeTelemetryClientHealth;
        readonly changes: Stream.Stream<NativeTelemetryClientHealth>;
      },
      never,
      Scope.Scope
    >;
  }
>()("piedpiperapp/resourceTelemetry/NativeTelemetryClient") {}

export interface CollectionControl {
  readonly hostPower: HostPowerSnapshot;
  readonly liveSubscriberCount: number;
  readonly sampleIntervalMs: number;
}

function isThermallyConstrained(snapshot: HostPowerSnapshot): boolean {
  return snapshot.thermalState === "serious" || snapshot.thermalState === "critical";
}

export function resolveNativeSampleIntervalMs(
  snapshot: HostPowerSnapshot,
  liveSubscriberCount: number,
): number {
  if (snapshot.stale || snapshot.source === "unknown") {
    return liveSubscriberCount > 0 ? SAMPLE_INTERVAL_MS : UNKNOWN_BACKGROUND_SAMPLE_INTERVAL_MS;
  }
  if (
    snapshot.suspended ||
    snapshot.locked === "true" ||
    snapshot.lowPowerMode === "true" ||
    isThermallyConstrained(snapshot)
  ) {
    return CONSTRAINED_SAMPLE_INTERVAL_MS;
  }
  if (snapshot.onBattery === "true") return BATTERY_SAMPLE_INTERVAL_MS;
  return liveSubscriberCount > 0 ? SAMPLE_INTERVAL_MS : UNKNOWN_BACKGROUND_SAMPLE_INTERVAL_MS;
}

export function commitCollectionControlUpdate<E, R>(
  desiredState: Ref.Ref<CollectionControl>,
  appliedState: Ref.Ref<CollectionControl>,
  update: (current: CollectionControl) => CollectionControl,
  apply: (previous: CollectionControl, next: CollectionControl) => Effect.Effect<void, E, R>,
): Effect.Effect<readonly [CollectionControl, CollectionControl], E, R> {
  return Effect.gen(function* () {
    const [previousDesired, next] = yield* Ref.modify(desiredState, (previous) => {
      const next = update(previous);
      return [[previous, next] as const, next];
    });
    const previousApplied = yield* Ref.get(appliedState);
    yield* apply(previousApplied, next);
    yield* Ref.set(appliedState, next);
    return [previousDesired, next] as const;
  });
}

export function synchronizeCollectionControlOnStart<E1, R1, E2, R2>(
  mutex: Semaphore.Semaphore,
  desiredState: Ref.Ref<CollectionControl>,
  appliedState: Ref.Ref<CollectionControl>,
  apply: (control: CollectionControl) => Effect.Effect<void, E1, R1>,
  markReady: Effect.Effect<void, E2, R2>,
) {
  return mutex.withPermits(1)(
    Effect.gen(function* () {
      const control = yield* Ref.get(desiredState);
      yield* apply(control);
      yield* Ref.set(appliedState, control);
      yield* markReady;
      return control;
    }),
  );
}

export function retainRecentNativeTelemetryFailures(
  failures: ReadonlyArray<number>,
  now: number,
): ReadonlyArray<number> {
  return failures.filter((failedAt) => now - failedAt <= FAILURE_WINDOW_MS);
}

export function canRequestNativeTelemetryRetry(
  status: ResourceTelemetrySourceStatus,
  hasHandle: boolean,
): boolean {
  return status !== "healthy" && status !== "starting" && !hasHandle;
}

export function canCommandNativeTelemetrySidecar(
  status: ResourceTelemetrySourceStatus,
  hasHandle: boolean,
): boolean {
  return hasHandle && (status === "healthy" || status === "degraded");
}

/** @public Service construction is part of the canonical Effect module API. */
export const layerTest = (
  overrides: Partial<NativeTelemetryClient["Service"]> = {},
): Layer.Layer<NativeTelemetryClient> => {
  const health =
    overrides.health ??
    Effect.succeed({
      status: "unavailable" as const,
      hello: Option.none<ResourceMonitorHelloEvent>(),
      lastSampleAt: Option.none<DateTime.Utc>(),
      lastError: Option.some("Process telemetry is not collected by Pied Piper."),
      restartCount: 0,
      sampleIntervalMs: UNKNOWN_BACKGROUND_SAMPLE_INTERVAL_MS,
    });
  return Layer.succeed(
    NativeTelemetryClient,
    NativeTelemetryClient.of({
      capabilities: Effect.succeed({
        cumulativeCpuTime: true,
        currentCpuPercent: true,
        residentMemory: true,
        virtualMemory: true,
        ioBytes: true,
        processStartTime: true,
        processTree: true,
      }),
      snapshots: Stream.empty,
      readHistory: () =>
        Effect.fail(
          new NativeTelemetryUnavailable({
            reason: "Process telemetry is not collected by Pied Piper.",
          }),
        ),
      setExternalProcesses: () => Effect.void,
      setHostPowerState: () => Effect.void,
      sampleNow: Effect.fail(
        new NativeTelemetryUnavailable({
          reason: "Process telemetry is not collected by Pied Piper.",
        }),
      ),
      processTable: Effect.fail(
        new NativeTelemetryUnavailable({
          reason: "Process telemetry is not collected by Pied Piper.",
        }),
      ),
      retry: Effect.succeed(false),
      health,
      subscribeHealth:
        overrides.subscribeHealth ??
        health.pipe(
          Effect.map((initial) => ({
            latest: initial,
            changes: Stream.empty,
          })),
        ),
      ...overrides,
    }),
  );
};

export const layer = layerTest({
  capabilities: Effect.succeed({
    cumulativeCpuTime: false,
    currentCpuPercent: false,
    residentMemory: false,
    virtualMemory: false,
    ioBytes: false,
    processStartTime: false,
    processTree: false,
  }),
});
export const make = () =>
  Effect.gen(function* () {
    return yield* NativeTelemetryClient;
  }).pipe(Effect.provide(layer));
