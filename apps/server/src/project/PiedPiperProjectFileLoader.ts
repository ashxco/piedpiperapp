/**
 * PiedPiperProjectFileLoader - Effect service that loads the checked-in `piedpiperapp.json`
 * project file from a workspace root.
 *
 * Loading is best-effort: a missing file resolves to `Option.none`, and
 * unreadable or invalid files are logged and treated as absent so callers
 * can fall back to their defaults.
 *
 * @module PiedPiperProjectFileLoader
 */
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Path from "effect/Path";
import * as Schema from "effect/Schema";

import { PIED_PIPER_PROJECT_FILE_NAME, type PiedPiperProjectFile } from "@piedpiperapp/contracts";
import { PiedPiperProjectFileFromJson } from "@piedpiperapp/shared/piedPiperProjectFile";

const decodeT3ProjectFileJson = Schema.decodeEffect(PiedPiperProjectFileFromJson);

export class PiedPiperProjectFileLoadError extends Schema.TaggedError<PiedPiperProjectFileLoadError>()(
  "PiedPiperProjectFileLoadError",
  {
    operation: Schema.Literals(["read", "decode"]),
    workspaceRoot: Schema.String,
    filePath: Schema.String,
    cause: Schema.Defect(),
  },
) {
  override get message(): string {
    return `Failed to ${this.operation} ${PIED_PIPER_PROJECT_FILE_NAME} at ${this.filePath}.`;
  }
}

/** Service tag for piedpiperapp.json project file loading. */
export class PiedPiperProjectFileLoader extends Context.Service<
  PiedPiperProjectFileLoader,
  {
    /**
     * Load and decode `piedpiperapp.json` at the workspace root.
     *
     * Never fails: missing, unreadable, or invalid files resolve to
     * `Option.none` (invalid files are logged as warnings).
     */
    readonly load: (workspaceRoot: string) => Effect.Effect<Option.Option<PiedPiperProjectFile>>;
  }
>()("piedpiperapp/project/PiedPiperProjectFileLoader") {}

const logT3ProjectFileLoadError = (error: PiedPiperProjectFileLoadError) =>
  Effect.logWarning(error).pipe(
    Effect.annotateLogs({
      operation: error.operation,
      workspaceRoot: error.workspaceRoot,
      filePath: error.filePath,
      errorTag: error._tag,
    }),
  );

/** @public Service construction is part of the canonical Effect module API. */
export const make = Effect.gen(function* () {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;

  const load: PiedPiperProjectFileLoader["Service"]["load"] = Effect.fn("PiedPiperProjectFileLoader.load")(
    function* (workspaceRoot) {
      const filePath = path.join(workspaceRoot, PIED_PIPER_PROJECT_FILE_NAME);
      const raw = yield* fileSystem.readFileString(filePath).pipe(
        Effect.asSome,
        Effect.catchTags({
          PlatformError: (error) =>
            error.reason._tag === "NotFound"
              ? Effect.succeed(Option.none<string>())
              : logT3ProjectFileLoadError(
                  new PiedPiperProjectFileLoadError({
                    operation: "read",
                    workspaceRoot,
                    filePath,
                    cause: error,
                  }),
                ).pipe(Effect.as(Option.none<string>())),
        }),
      );
      if (Option.isNone(raw)) {
        return Option.none<PiedPiperProjectFile>();
      }
      return yield* decodeT3ProjectFileJson(raw.value).pipe(
        Effect.asSome,
        Effect.catchTags({
          SchemaError: (error) =>
            logT3ProjectFileLoadError(
              new PiedPiperProjectFileLoadError({
                operation: "decode",
                workspaceRoot,
                filePath,
                cause: error,
              }),
            ).pipe(Effect.as(Option.none<PiedPiperProjectFile>())),
        }),
      );
    },
  );

  return PiedPiperProjectFileLoader.of({ load });
});

export const layer = Layer.effect(PiedPiperProjectFileLoader, make);
