"use client";

import { useState, useCallback } from "react";
import { MethodBadge } from "@/components/common/method-badge";
import { InputFields } from "./input-fields";
import { useWorkflowStore } from "@/stores/workflow-store";
import type { WorkflowNode, APIEndpoint, StepResult, NodeConnection, ExecutionContext } from "@/types";

interface StepRowProps {
  node: WorkflowNode;
  endpoint: APIEndpoint | undefined;
  result: StepResult | undefined;
  connections: NodeConnection[];
  executionContext: ExecutionContext | null;
  allNodes: WorkflowNode[];
  allEndpoints: APIEndpoint[];
  onChain?: (sourceNodeId: string) => void;
  isChaining?: boolean;
}

export function StepRow({ node, endpoint, result, connections, executionContext, onChain, isChaining }: StepRowProps) {
  const [expanded, setExpanded] = useState(true);
  const [copied, setCopied] = useState(false);
  const { runNode, isExecuting } = useWorkflowStore();

  const handleCopy = useCallback(() => {
    if (result?.response) {
      navigator.clipboard.writeText(JSON.stringify(result.response, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }, [result]);

  const hasDownstream = connections.some((c) => c.sourceNodeId === node.id);

  const base = endpoint?.baseUrl?.replace(/\/+$/, "") ?? "";
  const path = node.urlOverride || (endpoint?.path ?? "");
  const resolvedUrl = result?.url ?? (base ? `${base}${path}` : path);

  const statusColor = result?.error
    ? "var(--accent-red)"
    : result
    ? "var(--accent-green)"
    : "var(--text-secondary)";

  const upstreamNodeIds = connections
    .filter((c) => c.targetNodeId === node.id)
    .map((c) => c.sourceNodeId);
  const upstreamReady = upstreamNodeIds.length === 0 ||
    upstreamNodeIds.every((id) => executionContext?.results[id] && !executionContext.results[id].error);

  const handleRun = async () => {
    await runNode(node.id);
  };

  return (
    <div className={isExecuting ? "shimmer" : ""} style={{ borderColor: "var(--border)", borderLeft: `3px solid ${result?.error ? "var(--accent-red)" : result ? "var(--accent-green)" : "transparent"}` }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2.5">
        <MethodBadge method={endpoint?.method ?? "GET"} />
        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpanded(!expanded)}>
          <p className="text-[12px] font-medium truncate" style={{ color: "var(--text-primary)" }}>
            {node.name}
          </p>
          <p className="text-[11px] truncate" style={{ color: "var(--text-secondary)" }}>
            {resolvedUrl}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {result && !result.error && (
            <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
              {result.duration}ms
            </span>
          )}
          <span className="text-[11px] font-bold" style={{ color: statusColor }}>
            {result?.error ? (result.status > 0 ? `FAIL ${result.status}` : "ERROR") : result ? `PASS ${result.status}` : "IDLE"}
          </span>
          <button
            onClick={handleRun}
            disabled={isExecuting || !upstreamReady}
            className="px-3 py-1 text-[11px] font-bold rounded cursor-pointer transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              backgroundColor: upstreamReady ? "var(--accent-green)" : "var(--bg-tertiary)",
              color: "var(--bg-primary)",
            }}
          >
            {isExecuting ? "..." : result ? "▶ Re-run" : "▶ Run"}
          </button>
          <span className="text-[11px] cursor-pointer" style={{ color: "var(--text-secondary)" }} onClick={() => setExpanded(!expanded)}>
            {expanded ? "▼" : "▶"}
          </span>
        </div>
      </div>

      {/* Expanded inputs */}
      {expanded && (
        <div
          className="px-4 pb-3 pt-1 border-t anim-expand-down"
          style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-primary)" }}
        >
          <InputFields node={node} endpoint={endpoint} connections={connections} executionContext={executionContext} />
        </div>
      )}

      {/* Response — raw JSON + chain/cancel buttons */}
      {result && !result.error && (
        <div className="px-4 py-2 border-t anim-fade-in-up" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium" style={{ color: "var(--accent-green)" }}>
              Response
            </span>
            <button
              onClick={handleCopy}
              className="text-[11px] px-2 py-0.5 rounded cursor-pointer transition-opacity hover:opacity-80"
              style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-secondary)" }}
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <pre
            className="mt-1 text-[11px] font-mono overflow-auto rounded p-2"
            style={{
              color: "var(--text-primary)",
              backgroundColor: "var(--bg-tertiary)",
              maxHeight: 300,
            }}
          >
            {JSON.stringify(result.response, null, 2)}
          </pre>

          {hasDownstream && !isChaining && (
            <div className="flex items-center gap-2 mt-2 anim-fade-in">
              <button
                onClick={() => onChain?.(node.id)}
                className="px-3 py-1 text-[11px] font-bold rounded cursor-pointer"
                style={{
                  backgroundColor: "var(--accent-blue)",
                  color: "var(--bg-primary)",
                }}
              >
                Chain to next API →
              </button>
              <button
                onClick={() => setExpanded(false)}
                className="px-3 py-1 text-[11px] font-bold rounded cursor-pointer"
                style={{
                  backgroundColor: "var(--bg-tertiary)",
                  color: "var(--text-secondary)",
                  border: "1px solid var(--border)",
                }}
              >
                Cancel
              </button>
            </div>
          )}

          {isChaining && (
            <div className="mt-2 px-2 py-1 rounded text-[11px] font-medium" style={{ backgroundColor: "color-mix(in srgb, var(--accent-blue) 10%, transparent)", color: "var(--accent-blue)" }}>
              Chaining — see right panel for next API requirements
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {result?.error && (
        <div className="px-4 py-2 border-t anim-fade-in rounded-b" style={{ borderColor: "var(--border)", backgroundColor: "color-mix(in srgb, var(--accent-red) 5%, transparent)" }}>
          <div className="flex items-start gap-2">
            <span className="text-[13px] leading-none mt-px">⚠</span>
            <p className="text-[11px] font-medium" style={{ color: "var(--accent-red)" }}>
              {result.error}
            </p>
          </div>
          {result.url && (
            <p className="text-[10px] mt-1 break-all" style={{ color: "var(--text-secondary)" }}>
              URL: {result.url}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
