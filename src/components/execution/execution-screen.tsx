"use client";

import { useState } from "react";
import { useWorkflowStore } from "@/stores/workflow-store";
import { StageCard } from "./stage-card";
import { ChainPanel } from "./chain-panel";
import { HeadersBar } from "./headers-bar";
import { VariablesBar } from "./variables-bar";

export function ExecutionScreen() {
  const { workflow, endpoints, executionContext } = useWorkflowStore();
  const [chainingNodeId, setChainingNodeId] = useState<string | null>(null);

  // Group nodes by section (or "Unassigned")
  const sections = workflow.sections ?? [];
  const sectionOrder = new Map(sections.map((s) => [s.id, s.order]));

  const sectionMap = new Map<string, { name: string; order: number; nodes: typeof workflow.nodes }>();
  for (const node of workflow.nodes) {
    const secId = node.sectionId ?? "__unassigned__";
    if (!sectionMap.has(secId)) {
      const sec = sections.find((s) => s.id === secId);
      sectionMap.set(secId, {
        name: sec ? sec.name : "Unassigned",
        order: sec ? sec.order : Infinity,
        nodes: [],
      });
    }
    sectionMap.get(secId)!.nodes.push(node);
  }

  const stages = [...sectionMap.entries()].sort((a, b) => a[1].order - b[1].order);

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: "var(--bg-primary)" }}>
      {/* Headers bar */}
      <HeadersBar />
      <VariablesBar />

      <div className="flex-1 flex min-h-0">
        {/* Left — steps list */}
        <div
          className="overflow-auto p-6"
          style={{ flex: chainingNodeId ? "0 0 50%" : "1 1 auto" }}
        >
          <div className="max-w-4xl mx-auto space-y-4 stagger-children">
            {stages.length === 0 ? (
              <div className="text-center py-20 anim-fade-in-up">
                <p className="text-[33px] mb-3">🚀</p>
                <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                  No stages yet
                </p>
                <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                  Switch to Design mode to add API nodes and build your flow.
                </p>
              </div>
            ) : (
              stages.map(([secId, { name, nodes }]) => (
                <StageCard
                  key={secId}
                  sectionId={secId}
                  sectionName={name}
                  nodes={nodes}
                  endpoints={endpoints}
                  executionContext={executionContext}
                  connections={workflow.connections}
                  allNodes={workflow.nodes}
                  onChain={(nodeId) => setChainingNodeId(nodeId)}
                  chainingNodeId={chainingNodeId}
                />
              ))
            )}
          </div>
        </div>

        {/* Right — chain panel */}
        {chainingNodeId && (
          <>
            <div
              className="shrink-0 w-px"
              style={{ backgroundColor: "var(--border)" }}
            />
            <div className="anim-slide-in-right" style={{ flex: "0 0 50%" }}>
              <ChainPanel
                sourceNodeId={chainingNodeId}
                onCancel={() => setChainingNodeId(null)}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
