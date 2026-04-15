"use client";

import { useState, useRef, useEffect } from "react";
import { useWorkflowStore } from "@/stores/workflow-store";
import { buildDataTree, flattenSchema, type TreeNode } from "@/lib/schema-utils";

interface VariablePickerProps {
  stepId: string;
  onSelect: (variable: string) => void;
}

export function VariablePicker({ stepId, onSelect }: VariablePickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { workflow, endpoints, executionContext } = useWorkflowStore();

  // In graph mode, any other node could be a source
  const previousSteps = workflow.nodes.filter((n) => n.id !== stepId);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  if (previousSteps.length === 0) return null;

  const handleSelect = (prevStepId: string, path: string) => {
    onSelect(`{{${prevStepId}.${path}}}`);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="px-1.5 py-1 text-[11px] rounded cursor-pointer hover:opacity-80"
        style={{
          backgroundColor: "color-mix(in srgb, var(--accent-blue) 15%, transparent)",
          color: "var(--accent-blue)",
          border: "1px solid color-mix(in srgb, var(--accent-blue) 30%, transparent)",
        }}
        title="Insert variable from previous step"
      >
        {"{⋮}"}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1 w-64 max-h-72 overflow-auto rounded shadow-lg z-50"
          style={{
            backgroundColor: "var(--bg-secondary)",
            border: "1px solid var(--border)",
          }}
        >
          {previousSteps.map((prevStep) => {
            const ep = endpoints.find((e) => e.id === prevStep.endpointId);
            const actualData = executionContext?.results[prevStep.id]?.response;

            // Response fields
            let responseItems: { label: string; path: string }[] = [];
            if (actualData != null && typeof actualData === "object") {
              const leaves = collectAllLeaves(buildDataTree(actualData));
              responseItems = leaves.map((l) => ({ label: l.key, path: `response.${l.path}` }));
            } else if (ep?.responseSchema) {
              const fields = flattenSchema(ep.responseSchema);
              responseItems = fields.map((f) => ({ label: f.name, path: `response.${f.path}` }));
            }

            // Request config
            const headerItems = Object.entries(prevStep.headers || {}).map(([k, v]) => ({
              label: `${k}`, path: `headers.${k}`, preview: v,
            }));
            const paramItems = Object.entries(prevStep.queryParams || {}).map(([k, v]) => ({
              label: `${k}`, path: `queryParams.${k}`, preview: v,
            }));

            const allItems = [
              ...responseItems.map((r) => ({ ...r, category: "response", preview: undefined as string | undefined })),
              ...headerItems.map((h) => ({ label: h.label, path: h.path, category: "headers", preview: h.preview })),
              ...paramItems.map((p) => ({ label: p.label, path: p.path, category: "params", preview: p.preview })),
            ];

            if (allItems.length === 0) return null;

            return (
              <div key={prevStep.id}>
                <div
                  className="px-2 py-1 text-[10px] font-bold uppercase sticky top-0"
                  style={{
                    color: "var(--accent-purple)",
                    backgroundColor: "var(--bg-tertiary)",
                  }}
                >
                  {prevStep.name}
                </div>
                {allItems.map((item) => (
                  <div
                    key={item.path}
                    className="px-2 py-1 text-[11px] cursor-pointer hover:bg-white/5 flex items-center gap-1"
                    style={{ color: "var(--text-primary)" }}
                    onClick={() => handleSelect(prevStep.id, item.path)}
                  >
                    <span
                      className="text-[9px] px-1 rounded shrink-0"
                      style={{
                        backgroundColor: item.category === "response"
                          ? "color-mix(in srgb, var(--accent-blue) 20%, transparent)"
                          : item.category === "headers"
                          ? "color-mix(in srgb, var(--accent-yellow) 20%, transparent)"
                          : "color-mix(in srgb, var(--accent-green) 20%, transparent)",
                        color: item.category === "response"
                          ? "var(--accent-blue)"
                          : item.category === "headers"
                          ? "var(--accent-yellow)"
                          : "var(--accent-green)",
                      }}
                    >
                      {item.category === "response" ? "res" : item.category === "headers" ? "hdr" : "prm"}
                    </span>
                    <span className="truncate">{item.label}</span>
                    {item.preview && (
                      <span className="text-[9px] ml-auto truncate max-w-[80px]" style={{ color: "var(--text-secondary)" }}>
                        {item.preview.slice(0, 20)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function collectAllLeaves(nodes: TreeNode[], result: { path: string; key: string }[] = []): { path: string; key: string }[] {
  for (const node of nodes) {
    if (node.type === "value") {
      result.push({ path: node.path, key: node.key });
    } else if (node.children) {
      collectAllLeaves(node.children, result);
    }
  }
  return result;
}
