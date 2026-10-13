import { Link, useParams } from "@tanstack/react-router";
import { useMemo } from "react";
import { scopeThreadRef, scopedThreadKey } from "@piedpiperapp/client-runtime/environment";

import { useThreadShells } from "../../state/entities";
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
  const { isMobile, setOpenMobile } = useSidebar();
  const activeRef = useParams({ strict: false, select: resolveThreadRouteRef });
  const activeKey = activeRef ? scopedThreadKey(activeRef) : null;
  const recent = useMemo(
    () =>
      sortThreads(
        threads.filter((thread) => thread.archivedAt === null),
        "updated_at",
      ).slice(0, 8),
    [threads],
  );
  if (!recent.length) return null;

  return (
    <SidebarGroup data-recent-chats="">
      <h2 className="px-2 pb-2 text-xs font-medium text-sidebar-muted-foreground">Recents</h2>
      <SidebarMenu>
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
