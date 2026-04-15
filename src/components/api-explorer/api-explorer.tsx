"use client";

import { useState, useMemo } from "react";
import { useWorkflowStore } from "@/stores/workflow-store";
import { EndpointItem } from "./endpoint-item";
import type { APIEndpoint, WorkflowNode } from "@/types";

export function ApiExplorer() {
  const [search, setSearch] = useState("");
  const [domainEditing, setDomainEditing] = useState<string | null>(null);
  const [domainValue, setDomainValue] = useState("");
  const { endpoints, addNode, workflow, updateBaseUrlForSource } = useWorkflowStore();

  const filtered = useMemo(() => {
    if (!search.trim()) return endpoints;
    const q = search.toLowerCase();
    return endpoints.filter(
      (ep) =>
        ep.path.toLowerCase().includes(q) ||
        ep.method.toLowerCase().includes(q) ||
        ep.summary.toLowerCase().includes(q)
    );
  }, [endpoints, search]);

  // Unique base URLs for domain config
  const domainSources = useMemo(() => {
    const map = new Map<string, string>();
    for (const ep of endpoints) {
      const src = ep.sourceSpec ?? "";
      if (src && !map.has(src)) map.set(src, ep.baseUrl || "");
    }
    return [...map.entries()]; // [sourceSpec, baseUrl][]
  }, [endpoints]);

  const baseUrlGroups = useMemo(() => {
    const groups: Record<string, { sourceSpec: string; endpoints: APIEndpoint[] }> = {};
    for (const ep of filtered) {
      const key = ep.baseUrl || "(no base URL)";
      if (!groups[key]) groups[key] = { sourceSpec: ep.sourceSpec ?? "", endpoints: [] };
      groups[key].endpoints.push(ep);
    }
    return groups;
  }, [filtered]);

  const handleAddToWorkflow = (endpoint: APIEndpoint) => {
    const existingNodes = workflow.nodes.length;
    const node: WorkflowNode = {
      id: `node-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: endpoint.summary || `${endpoint.method} ${endpoint.path}`,
      endpointId: endpoint.id,
      urlOverride: "",
      headers: {},
      queryParams: {},
      body: "",
      uiAssistance: false,
      position: { x: existingNodes * 220 + 60, y: 100 },
      stage: 1,
    };
    addNode(node);
  };

  return (
    <div
      className="h-full flex flex-col overflow-hidden"
      style={{ backgroundColor: "var(--bg-secondary)", borderRight: "1px solid var(--border)" }}
    >
      {/* Domain config */}
      {domainSources.length > 0 && (
        <div className="px-3 py-2 border-b" style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-tertiary)" }}>
          <div className="flex items-center gap-1.5 mb-1.5">
            <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="var(--text-secondary)" strokeWidth="1.5" strokeLinecap="round">
              <circle cx="8" cy="8" r="7" />
              <path d="M1 8h14M8 1c2 2.5 2 11 0 14M8 1c-2 2.5-2 11 0 14" />
            </svg>
            <p className="text-[10px] font-bold" style={{ color: "var(--text-secondary)" }}>DOMAIN</p>
          </div>
          {domainSources.map(([src, baseUrl]) => (
            <div key={src} className="mb-1 last:mb-0">
              {domainEditing === src ? (
                <input
                  value={domainValue}
                  onChange={(e) => setDomainValue(e.target.value)}
                  onBlur={() => {
                    if (domainValue.trim() && domainValue.trim() !== baseUrl) {
                      updateBaseUrlForSource(src, domainValue.trim());
                    }
                    setDomainEditing(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      if (domainValue.trim() && domainValue.trim() !== baseUrl) {
                        updateBaseUrlForSource(src, domainValue.trim());
                      }
                      setDomainEditing(null);
                    }
                    if (e.key === "Escape") setDomainEditing(null);
                  }}
                  autoFocus
                  className="w-full text-[11px] font-mono bg-transparent outline-none px-2 py-1 rounded"
                  style={{ color: "var(--accent-green)", border: "1px solid var(--accent-green)", backgroundColor: "var(--bg-primary)" }}
                  placeholder="https://api.example.com"
                />
              ) : (
                <button
                  className="w-full text-left flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-mono truncate transition-colors"
                  style={{ color: "var(--accent-green)", backgroundColor: "var(--bg-primary)", border: "1px solid var(--border)" }}
                  onClick={() => { setDomainValue(baseUrl); setDomainEditing(src); }}
                  title="Click to change domain"
                >
                  <svg width="8" height="8" viewBox="0 0 12 12" fill="none" stroke="var(--text-secondary)" strokeWidth="1.5" strokeLinecap="round">
                    <path d="M8.5 1.5l2 2-7 7H1.5V8.5z" />
                  </svg>
                  <span className="truncate">{baseUrl || "Set base URL..."}</span>
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="p-4 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-2 mb-2">
          <p className="text-[11px] font-bold" style={{ color: "var(--text-secondary)" }}>
            API EXPLORER
          </p>
          {endpoints.length > 0 && (
            <span
              className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
              style={{
                backgroundColor: "var(--bg-tertiary)",
                color: "var(--text-secondary)",
                border: "1px solid var(--border)",
              }}
            >
              {endpoints.length}
            </span>
          )}
        </div>
        <div className="relative">
          <svg
            className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--text-secondary)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search endpoints..."
            className="w-full pl-7 pr-2 py-1.5 text-[12px] rounded outline-none"
            style={{
              backgroundColor: "var(--bg-tertiary)",
              color: "var(--text-primary)",
              border: "1px solid var(--border)",
            }}
          />
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        {endpoints.length === 0 ? (
          <div className="p-8 flex flex-col items-center justify-center text-center anim-fade-in-up">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--text-secondary)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ opacity: 0.5, marginBottom: 12 }}
            >
              <polyline points="16 16 12 12 8 16" />
              <line x1="12" y1="12" x2="12" y2="21" />
              <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
              <polyline points="16 16 12 12 8 16" />
            </svg>
            <p className="text-[12px]" style={{ color: "var(--text-secondary)" }}>
              Import an API spec to see endpoints here
            </p>
          </div>
        ) : (
          Object.entries(baseUrlGroups).map(([baseUrl, group]) => (
            <BaseUrlGroup
              key={baseUrl}
              baseUrl={baseUrl}
              sourceSpec={group.sourceSpec}
              endpoints={group.endpoints}
              onAddToWorkflow={handleAddToWorkflow}
              onBaseUrlChange={(newUrl) => {
                if (group.sourceSpec) updateBaseUrlForSource(group.sourceSpec, newUrl);
              }}
            />
          ))
        )}
      </div>
    </div>
  );
}

function BaseUrlGroup({
  baseUrl,
  sourceSpec,
  endpoints,
  onAddToWorkflow,
  onBaseUrlChange,
}: {
  baseUrl: string;
  sourceSpec: string;
  endpoints: APIEndpoint[];
  onAddToWorkflow: (ep: APIEndpoint) => void;
  onBaseUrlChange: (newUrl: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(baseUrl);

  const tagGroups: Record<string, APIEndpoint[]> = {};
  for (const ep of endpoints) {
    const tag = ep.tags[0] ?? "default";
    if (!tagGroups[tag]) tagGroups[tag] = [];
    tagGroups[tag].push(ep);
  }

  const handleSaveBaseUrl = () => {
    if (editValue.trim() && editValue.trim() !== baseUrl) {
      onBaseUrlChange(editValue.trim());
    }
    setEditing(false);
  };

  return (
    <div>
      <div
        className="px-3 py-1.5 flex items-center gap-1 cursor-pointer sticky top-0 z-10"
        style={{ backgroundColor: "var(--bg-tertiary)", borderBottom: "1px solid var(--border)" }}
        onClick={() => !editing && setCollapsed(!collapsed)}
      >
        <span className="text-[9px]" style={{ color: "var(--text-secondary)" }}>
          {collapsed ? "▶" : "▼"}
        </span>
        {editing ? (
          <input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSaveBaseUrl}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSaveBaseUrl();
              if (e.key === "Escape") { setEditValue(baseUrl); setEditing(false); }
            }}
            onClick={(e) => e.stopPropagation()}
            autoFocus
            className="flex-1 text-[10px] bg-transparent outline-none px-1 py-0.5 rounded"
            style={{ color: "var(--accent-green)", border: "1px solid var(--accent-green)" }}
          />
        ) : (
          <span
            className="flex-1 text-[10px] font-mono truncate"
            style={{ color: "var(--accent-green)" }}
            onDoubleClick={(e) => { e.stopPropagation(); setEditValue(baseUrl); setEditing(true); }}
            title="Double-click to edit base URL"
          >
            {baseUrl}
          </span>
        )}
        <span className="text-[9px] shrink-0" style={{ color: "var(--text-secondary)" }}>
          {endpoints.length}
        </span>
      </div>
      {sourceSpec && !collapsed && (
        <div className="px-3 py-0.5" style={{ backgroundColor: "var(--bg-tertiary)" }}>
          <span className="text-[9px]" style={{ color: "var(--text-secondary)" }}>
            {sourceSpec.length > 40 ? "..." + sourceSpec.slice(-37) : sourceSpec}
          </span>
        </div>
      )}
      {!collapsed &&
        Object.entries(tagGroups).map(([tag, eps]) => (
          <div key={tag}>
            <div
              className="px-3 py-1 text-[10px] font-bold uppercase sticky top-8"
              style={{ color: "var(--text-secondary)", backgroundColor: "var(--bg-secondary)" }}
            >
              {tag}
            </div>
            {eps.map((ep) => (
              <div key={ep.id} className="anim-fade-in-up">
                <EndpointItem endpoint={ep} onAddToWorkflow={onAddToWorkflow} />
              </div>
            ))}
          </div>
        ))}
    </div>
  );
}
