import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { resolveStorage } from "./lib/storage";

export type ProjectSidebarView = "projects" | "recents";

export function orderSidebarChats(available: readonly string[], preferred: readonly string[]) {
  const availableSet = new Set(available);
  const arranged = [...new Set(preferred)].filter((key) => availableSet.has(key));
  const arrangedSet = new Set(arranged);
  return [...available.filter((key) => !arrangedSet.has(key)), ...arranged];
}

export function reorderSidebarChats(keys: readonly string[], active: string, over: string) {
  const from = keys.indexOf(active);
  const to = keys.indexOf(over);
  if (from < 0 || to < 0 || from === to) return [...keys];
  const next = [...keys];
  next.splice(from, 1);
  next.splice(to, 0, active);
  return next;
}

interface ProjectSidebarState {
  view: ProjectSidebarView;
  chatOrderByProject: Record<string, string[]>;
  setView: (view: ProjectSidebarView) => void;
  resetChatOrder: () => void;
  reorderChats: (projectKey: string, keys: readonly string[], active: string, over: string) => void;
}

export const useProjectSidebarStore = create<ProjectSidebarState>()(
  persist(
    (set) => ({
      view: "projects",
      chatOrderByProject: {},
      setView: (view) => set({ view }),
      resetChatOrder: () => set({ chatOrderByProject: {} }),
      reorderChats: (projectKey, keys, active, over) =>
        set((state) => ({
          chatOrderByProject: {
            ...state.chatOrderByProject,
            [projectKey]: reorderSidebarChats(keys, active, over),
          },
        })),
    }),
    {
      name: "piedpiperapp:project-sidebar:v1",
      storage: createJSONStorage(() =>
        resolveStorage(typeof window === "undefined" ? undefined : window.localStorage),
      ),
      partialize: ({ view, chatOrderByProject }) => ({ view, chatOrderByProject }),
      merge: (persisted, current) => {
        const saved = persisted as Partial<ProjectSidebarState> | null;
        const entries = saved?.chatOrderByProject;
        return {
          ...current,
          view: saved?.view === "recents" ? "recents" : "projects",
          chatOrderByProject:
            entries && typeof entries === "object"
              ? Object.fromEntries(
                  Object.entries(entries).filter(
                    (entry): entry is [string, string[]] =>
                      Array.isArray(entry[1]) && entry[1].every((key) => typeof key === "string"),
                  ),
                )
              : {},
        };
      },
    },
  ),
);
