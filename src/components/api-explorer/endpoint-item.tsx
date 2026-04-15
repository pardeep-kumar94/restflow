"use client";

import { useState } from "react";
import type { APIEndpoint } from "@/types";
import { MethodBadge } from "@/components/common/method-badge";
import { SchemaTree } from "./schema-tree";

interface EndpointItemProps {
  endpoint: APIEndpoint;
  onAddToWorkflow: (endpoint: APIEndpoint) => void;
}

export function EndpointItem({ endpoint, onAddToWorkflow }: EndpointItemProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="border-b transition-all"
      style={{
        borderColor: "var(--border)",
        borderLeft: "2px solid transparent",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderLeftColor = "var(--accent-blue)")}
      onMouseLeave={(e) => (e.currentTarget.style.borderLeftColor = "transparent")}
    >
      <div
        className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:opacity-80"
        onClick={() => setExpanded(!expanded)}
        onDoubleClick={(e) => {
          e.stopPropagation();
          onAddToWorkflow(endpoint);
        }}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData("application/endpoint-id", endpoint.id);
        }}
      >
        <MethodBadge method={endpoint.method} />
        <span
          className="text-[12px] truncate flex-1"
          style={{ color: "var(--text-primary)" }}
        >
          {endpoint.path}
        </span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--text-secondary)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            transition: "transform 0.2s ease",
            transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
            flexShrink: 0,
          }}
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>
      {expanded && (
        <div className="px-3 pb-2 space-y-2 anim-expand-down">
          {endpoint.summary && (
            <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
              {endpoint.summary}
            </p>
          )}
          <div>
            <p className="text-[11px] font-bold mb-1" style={{ color: "var(--text-secondary)" }}>
              Request
            </p>
            <SchemaTree schema={endpoint.requestSchema} />
          </div>
          <div
            style={{ borderTop: "1px solid var(--border)", paddingTop: 8 }}
          >
            <p className="text-[11px] font-bold mb-1" style={{ color: "var(--text-secondary)" }}>
              Response
            </p>
            <SchemaTree schema={endpoint.responseSchema} />
          </div>
        </div>
      )}
    </div>
  );
}
