import { describe, expect, it } from "vite-plus/test";
import { installFocusInputMode } from "./focusInputMode";

function fixture() {
  const events = new EventTarget();
  const root = { dataset: {} as Record<string, string> };
  const document = Object.assign(events, { documentElement: root }) as unknown as Document;
  const cleanup = installFocusInputMode(document);
  const key = (value: string, modifiers: { ctrlKey?: boolean } = {}) => {
    events.dispatchEvent(Object.assign(new Event("keydown"), { key: value, ...modifiers }));
  };
  return { events, root, cleanup, key };
}

describe("focus input mode", () => {
  it("suppresses focus for pointer use and restores it for keyboard navigation", () => {
    const { events, root, key, cleanup } = fixture();
    expect(root.dataset.focusInput).toBe("keyboard");
    events.dispatchEvent(new Event("pointerdown"));
    expect(root.dataset.focusInput).toBe("pointer");
    key("a");
    expect(root.dataset.focusInput).toBe("pointer");
    key("Tab");
    expect(root.dataset.focusInput).toBe("keyboard");
    events.dispatchEvent(new Event("pointerdown"));
    key("ArrowDown");
    expect(root.dataset.focusInput).toBe("keyboard");
    cleanup();
  });

  it("does not treat shortcuts as navigation and removes its listeners on cleanup", () => {
    const { events, root, key, cleanup } = fixture();
    events.dispatchEvent(new Event("pointerdown"));
    key("ArrowLeft", { ctrlKey: true });
    expect(root.dataset.focusInput).toBe("pointer");
    cleanup();
    key("Tab");
    events.dispatchEvent(new Event("pointerdown"));
    expect(root.dataset.focusInput).toBeUndefined();
  });
});
