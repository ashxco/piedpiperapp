// @effect-diagnostics nodeBuiltinImport:off
import * as NodeFS from "node:fs";
import * as NodeOS from "node:os";

import { assert, expect, it } from "@effect/vitest";
import * as ConfigProvider from "effect/ConfigProvider";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Path from "effect/Path";
import * as Redacted from "effect/Redacted";
import * as Schema from "effect/Schema";

import {
  DesktopBackendBootstrap,
  type DesktopBackendBootstrap as DesktopBackendBootstrapValue,
} from "@piedpiperapp/contracts";
import * as NetService from "@piedpiperapp/shared/Net";
import { DEFAULT_SIGNAL_EXPORT } from "@piedpiperapp/shared/observability";
import * as OtelEnvironment from "@piedpiperapp/shared/otelEnvironment";
import * as NodeServices from "@effect/platform-node/NodeServices";
import { deriveServerPaths } from "../config.ts";
import { resolveServerConfig } from "./config.ts";

const deriveExplicitServerPaths = (baseDir: string, devUrl: URL | undefined) =>
  deriveServerPaths(baseDir, devUrl, { baseDirIsExplicit: true });

const minimalDesktopFlags = (baseDir: string) => ({
  mode: Option.some("desktop" as const),
  port: Option.some(4888),
  host: Option.none<string>(),
  baseDir: Option.some(baseDir),
  cwd: Option.none<string>(),
  devUrl: Option.none<URL>(),
  noBrowser: Option.none<boolean>(),
  bootstrapFd: Option.none<number>(),
  autoBootstrapProjectFromCwd: Option.none<boolean>(),
  logWebSocketEvents: Option.none<boolean>(),
  tailscaleServeEnabled: Option.none<boolean>(),
  tailscaleServePort: Option.none<number>(),
});

const encodeDesktopBootstrap = Schema.encodeEffect(Schema.fromJsonString(DesktopBackendBootstrap));
const encodeUnknownJson = Schema.encodeEffect(Schema.fromJsonString(Schema.Unknown));

const makeDesktopBootstrap = (
  overrides: Partial<DesktopBackendBootstrapValue> = {},
): DesktopBackendBootstrapValue => ({
  mode: "desktop",
  noBrowser: true,
  port: 4888,
  piedPiperHome: "/tmp/piedpiperapp-bootstrap-home",
  host: "127.0.0.1",
  desktopBootstrapToken: "desktop-bootstrap-token",
  tailscaleServeEnabled: false,
  tailscaleServePort: 443,
  ...overrides,
});

it.layer(NodeServices.layer)("cli config resolution", (it) => {
  const defaultObservabilityConfig = {
    traceMinLevel: "Info",
    traceTimingEnabled: false,
    traceBatchWindowMs: 1_000,
    traceMaxBytes: 10 * 1024 * 1024,
    traceMaxFiles: 10,
    otlpTracesUrl: undefined,
    otlpMetricsUrl: undefined,
    otlpLogsUrl: undefined,
    otlpTracesExport: DEFAULT_SIGNAL_EXPORT,
    otlpMetricsExport: DEFAULT_SIGNAL_EXPORT,
    otlpLogsExport: DEFAULT_SIGNAL_EXPORT,
    otelEnvironment: OtelEnvironment.none,
    devAllowedOrigins: [],
  } as const;

  const openBootstrapFd = Effect.fn(function* (payload: DesktopBackendBootstrapValue) {
    const fs = yield* FileSystem.FileSystem;
    const filePath = yield* fs.makeTempFileScoped({
      prefix: "piedpiperapp-bootstrap-",
      suffix: ".ndjson",
    });
    const encoded = yield* encodeDesktopBootstrap(payload);
    yield* fs.writeFileString(filePath, `${encoded}\n`);
    return yield* Effect.acquireRelease(
      Effect.sync(() => NodeFS.openSync(filePath, "r")),
      // Without a /proc or /dev/fd path to reopen, the reader consumes the fd
      // itself (autoClose), so on Windows it is already closed here.
      (fd) =>
        Effect.sync(() => {
          try {
            NodeFS.closeSync(fd);
          } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== "EBADF") throw error;
          }
        }),
    );
  });

  it.effect("keeps stale records and supervised startup out of the manual launch preflight", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const root = yield* fs.makeTempDirectoryScoped({ prefix: "piedpiperapp-cli-preflight-" });
      for (const [name, pid, mode, rejectRunningServer] of [
        ["stale", 2_147_483_647, "web", true],
        ["desktop", process.pid, "desktop", true],
        ["serve", process.pid, "web", false],
      ] as const) {
        const baseDir = path.join(root, name);
        const stateDir = path.join(baseDir, "userdata");
        yield* fs.makeDirectory(stateDir, { recursive: true });
        yield* fs.writeFileString(
          path.join(stateDir, "server-runtime.json"),
          yield* encodeUnknownJson({
            version: 1,
            pid,
            port: 3773,
            origin: "http://127.0.0.1:3773",
            startedAt: "2026-10-01T00:00:00.000Z",
          }),
        );
        const cwd = path.join(root, `${name}-project`);
        const config = yield* resolveServerConfig(
          {
            ...minimalWebFlags(baseDir),
            mode: Option.some(mode),
            port: Option.some(8788),
            cwd: Option.some(cwd),
          },
          Option.none(),
          { rejectRunningServer },
        ).pipe(
          Effect.provide(
            Layer.merge(
              NetService.layer,
              ConfigProvider.layer(ConfigProvider.fromEnv({ env: {} })),
            ),
          ),
        );
        expect(config.cwd).toBe(cwd);
        expect(yield* fs.exists(cwd)).toBe(true);
      }
    }),
  );

  it.effect("enables a trimmed reusable auth token only for web dev mode", () =>
    Effect.gen(function* () {
      const baseDir = yield* FileSystem.FileSystem.pipe(
        Effect.flatMap((fs) =>
          fs.makeTempDirectoryScoped({ prefix: "piedpiperapp-cli-dev-auth-" }),
        ),
      );
      const flags = {
        mode: Option.some("web" as const),
        port: Option.some(8788),
        host: Option.none<string>(),
        baseDir: Option.some(baseDir),
        cwd: Option.none<string>(),
        devUrl: Option.some(new URL("http://127.0.0.1:5173")),
        noBrowser: Option.none<boolean>(),
        bootstrapFd: Option.none<number>(),
        autoBootstrapProjectFromCwd: Option.none<boolean>(),
        logWebSocketEvents: Option.none<boolean>(),
        tailscaleServeEnabled: Option.none<boolean>(),
        tailscaleServePort: Option.none<number>(),
      };
      const layerConfig = ConfigProvider.layer(
        ConfigProvider.fromEnv({
          env: {
            PIEDPIPER_DEV_AUTH_TOKEN: "  reusable-dev-auth-token-that-is-long-enough  ",
          },
        }),
      );
      const web = yield* resolveServerConfig(flags, Option.none()).pipe(
        Effect.provide(Layer.mergeAll(layerConfig, NetService.layer)),
      );
      const desktop = yield* resolveServerConfig(
        { ...flags, mode: Option.some("desktop" as const) },
        Option.none(),
      ).pipe(Effect.provide(Layer.mergeAll(layerConfig, NetService.layer)));

      expect(web.devAuthToken).toBeDefined();
      if (web.devAuthToken === undefined) {
        return yield* Effect.die("Expected reusable dev auth token.");
      }
      expect(Redacted.value(web.devAuthToken)).toBe("reusable-dev-auth-token-that-is-long-enough");
      expect(desktop.devAuthToken).toBeUndefined();
    }),
  );

  it.effect("does not expose an invalid reusable auth token", () =>
    Effect.gen(function* () {
      const secret = "short-secret";
      const baseDir = yield* FileSystem.FileSystem.pipe(
        Effect.flatMap((fs) =>
          fs.makeTempDirectoryScoped({ prefix: "piedpiperapp-cli-dev-auth-invalid-" }),
        ),
      );
      const flags = {
        mode: Option.some("web" as const),
        port: Option.some(8788),
        host: Option.none<string>(),
        baseDir: Option.some(baseDir),
        cwd: Option.none<string>(),
        devUrl: Option.some(new URL("http://127.0.0.1:5173")),
        noBrowser: Option.none<boolean>(),
        bootstrapFd: Option.none<number>(),
        autoBootstrapProjectFromCwd: Option.none<boolean>(),
        logWebSocketEvents: Option.none<boolean>(),
        tailscaleServeEnabled: Option.none<boolean>(),
        tailscaleServePort: Option.none<number>(),
      };
      const layerConfig = ConfigProvider.layer(
        ConfigProvider.fromEnv({ env: { PIEDPIPER_DEV_AUTH_TOKEN: secret } }),
      );
      const error = yield* resolveServerConfig(flags, Option.none()).pipe(
        Effect.provide(Layer.mergeAll(layerConfig, NetService.layer)),
        Effect.flip,
      );
      const desktop = yield* resolveServerConfig(
        { ...flags, mode: Option.some("desktop" as const) },
        Option.none(),
      ).pipe(Effect.provide(Layer.mergeAll(layerConfig, NetService.layer)));
      const staticWeb = yield* resolveServerConfig(
        { ...flags, devUrl: Option.none() },
        Option.none(),
      ).pipe(Effect.provide(Layer.mergeAll(layerConfig, NetService.layer)));

      expect(String(error)).not.toContain(secret);
      const serialized = yield* encodeUnknownJson(error);
      expect(serialized).not.toContain(secret);
      expect(desktop.devAuthToken).toBeUndefined();
      expect(staticWeb.devAuthToken).toBeUndefined();
    }),
  );

  it.effect("falls back to effect/config values when flags are omitted", () =>
    Effect.gen(function* () {
      const { join } = yield* Path.Path;
      const baseDir = join(NodeOS.tmpdir(), "piedpiperapp-cli-config-env-base");
      const derivedPaths = yield* deriveExplicitServerPaths(
        baseDir,
        new URL("http://127.0.0.1:5173"),
      );
      const resolved = yield* resolveServerConfig(
        {
          mode: Option.none(),
          port: Option.none(),
          host: Option.none(),
          baseDir: Option.none(),
          cwd: Option.none(),
          devUrl: Option.none(),
          noBrowser: Option.none(),
          bootstrapFd: Option.none(),
          autoBootstrapProjectFromCwd: Option.none(),
          logWebSocketEvents: Option.none(),
          tailscaleServeEnabled: Option.none(),
          tailscaleServePort: Option.none(),
        },
        Option.none(),
      ).pipe(
        Effect.provide(
          Layer.mergeAll(
            ConfigProvider.layer(
              ConfigProvider.fromEnv({
                env: {
                  PIEDPIPER_LOG_LEVEL: "Warn",
                  PIEDPIPER_MODE: "desktop",
                  PIEDPIPER_PORT: "4001",
                  PIEDPIPER_HOST: "0.0.0.0",
                  PIEDPIPER_HOME: baseDir,
                  VITE_DEV_SERVER_URL: "http://127.0.0.1:5173",
                  PIEDPIPER_DEV_ALLOWED_ORIGINS:
                    "https://host.example.ts.net, https://phone.example.ts.net ",
                  PIEDPIPER_NO_BROWSER: "true",
                  PIEDPIPER_AUTO_BOOTSTRAP_PROJECT_FROM_CWD: "false",
                  PIEDPIPER_LOG_WS_EVENTS: "true",
                },
              }),
            ),
            NetService.layer,
          ),
        ),
      );

      expect(resolved).toEqual({
        logLevel: "Warn",
        ...defaultObservabilityConfig,
        mode: "desktop",
        port: 4001,
        cwd: process.cwd(),
        baseDir,
        ...derivedPaths,
        host: "0.0.0.0",
        staticDir: undefined,
        devUrl: new URL("http://127.0.0.1:5173"),
        devAllowedOrigins: ["https://host.example.ts.net", "https://phone.example.ts.net"],
        noBrowser: true,
        startupPresentation: "browser",
        desktopBootstrapToken: undefined,
        autoBootstrapProjectFromCwd: false,
        logWebSocketEvents: true,
        tailscaleServeEnabled: false,
        tailscaleServePort: 443,
      });
      assert.equal(resolved.stateDir, join(baseDir, "userdata"));
    }),
  );

  it.effect("uses CLI flags when provided", () =>
    Effect.gen(function* () {
      const { join } = yield* Path.Path;
      const baseDir = join(NodeOS.tmpdir(), "piedpiperapp-cli-config-flags-base");
      const derivedPaths = yield* deriveExplicitServerPaths(
        baseDir,
        new URL("http://127.0.0.1:4173"),
      );
      const resolved = yield* resolveServerConfig(
        {
          mode: Option.some("web"),
          port: Option.some(8788),
          host: Option.some("127.0.0.1"),
          baseDir: Option.some(baseDir),
          cwd: Option.none(),
          devUrl: Option.some(new URL("http://127.0.0.1:4173")),
          noBrowser: Option.some(true),
          bootstrapFd: Option.none(),
          autoBootstrapProjectFromCwd: Option.some(true),
          logWebSocketEvents: Option.some(true),
          tailscaleServeEnabled: Option.some(true),
          tailscaleServePort: Option.some(8443),
        },
        Option.some("Debug"),
      ).pipe(
        Effect.provide(
          Layer.mergeAll(
            ConfigProvider.layer(
              ConfigProvider.fromEnv({
                env: {
                  PIEDPIPER_LOG_LEVEL: "Warn",
                  PIEDPIPER_MODE: "desktop",
                  PIEDPIPER_PORT: "4001",
                  PIEDPIPER_HOST: "0.0.0.0",
                  PIEDPIPER_HOME: join(NodeOS.tmpdir(), "ignored-base"),
                  VITE_DEV_SERVER_URL: "http://127.0.0.1:5173",
                  PIEDPIPER_NO_BROWSER: "false",
                  PIEDPIPER_AUTO_BOOTSTRAP_PROJECT_FROM_CWD: "false",
                  PIEDPIPER_LOG_WS_EVENTS: "false",
                },
              }),
            ),
            NetService.layer,
          ),
        ),
      );

      expect(resolved).toEqual({
        logLevel: "Debug",
        ...defaultObservabilityConfig,
        mode: "web",
        port: 8788,
        cwd: process.cwd(),
        baseDir,
        ...derivedPaths,
        host: "127.0.0.1",
        staticDir: undefined,
        devUrl: new URL("http://127.0.0.1:4173"),
        noBrowser: true,
        startupPresentation: "browser",
        desktopBootstrapToken: undefined,
        autoBootstrapProjectFromCwd: true,
        logWebSocketEvents: true,
        tailscaleServeEnabled: true,
        tailscaleServePort: 8443,
      });
      assert.equal(resolved.dbPath, join(baseDir, "userdata", "statev2.sqlite"));
    }),
  );

  it.effect("preserves explicit false CLI boolean flags over env and bootstrap values", () =>
    Effect.gen(function* () {
      const { join } = yield* Path.Path;
      const baseDir = join(NodeOS.tmpdir(), "piedpiperapp-cli-config-false-flags");
      const fd = yield* openBootstrapFd(
        makeDesktopBootstrap({
          noBrowser: true,
          tailscaleServeEnabled: false,
          tailscaleServePort: 443,
        }),
      );
      const derivedPaths = yield* deriveExplicitServerPaths(
        baseDir,
        new URL("http://127.0.0.1:4173"),
      );

      const resolved = yield* resolveServerConfig(
        {
          mode: Option.some("web"),
          port: Option.some(8788),
          host: Option.some("127.0.0.1"),
          baseDir: Option.some(baseDir),
          cwd: Option.none(),
          devUrl: Option.some(new URL("http://127.0.0.1:4173")),
          noBrowser: Option.some(false),
          bootstrapFd: Option.none(),
          autoBootstrapProjectFromCwd: Option.some(false),
          logWebSocketEvents: Option.some(false),
          tailscaleServeEnabled: Option.none(),
          tailscaleServePort: Option.none(),
        },
        Option.none(),
      ).pipe(
        Effect.provide(
          Layer.mergeAll(
            ConfigProvider.layer(
              ConfigProvider.fromEnv({
                env: {
                  PIEDPIPER_BOOTSTRAP_FD: String(fd),
                  PIEDPIPER_NO_BROWSER: "true",
                  PIEDPIPER_AUTO_BOOTSTRAP_PROJECT_FROM_CWD: "true",
                  PIEDPIPER_LOG_WS_EVENTS: "true",
                },
              }),
            ),
            NetService.layer,
          ),
        ),
      );

      expect(resolved).toEqual({
        logLevel: "Info",
        ...defaultObservabilityConfig,
        mode: "web",
        port: 8788,
        cwd: process.cwd(),
        baseDir,
        ...derivedPaths,
        host: "127.0.0.1",
        staticDir: undefined,
        devUrl: new URL("http://127.0.0.1:4173"),
        noBrowser: false,
        startupPresentation: "browser",
        desktopBootstrapToken: "desktop-bootstrap-token",
        autoBootstrapProjectFromCwd: false,
        logWebSocketEvents: false,
        tailscaleServeEnabled: false,
        tailscaleServePort: 443,
      });
    }),
  );

  it.effect("uses bootstrap envelope values as fallbacks when flags and env are absent", () =>
    Effect.gen(function* () {
      const { join, resolve } = yield* Path.Path;
      // The resolver absolutises the configured home, so the expectation must
      // carry the host's drive on Windows.
      const baseDir = resolve("/tmp/piedpiperapp-bootstrap-home");
      const fd = yield* openBootstrapFd(
        makeDesktopBootstrap({
          port: 4888,
          host: "127.0.0.2",
          piedPiperHome: "/tmp/piedpiperapp-bootstrap-home",
          noBrowser: true,
          desktopBootstrapToken: "desktop-token",
          desktopTelemetryFd: 4,
          desktopTelemetryControlFd: 5,
          tailscaleServeEnabled: false,
          tailscaleServePort: 443,
          otlpTracesUrl: "http://localhost:4318/v1/traces",
          otlpMetricsUrl: "http://localhost:4318/v1/metrics",
          otlpLogsUrl: "http://localhost:4318/v1/logs",
        }),
      );
      const derivedPaths = yield* deriveServerPaths(baseDir, undefined);

      const resolved = yield* resolveServerConfig(
        {
          mode: Option.none(),
          port: Option.none(),
          host: Option.none(),
          baseDir: Option.none(),
          cwd: Option.none(),
          devUrl: Option.none(),
          noBrowser: Option.none(),
          bootstrapFd: Option.none(),
          autoBootstrapProjectFromCwd: Option.none(),
          logWebSocketEvents: Option.none(),
          tailscaleServeEnabled: Option.none(),
          tailscaleServePort: Option.none(),
        },
        Option.none(),
      ).pipe(
        Effect.provide(
          Layer.mergeAll(
            ConfigProvider.layer(
              ConfigProvider.fromEnv({
                env: {
                  PIEDPIPER_BOOTSTRAP_FD: String(fd),
                },
              }),
            ),
            NetService.layer,
          ),
        ),
      );

      expect(resolved).toEqual({
        logLevel: "Info",
        ...defaultObservabilityConfig,
        otlpTracesUrl: undefined,
        otlpMetricsUrl: undefined,
        otlpLogsUrl: undefined,
        mode: "desktop",
        port: 4888,
        cwd: process.cwd(),
        baseDir,
        ...derivedPaths,
        host: "127.0.0.2",
        staticDir: resolved.staticDir,
        devUrl: undefined,
        noBrowser: true,
        startupPresentation: "browser",
        desktopBootstrapToken: "desktop-token",
        desktopTelemetryFd: 4,
        desktopTelemetryControlFd: 5,
        resourceMonitorPath: undefined,
        autoBootstrapProjectFromCwd: false,
        logWebSocketEvents: false,
        tailscaleServeEnabled: false,
        tailscaleServePort: 443,
      });
      assert.equal(join(baseDir, "userdata"), resolved.stateDir);
      assert.equal(resolved.desktopTelemetryFd, 4);
      assert.equal(resolved.desktopTelemetryControlFd, 5);
    }),
  );

  it.effect("carries the desktop's shell environment handoff only when the envelope sets it", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const baseDir = yield* fs.makeTempDirectoryScoped({
        prefix: "piedpiperapp-cli-config-shell-env-",
      });
      const resolveWith = Effect.fn(function* (overrides: Partial<DesktopBackendBootstrapValue>) {
        const fd = yield* openBootstrapFd(makeDesktopBootstrap(overrides));
        return yield* resolveServerConfig(
          {
            ...minimalDesktopFlags(baseDir),
            bootstrapFd: Option.some(fd),
          },
          Option.none(),
        ).pipe(
          Effect.provide(
            Layer.mergeAll(
              ConfigProvider.layer(ConfigProvider.fromEnv({ env: {} })),
              NetService.layer,
            ),
          ),
        );
      });

      assert.equal((yield* resolveWith({})).shellEnvironmentPrepared, undefined);
      assert.equal(
        (yield* resolveWith({ shellEnvironmentPrepared: true })).shellEnvironmentPrepared,
        true,
      );
    }),
  );

  it.effect("creates derived runtime directories during config resolution", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const baseDir = yield* fs.makeTempDirectoryScoped({
        prefix: "piedpiperapp-cli-config-dirs-",
      });
      const customCwd = path.join(baseDir, "nested", "project");

      const resolved = yield* resolveServerConfig(
        {
          mode: Option.some("desktop"),
          port: Option.some(4888),
          host: Option.none(),
          baseDir: Option.some(baseDir),
          cwd: Option.some(customCwd),
          devUrl: Option.some(new URL("http://127.0.0.1:5173")),
          noBrowser: Option.none(),
          bootstrapFd: Option.none(),
          autoBootstrapProjectFromCwd: Option.none(),
          logWebSocketEvents: Option.none(),
          tailscaleServeEnabled: Option.none(),
          tailscaleServePort: Option.none(),
        },
        Option.none(),
      ).pipe(
        Effect.provide(
          Layer.mergeAll(
            ConfigProvider.layer(ConfigProvider.fromEnv({ env: {} })),
            NetService.layer,
          ),
        ),
      );

      for (const directory of [
        customCwd,
        resolved.stateDir,
        resolved.logsDir,
        resolved.providerLogsDir,
        resolved.terminalLogsDir,
        resolved.attachmentsDir,
        resolved.worktreesDir,
        path.dirname(resolved.serverTracePath),
      ]) {
        expect(yield* fs.exists(directory)).toBe(true);
      }
      expect(resolved.cwd).toBe(path.resolve(customCwd));
    }),
  );

  it.effect("applies flag then env precedence over bootstrap envelope values", () =>
    Effect.gen(function* () {
      const { join } = yield* Path.Path;
      const baseDir = join(NodeOS.tmpdir(), "piedpiperapp-cli-config-env-wins");
      const fd = yield* openBootstrapFd(
        makeDesktopBootstrap({
          port: 4888,
          host: "127.0.0.2",
          piedPiperHome: "/tmp/piedpiperapp-bootstrap-home",
          noBrowser: false,
          desktopBootstrapToken: "desktop-token",
          tailscaleServeEnabled: false,
          tailscaleServePort: 443,
        }),
      );
      const derivedPaths = yield* deriveExplicitServerPaths(
        baseDir,
        new URL("http://127.0.0.1:4173"),
      );

      const resolved = yield* resolveServerConfig(
        {
          mode: Option.none(),
          port: Option.some(8788),
          host: Option.some("127.0.0.1"),
          baseDir: Option.none(),
          cwd: Option.none(),
          devUrl: Option.some(new URL("http://127.0.0.1:4173")),
          noBrowser: Option.none(),
          bootstrapFd: Option.none(),
          autoBootstrapProjectFromCwd: Option.none(),
          logWebSocketEvents: Option.none(),
          tailscaleServeEnabled: Option.none(),
          tailscaleServePort: Option.none(),
        },
        Option.some("Debug"),
      ).pipe(
        Effect.provide(
          Layer.mergeAll(
            ConfigProvider.layer(
              ConfigProvider.fromEnv({
                env: {
                  PIEDPIPER_MODE: "web",
                  PIEDPIPER_BOOTSTRAP_FD: String(fd),
                  PIEDPIPER_HOME: baseDir,
                  PIEDPIPER_NO_BROWSER: "true",
                  PIEDPIPER_AUTO_BOOTSTRAP_PROJECT_FROM_CWD: "true",
                  PIEDPIPER_LOG_WS_EVENTS: "true",
                },
              }),
            ),
            NetService.layer,
          ),
        ),
      );

      expect(resolved).toEqual({
        logLevel: "Debug",
        ...defaultObservabilityConfig,
        mode: "web",
        port: 8788,
        cwd: process.cwd(),
        baseDir,
        ...derivedPaths,
        host: "127.0.0.1",
        staticDir: undefined,
        devUrl: new URL("http://127.0.0.1:4173"),
        noBrowser: true,
        startupPresentation: "browser",
        desktopBootstrapToken: "desktop-token",
        autoBootstrapProjectFromCwd: true,
        logWebSocketEvents: true,
        tailscaleServeEnabled: false,
        tailscaleServePort: 443,
      });
    }),
  );

  it.effect("zeroes an endpoint stored in Settings when the SDK is disabled", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const baseDir = yield* fs.makeTempDirectoryScoped({
        prefix: "piedpiperapp-cli-config-otel-off-",
      });
      const derivedPaths = yield* deriveExplicitServerPaths(baseDir, undefined);
      yield* fs.makeDirectory(path.dirname(derivedPaths.settingsPath), { recursive: true });
      yield* fs.writeFileString(
        derivedPaths.settingsPath,
        `${JSON.stringify({
          observability: {
            otlpTracesUrl: "http://localhost:4318/v1/traces",
            otlpMetricsUrl: "http://localhost:4318/v1/metrics",
            otlpLogsUrl: "http://localhost:4318/v1/logs",
          },
        })}\n`,
      );

      const resolved = yield* resolveServerConfig(
        {
          mode: Option.some("desktop"),
          port: Option.some(4888),
          host: Option.none(),
          baseDir: Option.some(baseDir),
          cwd: Option.none(),
          devUrl: Option.none(),
          noBrowser: Option.none(),
          bootstrapFd: Option.none(),
          autoBootstrapProjectFromCwd: Option.none(),
          logWebSocketEvents: Option.none(),
          tailscaleServeEnabled: Option.none(),
          tailscaleServePort: Option.none(),
        },
        Option.none(),
      ).pipe(
        Effect.provide(
          Layer.mergeAll(
            ConfigProvider.layer(ConfigProvider.fromEnv({ env: { OTEL_SDK_DISABLED: "true" } })),
            NetService.layer,
          ),
        ),
      );

      // The switch beats every source, including an endpoint stored in Settings.
      expect(resolved.otlpTracesUrl).toBeUndefined();
      expect(resolved.otlpMetricsUrl).toBeUndefined();
      expect(resolved.otlpLogsUrl).toBeUndefined();
      expect(resolved.otelEnvironment.disabled).toBe(true);
    }),
  );

  it.effect("forces noBrowser and disables auto-bootstrap for headless startup presentation", () =>
    Effect.gen(function* () {
      const { join } = yield* Path.Path;
      const baseDir = join(NodeOS.tmpdir(), "piedpiperapp-cli-config-headless-base");
      const derivedPaths = yield* deriveExplicitServerPaths(baseDir, undefined);

      const resolved = yield* resolveServerConfig(
        {
          mode: Option.some("web"),
          port: Option.some(3773),
          host: Option.none(),
          baseDir: Option.some(baseDir),
          cwd: Option.none(),
          devUrl: Option.none(),
          noBrowser: Option.none(),
          bootstrapFd: Option.none(),
          autoBootstrapProjectFromCwd: Option.none(),
          logWebSocketEvents: Option.none(),
          tailscaleServeEnabled: Option.none(),
          tailscaleServePort: Option.none(),
        },
        Option.none(),
        {
          startupPresentation: "headless",
        },
      ).pipe(
        Effect.provide(
          Layer.mergeAll(
            ConfigProvider.layer(
              ConfigProvider.fromEnv({
                env: {
                  PIEDPIPER_NO_BROWSER: "false",
                  PIEDPIPER_AUTO_BOOTSTRAP_PROJECT_FROM_CWD: "true",
                },
              }),
            ),
            NetService.layer,
          ),
        ),
      );

      expect(resolved).toEqual({
        logLevel: "Info",
        ...defaultObservabilityConfig,
        mode: "web",
        port: 3773,
        cwd: process.cwd(),
        baseDir,
        ...derivedPaths,
        host: undefined,
        staticDir: resolved.staticDir,
        devUrl: undefined,
        noBrowser: true,
        startupPresentation: "headless",
        desktopBootstrapToken: undefined,
        autoBootstrapProjectFromCwd: false,
        logWebSocketEvents: false,
        tailscaleServeEnabled: false,
        tailscaleServePort: 443,
      });
    }),
  );

  const minimalWebFlags = (baseDir: string) => ({
    mode: Option.some("web" as const),
    port: Option.some(3773),
    host: Option.none<string>(),
    baseDir: Option.some(baseDir),
    cwd: Option.none<string>(),
    devUrl: Option.none<URL>(),
    noBrowser: Option.none<boolean>(),
    bootstrapFd: Option.none<number>(),
    autoBootstrapProjectFromCwd: Option.none<boolean>(),
    logWebSocketEvents: Option.none<boolean>(),
    tailscaleServeEnabled: Option.none<boolean>(),
    tailscaleServePort: Option.none<number>(),
  });
});
