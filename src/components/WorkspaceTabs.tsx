import { useRef, type KeyboardEvent } from "react";
import type { WorkspaceMode } from "../music/types";

type WorkspaceTabsProps = {
  activeWorkspace: WorkspaceMode;
  onWorkspaceChange: (workspace: WorkspaceMode) => void;
};

export function WorkspaceTabs({
  activeWorkspace,
  onWorkspaceChange,
}: WorkspaceTabsProps) {
  const tabRefs = useRef<Record<WorkspaceMode, HTMLButtonElement | null>>({
    progressions: null,
    "chord-construction": null,
    scales: null,
  });
  const tabs: { label: string; panelId: string; tabId: string; workspace: WorkspaceMode }[] = [
    {
      label: "Progressions",
      panelId: "workspace-panel-progressions",
      tabId: "workspace-tab-progressions",
      workspace: "progressions",
    },
    {
      label: "Chord Construction",
      panelId: "workspace-panel-chord-construction",
      tabId: "workspace-tab-chord-construction",
      workspace: "chord-construction",
    },
    {
      label: "Scales",
      panelId: "workspace-panel-scales",
      tabId: "workspace-tab-scales",
      workspace: "scales",
    },
  ];

  const selectAndFocusTab = (workspace: WorkspaceMode) => {
    onWorkspaceChange(workspace);
    tabRefs.current[workspace]?.focus();
  };

  const handleTabKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    workspace: WorkspaceMode,
  ) => {
    const currentIndex = tabs.findIndex((tab) => tab.workspace === workspace);
    let nextIndex: number | null = null;

    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = (currentIndex + 1) % tabs.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = tabs.length - 1;
    }

    if (nextIndex === null) {
      return;
    }

    event.preventDefault();
    selectAndFocusTab(tabs[nextIndex].workspace);
  };

  return (
    <div role="tablist" aria-label="Learning workspace">
      {tabs.map((tab) => (
        <button
          aria-controls={tab.panelId}
          aria-selected={activeWorkspace === tab.workspace}
          id={tab.tabId}
          key={tab.workspace}
          onClick={() => onWorkspaceChange(tab.workspace)}
          onKeyDown={(event) => handleTabKeyDown(event, tab.workspace)}
          ref={(element) => {
            tabRefs.current[tab.workspace] = element;
          }}
          role="tab"
          tabIndex={activeWorkspace === tab.workspace ? 0 : -1}
          type="button"
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
