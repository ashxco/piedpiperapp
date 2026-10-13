import { describe, expect, it } from "vite-plus/test";

import {
  PIED_PIPER_MCP_TOOL_NAMES,
  resolvePiedPiperMcpToolPresentation,
} from "./piedPiperMcpToolPresentation.ts";

describe("resolvePiedPiperMcpToolPresentation", () => {
  it("recognizes every Pied Piper tool across provider prefixes and completion suffixes", () => {
    for (const tool of PIED_PIPER_MCP_TOOL_NAMES) {
      const presentation = resolvePiedPiperMcpToolPresentation(tool);
      for (const prefix of [
        "mcp__piedpiperapp__",
        "mcp__piedpiperapp_code__",
        "mcp__piedpiperapp__",
        "Pied Piper.",
        "piedpiperapp_code/",
        "piedpiperapp:",
        "mcp_piedpiperapp_",
        "Pied Piper ",
        "piedpiperapp · ",
      ]) {
        expect(resolvePiedPiperMcpToolPresentation(`${prefix}${tool} completed`), tool).toEqual(
          presentation,
        );
      }
      expect(resolvePiedPiperMcpToolPresentation(`mcp__another-server__${tool}`), tool).toBeNull();
    }
  });
  it("pretty prints Claude and Cursor Pied Piper MCP tool names", () => {
    expect(
      resolvePiedPiperMcpToolPresentation("mcp__piedpiperapp__piedpiperapp_thread_read"),
    ).toEqual({
      displayName: "Read a Pied Piper thread",
      logo: "piedpiperapp",
    });
  });

  it("pretty prints Codex Pied Piper MCP tool names", () => {
    expect(resolvePiedPiperMcpToolPresentation("piedpiperapp.create_threads")).toEqual({
      displayName: "Create Pied Piper threads",
      logo: "piedpiperapp",
    });
  });

  it("pretty prints thread metadata updates", () => {
    expect(
      resolvePiedPiperMcpToolPresentation("mcp__piedpiperapp__piedpiperapp_thread_update"),
    ).toEqual({
      displayName: "Update Pied Piper thread metadata",
      logo: "piedpiperapp",
    });
  });

  it("pretty prints bare Pied Piper MCP toolkit names", () => {
    expect(resolvePiedPiperMcpToolPresentation("list_scheduled_tasks")).toEqual({
      displayName: "List scheduled tasks",
      logo: "piedpiperapp",
    });
  });

  it("pretty prints worktree Pied Piper MCP tool names", () => {
    expect(
      resolvePiedPiperMcpToolPresentation("mcp__piedpiperapp__piedpiperapp_worktree_handoff"),
    ).toEqual({
      displayName: "Hand off thread to a git worktree",
      logo: "piedpiperapp",
    });
    expect(
      resolvePiedPiperMcpToolPresentation("piedpiperapp.piedpiperapp_worktree_status"),
    ).toEqual({
      displayName: "Get thread worktree status",
      logo: "piedpiperapp",
    });
  });

  it("pretty prints preview Pied Piper MCP tool names", () => {
    expect(resolvePiedPiperMcpToolPresentation("Pied Piper.preview_open")).toEqual({
      displayName: "Open a page in the preview browser",
      logo: "piedpiperapp",
    });
    expect(resolvePiedPiperMcpToolPresentation("mcp__piedpiperapp__preview_status")).toEqual({
      displayName: "Get preview browser status",
      logo: "piedpiperapp",
    });
  });

  it("matches the separator variants ACP registry agents emit", () => {
    for (const name of [
      "mcp_piedpiperapp_delegate_task",
      "piedpiperapp_code:delegate_task",
      "piedpiperapp/delegate_task",
      "piedpiperapp delegate_task",
      "Pied Piper delegate_task",
      "piedpiperapp__delegate_task",
    ]) {
      expect(resolvePiedPiperMcpToolPresentation(name)?.displayName).toBe("Delegate a child task");
    }
  });

  it("matches OpenCode 2's per-thread server names, whose thread ids hold underscores", () => {
    expect(
      resolvePiedPiperMcpToolPresentation("piedpiperapp-thread_opencode2-adapter_delegate_task")
        ?.displayName,
    ).toBe("Delegate a child task");
    expect(
      resolvePiedPiperMcpToolPresentation("piedpiperapp-thread_opencode2-adapter_not_a_tool"),
    ).toBeNull();
  });

  it("keeps unknown MCP tools on the generic renderer path", () => {
    expect(resolvePiedPiperMcpToolPresentation("mcp__github__search_issues")).toBeNull();
    expect(resolvePiedPiperMcpToolPresentation("piedpiperapp.not_a_real_tool")).toBeNull();
  });
});
