"use client";

import { useState } from "react";
import type { WorkflowNode, APIEndpoint, ExecutionContext, NodeConnection, StageStatus } from "@/types";
import { StepRow } from "./step-row";

interface StageCardProps {
  sectionId: string;
  sectionName: string;
  nodes: WorkflowNode[];
  endpoints: APIEndpoint[];
  executionContext: ExecutionContext | null;
  connections: NodeConnection[];
  allNodes: WorkflowNode[];
  onChain?: (nodeId: string) => void;
  chainingNodeId?: string | null;
}

function getSectionStatus(sectionId: string, nodes: WorkflowNode[], context: ExecutionContext | null): StageStatus {
  if (!context) return "pending";
  const explicit = context.stageStatuses?.[sectionId];
  if (explicit) return explicit;
  const results = nodes.map((n) => context.results[n.id]).filter(Boolean);
  if (results.length === 0) return "pending";
  if (results.length < nodes.length) return "running";
  if (results.some((r) => r.error)) return "fail";
  return "pass";
}

const statusColors: Record<StageStatus, string> = {
  pending: "var(--text-secondary)",
  running: "var(--accent-yellow)",
  pass: "var(--accent-green)",
  fail: "var(--accent-red)",
};

const statusLabels: Record<StageStatus, string> = {
  pending: "PENDING",
  running: "RUNNING",
  pass: "PASS",
  fail: "FAIL",
};

export function StageCard({ sectionId, sectionName, nodes, endpoints, executionContext, connections, allNodes, onChain, chainingNodeId }: StageCardProps) {
  const [expanded, setExpanded] = useState(true);
  const status = getSectionStatus(sectionId, nodes, executionContext);
  const completedCount = executionContext ? nodes.filter((n) => executionContext.results[n.id]).length : 0;

  return (
    <div className={`rounded-lg border overflow-hidden anim-fade-in-up ${status === "pass" ? "stage-pass" : status === "fail" ? "stage-fail" : status === "running" ? "stage-running" : ""}`} style={{ borderColor: statusColors[status], backgroundColor: "var(--bg-secondary)" }}>
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer"
        style={{ backgroundColor: "var(--bg-tertiary)" }}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <span className="text-[11px]" style={{ color: statusColors[status] }}>📁</span>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded" style={{ backgroundColor: statusColors[status], color: "var(--bg-primary)" }}>
            {sectionName}
          </span>
          <span className="text-[10px]" style={{ color: "var(--text-secondary)" }}>
            {nodes.length} API{nodes.length > 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
            {completedCount}/{nodes.length} completed
          </span>
          <span key={status} className="text-[11px] font-bold px-2.5 py-0.5 rounded-full anim-status-pop" style={{ backgroundColor: `color-mix(in srgb, ${statusColors[status]} 15%, transparent)`, color: statusColors[status] }}>
            {statusLabels[status]}
          </span>
          <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
            {expanded ? "▼" : "▶"}
          </span>
        </div>
      </div>

      {expanded && (
        <div className="divide-y anim-expand-down stagger-children" style={{ borderColor: "var(--border)" }}>
          {nodes.map((node, index) => {
            const endpoint = endpoints.find((e) => e.id === node.endpointId);
            const result = executionContext?.results[node.id];
            return (
              <StepRow
                key={node.id}
                node={node}
                endpoint={endpoint}
                result={result}
                connections={connections}
                executionContext={executionContext}
                allNodes={allNodes}
                allEndpoints={endpoints}
                onChain={onChain}
                isChaining={chainingNodeId === node.id}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
