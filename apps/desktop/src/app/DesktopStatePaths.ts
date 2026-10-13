import * as Option from "effect/Option";

export type JoinPath = (first: string, ...segments: string[]) => string;

function normalizeConfiguredBaseDir(piedPiperHome: Option.Option<string>): Option.Option<string> {
  if (Option.isNone(piedPiperHome)) {
    return Option.none();
  }
  const trimmed = piedPiperHome.value.trim();
  return trimmed.length > 0 ? Option.some(trimmed) : Option.none();
}

export function resolveDesktopBaseDir(input: {
  readonly homeDirectory: string;
  readonly joinPath: JoinPath;
  readonly piedPiperHome: Option.Option<string>;
}): string {
  return Option.getOrElse(normalizeConfiguredBaseDir(input.piedPiperHome), () =>
    input.joinPath(input.homeDirectory, ".piedpiperapp"),
  );
}

export function resolveDesktopStateDir(input: {
  readonly baseDir: string;
  readonly isDevelopment: boolean;
  readonly joinPath: JoinPath;
  readonly piedPiperHome: Option.Option<string>;
}): string {
  const useDevSubdir =
    input.isDevelopment && Option.isNone(normalizeConfiguredBaseDir(input.piedPiperHome));
  return input.joinPath(input.baseDir, useDevSubdir ? "dev" : "userdata");
}
