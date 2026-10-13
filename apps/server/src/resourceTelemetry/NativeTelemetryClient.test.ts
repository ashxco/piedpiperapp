import { assert, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as NativeTelemetryClient from "./NativeTelemetryClient.ts";

it.effect("does not spawn or sample a resource monitor, including after retry", () =>
  Effect.gen(function* () {
    const service = yield* NativeTelemetryClient.NativeTelemetryClient;
    assert.isFalse(yield* service.retry);
    assert.isFalse((yield* service.capabilities).processTree);
    assert.isTrue(Exit.isFailure(yield* Effect.exit(service.sampleNow)));
    assert.isTrue(Exit.isFailure(yield* Effect.exit(service.processTable)));
    assert.strictEqual((yield* service.health).status, "unavailable");
  }).pipe(Effect.provide(NativeTelemetryClient.layer)),
);
