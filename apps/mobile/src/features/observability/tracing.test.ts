import { assert, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import { vi } from "vite-plus/test";
import * as Tracing from "./tracing";
import { withRelayClientTracing } from "@piedpiperapp/shared/relayTracing";
vi.mock("expo-constants", () => ({ default: { expoConfig: { extra: {} } } }));
it.effect("does not require an HTTP client or export spans when given an endpoint", () =>
  withRelayClientTracing(Effect.void).pipe(
    Effect.withSpan("mobile.private-operation"),
    Effect.provide(
      Tracing.layerFromConfig(
        {
          tracesUrl: "https://collector.example.com",
          tracesDataset: "test",
          tracesToken: "test",
        },
        { appVariant: "test" },
      ),
    ),
    Effect.tap(() => Effect.sync(() => assert.isNull(Tracing.resolveTracingConfig()))),
  ),
);
