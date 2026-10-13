import { assert, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as OtlpEndpointCheck from "./OtlpEndpointCheck.ts";

it.effect("rejects legacy diagnostic probes without an HTTP client or network request", () =>
  Effect.gen(function* () {
    const service = yield* OtlpEndpointCheck.OtlpEndpointCheck;
    for (const signal of ["traces", "metrics", "logs"] as const) {
      assert.deepStrictEqual(
        yield* service.check({ signal, url: "https://collector.example.com" }),
        {
          _tag: "Unreachable",
          timedOut: false,
        },
      );
    }
  }).pipe(Effect.provide(OtlpEndpointCheck.layer)),
);
