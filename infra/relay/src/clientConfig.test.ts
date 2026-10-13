import { describe, expect, it } from "vite-plus/test";
import { reconcileEnvFile, relayClientConfigEnv } from "./clientConfig.ts";

describe("reconcileEnvFile", () => {
  it("adds every entry to an empty file", () => {
    expect(reconcileEnvFile("", { A: "1", B: "2" })).toBe("A=1\nB=2\n");
  });

  it("replaces stale values and keeps unrelated lines", () => {
    const existing = "KEEP=yes\nA=old\n# comment\n";
    expect(reconcileEnvFile(existing, { A: "new", B: "2" })).toBe(
      "KEEP=yes\nA=new\n# comment\nB=2\n",
    );
  });

  it("appends a newline before adding to a file without one", () => {
    expect(reconcileEnvFile("A=1", { B: "2" })).toBe("A=1\nB=2\n");
  });

  it("collapses duplicate assignments to one, since parseEnv lets the last win", () => {
    expect(reconcileEnvFile("A=old\nKEEP=1\nA=older\n", { A: "new" })).toBe("A=new\nKEEP=1\n");
  });

  it("recognises every assignment form parseEnv accepts", () => {
    expect(reconcileEnvFile("A=old\n  export A = stale\nexport  A=older\n", { A: "new" })).toBe(
      "A=new\n",
    );
  });

  it("replaces a quoted multi-line value whole", () => {
    expect(reconcileEnvFile('A="one\ntwo"\nKEEP=1\n', { A: "new" })).toBe("A=new\nKEEP=1\n");
    expect(reconcileEnvFile("A='x'\nKEEP=1\n", { A: "new" })).toBe("A=new\nKEEP=1\n");
  });

  it("keeps later lines when a quoted value never closes", () => {
    expect(reconcileEnvFile('A="one\nKEEP=1\n', { A: "new" })).toBe("A=new\nKEEP=1\n");
  });

  it("leaves a commented-out assignment alone", () => {
    expect(reconcileEnvFile("#A=old\n", { A: "new" })).toBe("#A=old\nA=new\n");
  });
});

it("emits only the relay URL, never telemetry endpoints or tokens", () => {
  expect(relayClientConfigEnv({ url: "https://relay.example.com" })).toEqual({
    PIEDPIPER_RELAY_URL: "https://relay.example.com",
  });
});
