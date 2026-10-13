import { assert, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { FetchHttpClient } from "effect/http";
import { vi } from "vite-plus/test";
import * as RelayTracing from "./relayTracing.ts";

it.effect("never sends relay traces even when credentials and an HTTP client are supplied", () => {
  const fetch = vi.fn<typeof globalThis.fetch>();
  const layer = RelayTracing.layer(
    {
      tracesUrl: "https://collector.example.com",
      tracesDataset: "relay",
      tracesToken: "token",
    },
    { serviceName: "test", runtime: "test", client: "test" },
  );
  return Effect.scoped(
    Effect.void.pipe(
      Effect.withSpan("private.operation"),
      RelayTracing.withRelayClientTracing,
      Effect.provide(layer),
      Effect.provide(
        FetchHttpClient.layer.pipe(Layer.provide(Layer.succeed(FetchHttpClient.Fetch, fetch))),
      ),
    ),
  ).pipe(Effect.tap(() => Effect.sync(() => assert.strictEqual(fetch.mock.calls.length, 0))));
});
