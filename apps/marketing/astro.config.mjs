import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://piedpiperapp.com",
  server: {
    port: Number(process.env.PORT ?? 4173),
  },
});
