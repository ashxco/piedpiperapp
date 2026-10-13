import { Link, useParams } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronDownIcon, SquarePenIcon } from "lucide-react";
import { scopeThreadRef, scopedThreadKey } from "@piedpiperapp/client-runtime/environment";

import { useActiveEnvironmentId, useProjects, useThreadShells } from "../../state/entities";
import { usePrimaryEnvironmentId } from "../../state/environments";
import { DraftId, useComposerDraftStore } from "../../composerDraftStore";
import { useScratchProject } from "../../hooks/useScratchProject";
import { sortThreads } from "../../lib/threadSort";
import { buildThreadRouteParams, resolveThreadRouteRef } from "../../threadRoutes";
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "../ui/sidebar";

export function RecentChatsSection() {
  const threads = useThreadShells();
  const projects = useProjects();
  const activeEnvironmentId = useActiveEnvironmentId();
  const primaryEnvironmentId = usePrimaryEnvironmentId();
  const { scratchEnvironmentId, startScratchThread } = useScratchProject();
  const environmentId = scratchEnvironmentId(activeEnvironmentId ?? primaryEnvironmentId);
  const [expanded, setExpanded] = useState(true);
  const [creating, setCreating] = useState(false);
  const { isMobile, setOpenMobile } = useSidebar();
  const activeRef = useParams({ strict: false, select: resolveThreadRouteRef });
  const activeKey = activeRef ? scopedThreadKey(activeRef) : null;
  const activeDraftId = useParams({ strict: false, select: (params) => params.draftId });
  const activeDraft = useComposerDraftStore((state) =>
    activeDraftId ? state.getDraftSession(DraftId.make(activeDraftId)) : null,
  );
  const showDraft =
    activeDraft &&
    projects.some(
      (project) =>
        project.isScratch === true &&
        project.id === activeDraft.projectId &&
        project.environmentId === activeDraft.environmentId,
    );
  const recent = useMemo(
    () =>
      sortThreads(
        threads.filter(
          (thread) =>
            thread.archivedAt === null &&
            projects.some(
              (project) =>
                project.isScratch === true &&
                project.id === thread.projectId &&
                project.environmentId === thread.environmentId,
            ),
        ),
        "updated_at",
      ).slice(0, 8),
    [projects, threads],
  );

  return (
    <SidebarGroup data-recent-chats="">
      <div data-sidebar-section-heading="" className="sidebar-recents-heading">
        <button
          type="button"
          className="sidebar-recents-toggle"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          aria-controls="sidebar-recent-chats"
        >
          Recents
          <ChevronDownIcon className={expanded ? "size-3" : "size-3 -rotate-90"} />
        </button>
        <button
          type="button"
          className="sidebar-recents-new"
          aria-label="New chat without a project"
          disabled={environmentId === null || creating}
          onClick={async () => {
            if (environmentId === null || creating) return;
            setCreating(true);
            try {
              await startScratchThread(environmentId);
              setExpanded(true);
              if (isMobile) setOpenMobile(false);
            } finally {
              setCreating(false);
            }
          }}
        >
          <SquarePenIcon className="size-3.5" />
        </button>
      </div>
      <SidebarMenu id="sidebar-recent-chats" hidden={!expanded}>
        {showDraft && activeDraftId ? (
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive
              render={
                <Link to="/draft/$draftId" params={{ draftId: DraftId.make(activeDraftId) }} />
              }
            >
              <span className="truncate">New chat</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ) : null}
        {recent.map((thread) => {
          const ref = scopeThreadRef(thread.environmentId, thread.id);
          const key = scopedThreadKey(ref);
          return (
            <SidebarMenuItem key={key}>
              <SidebarMenuButton
                isActive={key === activeKey}
                render={
                  <Link
                    to="/$environmentId/$threadId"
                    params={buildThreadRouteParams(ref)}
                    onClick={() => {
                      if (isMobile) setOpenMobile(false);
                    }}
                  />
                }
              >
                <span className="truncate">{thread.title || "New chat"}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
