import type { APIRoute } from "astro";

import { buildPiedPiperProjectFileJsonSchema } from "@piedpiperapp/shared/piedPiperProjectFile";

// Rendered at build time; published at https://piedpiperapp.com/schema/piedpiperapp.json so
// piedpiperapp.json files can reference it via "$schema" for editor/LSP support.
export const GET: APIRoute = () =>
  new Response(`${JSON.stringify(buildPiedPiperProjectFileJsonSchema(), null, 2)}\n`, {
    headers: { "Content-Type": "application/json" },
  });
