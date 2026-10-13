import { assert, describe, it } from "@effect/vitest";

import {
  PIED_PIPER_ORCHESTRATION_INSTRUCTIONS,
  piedPiperAcpPromptWithInstructions,
  piedPiperOrchestrationPromptForFirstRun,
  piedPiperOrchestrationSystemPrompt,
} from "./orchestrationInstructions.ts";

describe("Pied Piper orchestration provider instructions", () => {
  it("distinguishes delegated subagents from ordinary top-level threads", () => {
    assert.include(PIED_PIPER_ORCHESTRATION_INSTRUCTIONS, "Use `delegate_task`");
    assert.include(PIED_PIPER_ORCHESTRATION_INSTRUCTIONS, "ordinary top-level Pied Piper conversations");
    assert.include(PIED_PIPER_ORCHESTRATION_INSTRUCTIONS, "Never use them merely");
    assert.include(PIED_PIPER_ORCHESTRATION_INSTRUCTIONS, "cross-provider");
    assert.include(PIED_PIPER_ORCHESTRATION_INSTRUCTIONS, "call `delegate_task` again");
    assert.include(
      PIED_PIPER_ORCHESTRATION_INSTRUCTIONS,
      "Do not use `piedpiperapp_thread_send` on `childThreadId`",
    );
  });

  it("documents structured schedules instead of JSON strings", () => {
    assert.include(PIED_PIPER_ORCHESTRATION_INSTRUCTIONS, "structured object, never as JSON text");
    assert.include(PIED_PIPER_ORCHESTRATION_INSTRUCTIONS, '"everyMs":3600000');
    assert.include(PIED_PIPER_ORCHESTRATION_INSTRUCTIONS, "bindToCurrentThread=false");
  });

  it("injects prompt fallback only for an MCP-enabled first run", () => {
    const prompt = "Inspect the repository.";
    const injected = piedPiperOrchestrationPromptForFirstRun({
      prompt,
      runOrdinal: 1,
      hasT3Mcp: true,
    });

    assert.include(injected, "<piedpiperapp_code_orchestration_instructions>");
    assert.include(injected, `<user_request>\n${prompt}\n</user_request>`);
    assert.equal(
      piedPiperOrchestrationPromptForFirstRun({ prompt, runOrdinal: 2, hasT3Mcp: true }),
      prompt,
    );
    assert.equal(
      piedPiperOrchestrationPromptForFirstRun({ prompt, runOrdinal: 1, hasT3Mcp: false }),
      prompt,
    );
  });

  it("only exposes the system prompt when the Pied Piper MCP server is attached", () => {
    assert.equal(piedPiperOrchestrationSystemPrompt(false), undefined);
    assert.equal(piedPiperOrchestrationSystemPrompt(true), PIED_PIPER_ORCHESTRATION_INSTRUCTIONS);
  });

  it("gives ACP sessions provider-neutral mode, browser, and orchestration guidance", () => {
    const injected = piedPiperAcpPromptWithInstructions({
      prompt: "Inspect the repository.",
      state: { interactionMode: "default", hasT3Mcp: true },
    });

    assert.include(injected, "Pied Piper interaction mode: Default");
    assert.include(injected, "Pied Piper collaborative browser");
    assert.include(injected, "Pied Piper orchestration");
    assert.include(injected, "<user_request>\nInspect the repository.\n</user_request>");
  });

  it("reinjects ACP guidance only when mode or tool availability changes", () => {
    const prompt = "Continue.";
    const defaultState = { interactionMode: "default", hasT3Mcp: true } as const;

    assert.equal(
      piedPiperAcpPromptWithInstructions({ prompt, state: defaultState, previousState: defaultState }),
      prompt,
    );
    assert.include(
      piedPiperAcpPromptWithInstructions({
        prompt,
        state: { ...defaultState, interactionMode: "plan" },
        previousState: defaultState,
      }),
      "Pied Piper interaction mode: Plan",
    );
    const withoutMcp = piedPiperAcpPromptWithInstructions({
      prompt,
      state: { interactionMode: "default", hasT3Mcp: false },
    });
    assert.include(withoutMcp, "Pied Piper interaction mode: Default");
    assert.notInclude(withoutMcp, "Pied Piper collaborative browser");
    assert.notInclude(withoutMcp, "Pied Piper orchestration");
  });
});
