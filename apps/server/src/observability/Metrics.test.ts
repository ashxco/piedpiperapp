import { assert, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Metric from "effect/Metric";
import { increment, withMetrics } from "./Metrics.ts";

it.effect("preserves results without recording counters, timing, or lazy attributes", () =>
  Effect.gen(function* () {
    const counter = Metric.counter("pied_piper_privacy_counter");
    const timer = Metric.timer("pied_piper_privacy_timer");
    let attributesRead = false;
    const result = yield* Effect.succeed("ok").pipe(
      withMetrics({
        counter,
        timer,
        attributes: () => {
          attributesRead = true;
          return { private: "value" };
        },
      }),
    );
    yield* increment(counter, { private: "value" });
    assert.equal(result, "ok");
    assert.isFalse(attributesRead);
    assert.isFalse(
      (yield* Metric.snapshot).some((entry) => entry.id.startsWith("pied_piper_privacy_")),
    );
  }),
);
it.effect("preserves failures without recording metrics", () =>
  Effect.gen(function* () {
    const result = yield* Effect.exit(withMetrics(Effect.fail("failure"), {}));
    assert.isTrue(Exit.isFailure(result));
  }),
);
