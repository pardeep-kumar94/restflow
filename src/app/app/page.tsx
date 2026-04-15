"use client";

import { useEffect, useState } from "react";
import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
} from "react-resizable-panels";
import { TopBar } from "@/components/common/top-bar";
import { ApiExplorer } from "@/components/api-explorer/api-explorer";
import { ImportModal } from "@/components/api-explorer/import-modal";
import { WorkflowCanvas } from "@/components/workflow/workflow-canvas";
import { StepEditor } from "@/components/step-editor/step-editor";
import { ConnectionMapper } from "@/components/workflow/connection-popover";
import { ResponseViewer } from "@/components/response/response-viewer";
import { useWorkflowStore } from "@/stores/workflow-store";
import { ExecutionScreen } from "@/components/execution/execution-screen";

function RightPanel() {
  const { selectedConnectionId } = useWorkflowStore();
  if (selectedConnectionId) return <ConnectionMapper />;
  return <StepEditor />;
}

export default function Home() {
  const [importOpen, setImportOpen] = useState(false);
  const {
    workflow,
    loadState,
    appMode,
    initExecution,
  } = useWorkflowStore();

  useEffect(() => {
    loadState();
  }, [loadState]);

  const handleRun = () => {
    if (workflow.nodes.length === 0) return;
    initExecution();
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <TopBar onImport={() => setImportOpen(true)} onRun={handleRun} />
      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} />

      {appMode === "execute" ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          <ExecutionScreen />
        </div>
      ) : (
        <PanelGroup direction="vertical" className="flex-1">
          <Panel defaultSize={70} minSize={40}>
            <PanelGroup direction="horizontal">
              <Panel defaultSize={20} minSize={15} maxSize={30}>
                <ApiExplorer />
              </Panel>
              <PanelResizeHandle
                className="w-1 hover:bg-[var(--accent-blue)] transition-colors"
                style={{ backgroundColor: "var(--border)" }}
              />
              <Panel defaultSize={50} minSize={30}>
                <WorkflowCanvas />
              </Panel>
              <PanelResizeHandle
                className="w-1 hover:bg-[var(--accent-blue)] transition-colors"
                style={{ backgroundColor: "var(--border)" }}
              />
              <Panel defaultSize={30} minSize={20} maxSize={40}>
                <RightPanel />
              </Panel>
            </PanelGroup>
          </Panel>
          <PanelResizeHandle
            className="h-1 hover:bg-[var(--accent-blue)] transition-colors"
            style={{ backgroundColor: "var(--border)" }}
          />
          <Panel defaultSize={30} minSize={10} maxSize={50}>
            <ResponseViewer />
          </Panel>
        </PanelGroup>
      )}
    </div>
  );
}
