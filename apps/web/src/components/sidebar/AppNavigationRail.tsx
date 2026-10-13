import { ChartNoAxesColumnIcon, HistoryIcon, HouseIcon, SettingsIcon } from "lucide-react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { usePullRequestsSupported } from "../../state/environments";
import { useProjectSidebarStore, type ProjectSidebarView } from "../../projectSidebarStore";
import { PullRequestGlyph } from "../pullRequest/pullRequestIcons";
import { readPullRequestListPreferences } from "../pullRequest/pullRequestListPreferences";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";
import { useSidebar } from "../ui/sidebar";
import { isSidebarUtilityPage, useNavigateToMainApp } from "./mainAppLocation";

function RailButton({
  label,
  active,
  icon,
  onClick,
}: {
  label: string;
  active: boolean;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            className="app-rail-button"
            aria-label={label}
            aria-pressed={active}
            onClick={onClick}
          />
        }
      >
        {icon}
      </TooltipTrigger>
      <TooltipPopup side="right">{label}</TooltipPopup>
    </Tooltip>
  );
}

export function AppNavigationRail() {
  const pathname = useLocation({ select: (location) => location.pathname });
  const navigate = useNavigate();
  const navigateToMainApp = useNavigateToMainApp();
  const { setOpen } = useSidebar();
  const view = useProjectSidebarStore((state) => state.view);
  const setView = useProjectSidebarStore((state) => state.setView);
  const supportsPullRequests = usePullRequestsSupported();
  const isUtility = isSidebarUtilityPage(pathname);
  const selectMainView = (next: ProjectSidebarView) => {
    setView(next);
    setOpen(true);
    if (isUtility) void navigateToMainApp();
  };

  return (
    <nav
      className="app-navigation-rail hidden w-12 shrink-0 flex-col md:flex"
      aria-label="Main menu"
    >
      <div className="app-rail-destinations">
        <RailButton
          label="Projects and chats"
          active={!isUtility && view === "projects"}
          icon={<HouseIcon />}
          onClick={() => selectMainView("projects")}
        />
        <RailButton
          label="Recent chats"
          active={!isUtility && view === "recents"}
          icon={<HistoryIcon />}
          onClick={() => selectMainView("recents")}
        />
        {supportsPullRequests ? (
          <RailButton
            label="Pull requests"
            active={pathname === "/pull-requests"}
            icon={<PullRequestGlyph.pullRequest />}
            onClick={() => {
              void navigate({ to: "/pull-requests", search: readPullRequestListPreferences() });
            }}
          />
        ) : null}
        <RailButton
          label="Usage"
          active={pathname === "/usage"}
          icon={<ChartNoAxesColumnIcon />}
          onClick={() => {
            void navigate({ to: "/usage" });
          }}
        />
      </div>
      <div className="app-rail-bottom">
        <RailButton
          label="Settings"
          active={pathname === "/settings" || pathname.startsWith("/settings/")}
          icon={<SettingsIcon />}
          onClick={() => {
            setOpen(true);
            void navigate({ to: "/settings" });
          }}
        />
      </div>
    </nav>
  );
}
