"use client";

import { useState } from "react";
import { useWorkflowStore } from "@/stores/workflow-store";
import { HeadersTab } from "./headers-tab";
import { ParamsTab } from "./params-tab";
import { BodyTab } from "./body-tab";
import { MethodBadge } from "@/components/common/method-badge";

const TABS = ["Headers", "Params", "Body"] as const;
type Tab = (typeof TABS)[number];

export function StepEditor() {
  const [activeTab, setActiveTab] = useState<Tab>("Headers");
  const { workflow, endpoints, selectedNodeId, updateNode } = useWorkflowStore();

  const node = workflow.nodes.find((n) => n.id === selectedNodeId);
  const endpoint = node ? endpoints.find((e) => e.id === node.endpointId) : undefined;

  if (!node || !endpoint) {
    return (
      <div
        className="h-full flex flex-col items-center justify-center p-6 gap-3"
        style={{
          backgroundColor: "var(--bg-secondary)",
          borderLeft: "1px solid var(--border)",
        }}
      >
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--text-secondary)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ opacity: 0.45 }}
        >
          <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
          <path d="M13 13l6 6" />
        </svg>
        <p className="text-[14px] text-center font-medium" style={{ color: "var(--text-secondary)" }}>
          Select a node to configure
        </p>
        <p className="text-[11px] text-center" style={{ color: "var(--text-secondary)", opacity: 0.6 }}>
          Click any step in the flow to edit its settings
        </p>
      </div>
    );
  }

  const resolvedUrl = `${endpoint.baseUrl}${endpoint.path}`;

  return (
    <div
      className="h-full flex flex-col overflow-hidden anim-fade-in"
      style={{
        backgroundColor: "var(--bg-secondary)",
        borderLeft: "1px solid var(--border)",
      }}
    >
      <div className="p-3 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-2 mb-1">
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              backgroundColor: "var(--accent-blue)",
              flexShrink: 0,
            }}
          />
          <MethodBadge method={endpoint.method} />
          <input
            value={node.name}
            onChange={(e) => updateNode(node.id, { name: e.target.value })}
            className="flex-1 text-[12px] bg-transparent outline-none truncate"
            style={{ color: "var(--text-primary)" }}
          />
        </div>
        <div className="mt-1">
          <label className="text-[10px] block mb-0.5" style={{ color: "var(--text-secondary)" }}>
            URL
          </label>
          <input
            value={node.urlOverride || resolvedUrl}
            onChange={(e) => updateNode(node.id, { urlOverride: e.target.value })}
            className="w-full px-2 py-1 text-[11px] rounded outline-none"
            style={{
              backgroundColor: "var(--bg-primary)",
              color: node.urlOverride ? "var(--accent-yellow)" : "var(--accent-blue)",
              border: "1px solid var(--border)",
            }}
          />
          <div className="flex items-center justify-between mt-0.5">
            <span
              className="text-[9px] truncate block"
              style={{ color: "var(--text-secondary)", opacity: 0.55, maxWidth: "80%" }}
              title={resolvedUrl}
            >
              {resolvedUrl}
            </span>
            {node.urlOverride && (
              <button
                onClick={() => updateNode(node.id, { urlOverride: "" })}
                className="text-[9px] cursor-pointer hover:opacity-80 shrink-0"
                style={{ color: "var(--text-secondary)" }}
              >
                Reset to default
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex border-b" style={{ borderColor: "var(--border)" }}>
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-3 py-2 text-[11px] cursor-pointer"
            style={{
              color: activeTab === tab ? "var(--accent-blue)" : "var(--text-secondary)",
              borderBottom:
                activeTab === tab ? "2px solid var(--accent-blue)" : "2px solid transparent",
              backgroundColor: activeTab === tab ? "transparent" : undefined,
              transition: "color 0.15s ease, border-bottom-color 0.2s ease, background-color 0.15s ease",
            }}
            onMouseEnter={(e) => {
              if (activeTab !== tab) {
                (e.currentTarget as HTMLElement).style.backgroundColor = "var(--bg-hover)";
              }
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto p-3">
        {activeTab === "Headers" && (
          <HeadersTab
            stepId={node.id}
            headers={node.headers}
            onChange={(headers) => updateNode(node.id, { headers })}
          />
        )}
        {activeTab === "Params" && (
          <ParamsTab
            stepId={node.id}
            params={node.queryParams}
            onChange={(queryParams) => updateNode(node.id, { queryParams })}
          />
        )}
        {activeTab === "Body" && (
          <BodyTab
            stepId={node.id}
            body={node.body}
            onChange={(body) => updateNode(node.id, { body })}
          />
        )}
      </div>
    </div>
  );
}
