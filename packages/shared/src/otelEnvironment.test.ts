import { assert, it } from "@effect/vitest";
import * as ConfigProvider from "effect/ConfigProvider";
import * as Effect from "effect/Effect";
import { DEFAULT_SIGNAL_EXPORT } from "./observability.ts";
import * as OtelEnvironment from "./otelEnvironment.ts";

it.effect("ignores environment and saved endpoints even when export is explicitly enabled", () =>
  Effect.gen(function* () {
    const config = yield* OtelEnvironment.load;
    assert.isTrue(config.disabled);
    for (const signal of ["traces", "metrics", "logs"] as const) {
      assert.isUndefined(
        OtelEnvironment.resolveSignalEndpoint(
          config,
          signal,
          {
            url: "https://collector.example.com",
            export: DEFAULT_SIGNAL_EXPORT,
          },
          "https://saved.example.com",
        ),
      );
    }
  }).pipe(
    Effect.provide(
      ConfigProvider.layer(
        ConfigProvider.fromEnv({
          env: {
            OTEL_SDK_DISABLED: "false",
            PIEDPIPER_OTEL_SDK_DISABLED: "false",
            OTEL_EXPORTER_OTLP_ENDPOINT: "https://collector.example.com",
          },
        }),
      ),
    ),
  ),
);
