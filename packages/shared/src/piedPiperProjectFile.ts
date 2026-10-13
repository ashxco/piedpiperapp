import * as Exit from "effect/Exit";
import * as Schema from "effect/Schema";

import { PiedPiperProjectFile, PIED_PIPER_PROJECT_FILE_SCHEMA_URL } from "@piedpiperapp/contracts";

import { fromLenientJson } from "./schemaJson.ts";

/**
 * Codec between the raw `piedpiperapp.json` file contents (lenient JSONC string) and the
 * decoded {@link PiedPiperProjectFile}.
 */
export const PiedPiperProjectFileFromJson = fromLenientJson(PiedPiperProjectFile);

const decodeT3ProjectFile = Schema.decodeExit(PiedPiperProjectFileFromJson);

/**
 * Decode raw `piedpiperapp.json` contents, treating invalid or malformed files as
 * absent. Clients use this to read optional defaults (scripts, thread env
 * mode) without surfacing decode errors to the user.
 */
export function parseT3ProjectFile(contents: string): PiedPiperProjectFile | null {
  const decoded = decodeT3ProjectFile(contents);
  return Exit.isSuccess(decoded) ? decoded.value : null;
}

/**
 * Build the publishable JSON Schema document for `piedpiperapp.json` (draft 2020-12).
 *
 * Served from the marketing site at {@link PIED_PIPER_PROJECT_FILE_SCHEMA_URL} so
 * editors get LSP support via a `$schema` reference.
 */
export function buildT3ProjectFileJsonSchema(): Record<string, unknown> {
  // Closed objects, as before effect rc.113 changed the generator default;
  // editors then flag unknown keys in piedpiperapp.json.
  const document = Schema.toJsonSchemaDocument(PiedPiperProjectFile, { onExcessProperty: "error" });
  const jsonSchema: Record<string, unknown> = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: PIED_PIPER_PROJECT_FILE_SCHEMA_URL,
    ...document.schema,
  };
  if (document.definitions && Object.keys(document.definitions).length > 0) {
    jsonSchema.$defs = document.definitions;
  }
  return jsonSchema;
}
