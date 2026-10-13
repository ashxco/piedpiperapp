import { describe, expect, it } from "vite-plus/test";

import { orderSidebarChats, reorderSidebarChats } from "./projectSidebarStore";

describe("project sidebar chat order", () => {
  it("retains arranged chats while surfacing new chats and removing stale keys", () => {
    expect(orderSidebarChats(["new", "a", "b"], ["deleted", "b", "a", "b"])).toEqual([
      "new",
      "b",
      "a",
    ]);
  });

  it("moves only the dragged chat and preserves hidden chats in the complete order", () => {
    expect(reorderSidebarChats(["a", "hidden", "b", "c"], "c", "a")).toEqual([
      "c",
      "a",
      "hidden",
      "b",
    ]);
  });

  it("leaves the order unchanged after a stale or cancelled target", () => {
    expect(reorderSidebarChats(["a", "b"], "gone", "b")).toEqual(["a", "b"]);
    expect(reorderSidebarChats(["a", "b"], "a", "gone")).toEqual(["a", "b"]);
    expect(reorderSidebarChats(["a", "b"], "a", "a")).toEqual(["a", "b"]);
  });
});
