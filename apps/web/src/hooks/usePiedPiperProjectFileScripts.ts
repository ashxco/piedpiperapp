import {
  PIED_PIPER_PROJECT_FILE_NAME,
  type EnvironmentId,
  type PiedPiperProjectFile,
  type PiedPiperProjectFileScript,
} from "@piedpiperapp/contracts";
import { parsePiedPiperProjectFile } from "@piedpiperapp/shared/piedPiperProjectFile";
import { useMemo } from "react";

import { useProjectFileQuery } from "~/components/files/projectFilesQueryState";

const NO_SCRIPTS: ReadonlyArray<PiedPiperProjectFileScript> = [];

export interface PiedPiperProjectFileState {
  /**
   * - `valid`: piedpiperapp.json exists and decoded.
   * - `invalid`: piedpiperapp.json exists but fails to decode (the server then ignores
   *   the whole file, including `iconPath` and every script).
   * - `missing`: no readable piedpiperapp.json at the workspace root.
   * - `loading`: the file query has not settled yet.
   */
  status: "loading" | "missing" | "invalid" | "valid";
  /** The decoded file when status is `valid`, null otherwise. */
  file: PiedPiperProjectFile | null;
  scripts: ReadonlyArray<PiedPiperProjectFileScript>;
}

/**
 * Decoded state of the project's checked-in `piedpiperapp.json`, including whether the
 * file exists but is broken — which the runtime otherwise swallows silently.
 */
export function usePiedPiperProjectFileState(
  environmentId: EnvironmentId,
  cwd: string | null,
): PiedPiperProjectFileState {
  const query = useProjectFileQuery(
    environmentId,
    cwd ?? "",
    PIED_PIPER_PROJECT_FILE_NAME,
    cwd !== null,
  );
  const contents = query.data && !query.data.truncated ? query.data.contents : null;
  const isPending = query.isPending;
  return useMemo(() => {
    if (contents === null) {
      return {
        status: isPending ? "loading" : "missing",
        file: null,
        scripts: NO_SCRIPTS,
      } as const;
    }
    const file = parsePiedPiperProjectFile(contents);
    if (file === null) {
      return { status: "invalid", file: null, scripts: NO_SCRIPTS } as const;
    }
    return { status: "valid", file, scripts: file.scripts ?? NO_SCRIPTS } as const;
  }, [contents, isPending]);
}

/**
 * Scripts declared in the project's checked-in `piedpiperapp.json`, offered in the
 * scripts menu for import. Missing, truncated, or invalid files resolve to
 * an empty list.
 */
export function usePiedPiperProjectFileScripts(
  environmentId: EnvironmentId,
  cwd: string | null,
): ReadonlyArray<PiedPiperProjectFileScript> {
  return usePiedPiperProjectFileState(environmentId, cwd).scripts;
}
