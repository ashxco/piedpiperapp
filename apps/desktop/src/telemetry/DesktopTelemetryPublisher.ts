import {
  DesktopHostTelemetryMessage,
  type DesktopHostTelemetrySnapshot,
  type DesktopTelemetryControlMessage,
  type DesktopTelemetryCancelDesktopUpdate,
  type DesktopTelemetryCommitDesktopUpdate,
  type DesktopTelemetryRequestDesktopUpdate,
  type DesktopUpdateStatusReport,
} from "@piedpiperapp/contracts";

import * as Context from "effect/Context";

import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as PubSub from "effect/PubSub";
import * as Queue from "effect/Queue";
import * as Ref from "effect/Ref";
import * as Schema from "effect/Schema";
import * as Stream from "effect/Stream";

export class DesktopTelemetryPublisher extends Context.Service<
  DesktopTelemetryPublisher,
  {
    readonly latest: Effect.Effect<Option.Option<DesktopHostTelemetrySnapshot>>;
    readonly changes: Stream.Stream<DesktopHostTelemetrySnapshot>;
    readonly encoded: Stream.Stream<Uint8Array>;
    readonly handleControlForSource: (
      sourceId: string,
      message: DesktopTelemetryControlMessage,
    ) => Effect.Effect<void>;
    readonly removeControlSource: (sourceId: string) => Effect.Effect<void>;
    /** Sends the report to the attached backend and replays the latest one
        to backends that attach later (including the one spawned after a
        relaunch). */
    readonly publishUpdateReport: (report: DesktopUpdateStatusReport) => Effect.Effect<void>;
    /** Update requests received over the control channel. Single consumer. */
    readonly updateRequests: Stream.Stream<DesktopTelemetryRequestDesktopUpdate>;
    readonly updateCommits: Stream.Stream<DesktopTelemetryCommitDesktopUpdate>;
    readonly updateCancellations: Stream.Stream<DesktopTelemetryCancelDesktopUpdate>;
  }
>()("@piedpiperapp/desktop/telemetry/DesktopTelemetryPublisher") {}

// The IPC channel also carries desktop update commands. Preserve that protocol
// without starting process, renderer, battery, or idle-time sampling.
const encodeMessage = Schema.encodeSync(Schema.fromJsonString(DesktopHostTelemetryMessage));
const textEncoder = new TextEncoder();

export const make = Effect.fn("desktop.updateChannel.make")(function* () {
  const latest = yield* Ref.make(Option.none<DesktopHostTelemetrySnapshot>());
  const changes = yield* PubSub.sliding<DesktopHostTelemetrySnapshot>(8);
  const latestUpdateReport = yield* Ref.make(Option.none<DesktopUpdateStatusReport>());
  const updateReportChanges = yield* PubSub.sliding<DesktopUpdateStatusReport>(16);
  const updateRequestQueue = yield* Queue.unbounded<DesktopTelemetryRequestDesktopUpdate>();
  const updateCommitQueue = yield* Queue.unbounded<DesktopTelemetryCommitDesktopUpdate>();
  const updateCancellationQueue = yield* Queue.unbounded<DesktopTelemetryCancelDesktopUpdate>();

  const handleControlForSource: DesktopTelemetryPublisher["Service"]["handleControlForSource"] = (
    _sourceId,
    message,
  ) => {
    switch (message.type) {
      case "requestDesktopUpdate":
        return Queue.offer(updateRequestQueue, message).pipe(Effect.asVoid);
      case "commitDesktopUpdate":
        return Queue.offer(updateCommitQueue, message).pipe(Effect.asVoid);
      case "cancelDesktopUpdate":
        return Queue.offer(updateCancellationQueue, message).pipe(Effect.asVoid);
      default:
        return Effect.void;
    }
  };
  const removeControlSource = (_sourceId: string) => Effect.void;

  const snapshots = Stream.unwrap(
    Effect.gen(function* () {
      const subscription = yield* PubSub.subscribe(changes);
      const initial = yield* Ref.get(latest);
      return Stream.concat(
        Option.match(initial, {
          onNone: () => Stream.empty,
          onSome: Stream.make,
        }),
        Stream.fromSubscription(subscription),
      );
    }),
  );
  const updateReports = Stream.unwrap(
    Effect.gen(function* () {
      const subscription = yield* PubSub.subscribe(updateReportChanges);
      const initial = yield* Ref.get(latestUpdateReport);
      return Stream.concat(
        Option.match(initial, {
          onNone: () => Stream.empty,
          onSome: Stream.make,
        }),
        Stream.fromSubscription(subscription),
      );
    }),
  );
  const encoded = Stream.concat(
    Stream.make({
      version: 1,
      type: "desktopTelemetryHello",
      electronPid: process.pid,
    } as const),
    Stream.merge(snapshots, updateReports),
  ).pipe(Stream.map((message) => textEncoder.encode(`${encodeMessage(message)}\n`)));

  const publishUpdateReport: DesktopTelemetryPublisher["Service"]["publishUpdateReport"] = (
    report,
  ) =>
    Ref.set(latestUpdateReport, Option.some(report)).pipe(
      Effect.andThen(PubSub.publish(updateReportChanges, report)),
      Effect.asVoid,
    );

  return DesktopTelemetryPublisher.of({
    latest: Ref.get(latest),
    changes: Stream.fromPubSub(changes),
    encoded,
    handleControlForSource,
    removeControlSource,
    publishUpdateReport,
    updateRequests: Stream.fromQueue(updateRequestQueue),
    updateCommits: Stream.fromQueue(updateCommitQueue),
    updateCancellations: Stream.fromQueue(updateCancellationQueue),
  });
});

export const layer = Layer.effect(DesktopTelemetryPublisher, make());
