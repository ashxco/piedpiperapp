import type { APIRoute } from "astro";

import { buildT3ProjectFileJsonSchema } from "@piedpiperapp/shared/piedPiperProjectFile";

// Rendered at build time; published at https://piedpiperapp.com/schema/piedpiperapp.json so
// piedpiperapp.json files can reference it via "$schema" for editor/LSP support.
export const GET: APIRoute = () =>
  new Response(`${JSON.stringify(buildT3ProjectFileJsonSchema(), null, 2)}\n`, {
    headers: { "Content-Type": "application/json" },
  });
