import * as NodeFS from "node:fs";
import * as NodePath from "node:path";
import { describe, expect, it } from "vite-plus/test";

import {
  customThemeNames,
  getGeneratedUniwindThemeOutputs,
  renderDefaultThemeVariablesJSON,
  renderUniwindThemesCSS,
} from "./generate-uniwind-themes.mts";
import { readDefaultMobileThemeVariables } from "../src/lib/mobileTheme.test-support";

describe("generate mobile Uniwind themes", () => {
  it("keeps the committed outputs current", () => {
    const staleOutputs = getGeneratedUniwindThemeOutputs()
      .filter(
        ([filename, contents]) =>
          !NodeFS.existsSync(filename) || NodeFS.readFileSync(filename, "utf8") !== contents,
      )
      .map(([filename]) => NodePath.relative(import.meta.dirname, filename));

    expect(
      staleOutputs,
      "Run `vp run --filter @piedpiperapp/mobile generate` and commit the generated outputs.",
    ).toEqual([]);
  });

  it("registers every custom palette for both appearances", () => {
    expect(customThemeNames).toEqual([
      "piedpiperapp-chat-light",
      "piedpiperapp-chat-dark",
      "grove-light",
      "grove-dark",
      "ocean-light",
      "ocean-dark",
      "ember-light",
      "ember-dark",
      "iris-light",
      "iris-dark",
    ]);

    const stylesheet = renderUniwindThemesCSS();
    for (const themeName of customThemeNames) {
      expect(stylesheet.match(new RegExp(`@variant ${themeName} \\{`, "gu"))).toHaveLength(1);
    }
  });

  it("keeps the default runtime bridge and generated CSS on the same palette", () => {
    const variables = JSON.parse(renderDefaultThemeVariablesJSON());

    expect(variables.light).toEqual(readDefaultMobileThemeVariables("light"));
    expect(variables.dark).toEqual(readDefaultMobileThemeVariables("dark"));
    expect(variables.light["--color-screen"]).toBe("#f8f7fc");
    expect(variables.light["--color-drawer"]).toBe("#f1eef8");
    expect(variables.dark["--color-screen"]).toBe("#13111c");
    expect(variables.dark["--color-drawer"]).toBe("#090711");
    expect(Object.keys(variables.light)).toEqual(Object.keys(variables.dark));
  });

  it("gives every theme the same variables and a fixed Clerk palette for its appearance", () => {
    const css =
      NodeFS.readFileSync(NodePath.resolve(import.meta.dirname, "../global.css"), "utf8") +
      renderUniwindThemesCSS();
    const themes = new Map<string, Map<string, string>>(
      ["light", "dark", ...customThemeNames].map((name) => [name, new Map()]),
    );
    for (const [, name, body] of css.matchAll(/@variant ([\w-]+) \{([^}]+)\}/gu)) {
      const variables = themes.get(name!);
      for (const [, variable, value] of body!.matchAll(/(--[\w-]+):\s*([^;]+);/gu)) {
        variables?.set(variable!, value!.trim().toLowerCase());
      }
    }

    const lightVariables = themes.get("light")!;
    for (const [name, variables] of themes) {
      expect([...variables.keys()].sort(), name).toEqual([...lightVariables.keys()].sort());
      const isDark = name === "dark" || name.endsWith("-dark");
      expect(
        Object.fromEntries(
          [...variables].filter(([variable]) => variable.startsWith("--color-clerk-")),
        ),
        name,
      ).toEqual({
        "--color-clerk-page": isDark ? "#13111c" : "#f8f7fc",
        "--color-clerk-foreground": isDark ? "#efecfa" : "#28243d",
        "--color-clerk-foreground-muted": isDark ? "#a59bb9" : "#6f6a83",
        "--color-clerk-border": isDark ? "#302a42" : "#e3e0ee",
        "--color-clerk-danger": isDark ? "#ff6467" : "#c10007",
      });
    }
  });
});
