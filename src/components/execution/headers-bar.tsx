"use client";

import { useState } from "react";
import { useWorkflowStore } from "@/stores/workflow-store";

export function HeadersBar() {
  const { globalHeaders, setGlobalHeaders, workflow, updateNode } = useWorkflowStore();
  const [expanded, setExpanded] = useState(false);
  const [mode, setMode] = useState<"global" | "per-api">("global");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Global header editing
  const globalEntries = Object.entries(globalHeaders);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");

  const addGlobalHeader = () => {
    if (!newKey.trim()) return;
    setGlobalHeaders({ ...globalHeaders, [newKey.trim()]: newValue });
    setNewKey("");
    setNewValue("");
  };

  const removeGlobalHeader = (key: string) => {
    const next = { ...globalHeaders };
    delete next[key];
    setGlobalHeaders(next);
  };

  const updateGlobalHeaderValue = (key: string, value: string) => {
    setGlobalHeaders({ ...globalHeaders, [key]: value });
  };

  // Per-API header editing
  const selectedNode = workflow.nodes.find((n) => n.id === selectedNodeId);
  const perApiEntries = selectedNode ? Object.entries(selectedNode.headers ?? {}) : [];
  const [perKey, setPerKey] = useState("");
  const [perValue, setPerValue] = useState("");

  const addPerApiHeader = () => {
    if (!selectedNode || !perKey.trim()) return;
    updateNode(selectedNode.id, { headers: { ...selectedNode.headers, [perKey.trim()]: perValue } });
    setPerKey("");
    setPerValue("");
  };

  const removePerApiHeader = (key: string) => {
    if (!selectedNode) return;
    const next = { ...selectedNode.headers };
    delete next[key];
    updateNode(selectedNode.id, { headers: next });
  };

  const updatePerApiHeaderValue = (key: string, value: string) => {
    if (!selectedNode) return;
    updateNode(selectedNode.id, { headers: { ...selectedNode.headers, [key]: value } });
  };

  const headerCount = globalEntries.length + workflow.nodes.reduce((sum, n) => sum + Object.keys(n.headers ?? {}).length, 0);

  return (
    <div className="shrink-0 border-b" style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-secondary)" }}>
      {/* Toggle bar */}
      <div
        className="flex items-center justify-between px-4 py-2 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style={{ color: "var(--text-secondary)", flexShrink: 0 }}>
            <path d="M8 1a3 3 0 0 0-3 3v3H4a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-1V4a3 3 0 0 0-3-3Zm1.5 6V4a1.5 1.5 0 1 0-3 0v3h3Z" fill="currentColor" />
          </svg>
          <span className="text-[11px] font-bold" style={{ color: "var(--text-primary)" }}>
            Headers
          </span>
          {headerCount > 0 && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
              style={{ backgroundColor: "var(--accent-blue)", color: "var(--bg-primary)" }}
            >
              {headerCount}
            </span>
          )}
        </div>
        <span
          className="text-[11px]"
          style={{
            color: "var(--text-secondary)",
            transition: "transform 0.2s ease",
            display: "inline-block",
            transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
          }}
        >
          ▶
        </span>
      </div>

      {/* Expanded panel */}
      {expanded && (
        <div
          className="px-4 pb-3"
          style={{ animation: "headersSlideDown 0.2s ease-out" }}
        >
          <style>{`
            @keyframes headersSlideDown {
              from { opacity: 0; transform: translateY(-4px); }
              to { opacity: 1; transform: translateY(0); }
            }
            @keyframes headersModeSwitch {
              from { opacity: 0; transform: translateY(2px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}</style>

          {/* Mode toggle */}
          <div
            className="flex rounded-full overflow-hidden border text-[11px] mb-3 w-fit"
            style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-tertiary)" }}
          >
            <button
              className="px-3.5 py-1 transition-all duration-200 rounded-full font-medium"
              style={{
                backgroundColor: mode === "global" ? "var(--accent-blue)" : "transparent",
                color: mode === "global" ? "var(--bg-primary)" : "var(--text-secondary)",
                boxShadow: mode === "global" ? "0 1px 3px rgba(0,0,0,0.2)" : "none",
              }}
              onClick={() => setMode("global")}
            >
              Global (all APIs)
            </button>
            <button
              className="px-3.5 py-1 transition-all duration-200 rounded-full font-medium"
              style={{
                backgroundColor: mode === "per-api" ? "var(--accent-blue)" : "transparent",
                color: mode === "per-api" ? "var(--bg-primary)" : "var(--text-secondary)",
                boxShadow: mode === "per-api" ? "0 1px 3px rgba(0,0,0,0.2)" : "none",
              }}
              onClick={() => setMode("per-api")}
            >
              Per API
            </button>
          </div>

          <div key={mode} style={{ animation: "headersModeSwitch 0.15s ease-out" }}>
            {mode === "global" ? (
              <div>
                {/* Existing global headers */}
                {globalEntries.length > 0 && (
                  <div className="space-y-1 mb-2">
                    {globalEntries.map(([key, value]) => (
                      <div key={key} className="flex items-center gap-2">
                        <span
                          className="text-[11px] font-mono shrink-0 px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-primary)", minWidth: 80 }}
                        >
                          {key}
                        </span>
                        <input
                          className="flex-1 text-[11px] font-mono bg-transparent rounded px-1.5 py-0.5 outline-none border min-w-0"
                          style={{ color: "var(--text-primary)", borderColor: "var(--border)" }}
                          value={value}
                          onChange={(e) => updateGlobalHeaderValue(key, e.target.value)}
                        />
                        <button
                          onClick={() => removeGlobalHeader(key)}
                          className="text-[11px] shrink-0 cursor-pointer px-1"
                          style={{ color: "var(--accent-red)" }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add new */}
                <div className="flex items-center gap-2">
                  <input
                    className="text-[11px] font-mono bg-transparent rounded px-1.5 py-0.5 outline-none border"
                    style={{ color: "var(--text-primary)", borderColor: "var(--border)", width: 120 }}
                    placeholder="Header name"
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") addGlobalHeader(); }}
                  />
                  <input
                    className="flex-1 text-[11px] font-mono bg-transparent rounded px-1.5 py-0.5 outline-none border min-w-0"
                    style={{ color: "var(--text-primary)", borderColor: "var(--border)" }}
                    placeholder="Value"
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") addGlobalHeader(); }}
                  />
                  <button
                    onClick={addGlobalHeader}
                    className="text-[11px] font-semibold px-2.5 py-1 rounded-full cursor-pointer shrink-0 transition-all duration-150"
                    style={{
                      backgroundColor: "var(--accent-blue)",
                      color: "var(--bg-primary)",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
                    }}
                  >
                    + Add
                  </button>
                </div>

                {globalEntries.length === 0 && (
                  <p
                    className="text-[10px] mt-2.5 leading-relaxed px-2 py-1.5 rounded"
                    style={{
                      color: "var(--text-secondary)",
                      backgroundColor: "color-mix(in srgb, var(--bg-tertiary) 50%, transparent)",
                      fontStyle: "italic",
                    }}
                  >
                    Global headers are sent with every API call (e.g. Authorization, X-API-Key).
                  </p>
                )}
              </div>
            ) : (
              <div>
                {/* API selector */}
                <div className="flex flex-wrap gap-1 mb-2">
                  {workflow.nodes.map((n) => {
                    const count = Object.keys(n.headers ?? {}).length;
                    const isActive = selectedNodeId === n.id;
                    return (
                      <button
                        key={n.id}
                        className="px-2 py-1 text-[10px] rounded cursor-pointer transition-all duration-150"
                        style={{
                          backgroundColor: isActive
                            ? "color-mix(in srgb, var(--accent-blue) 15%, var(--bg-tertiary))"
                            : "var(--bg-tertiary)",
                          color: isActive ? "var(--accent-blue)" : "var(--text-primary)",
                          border: isActive ? "1px solid var(--accent-blue)" : "1px solid var(--border)",
                        }}
                        onClick={() => setSelectedNodeId(isActive ? null : n.id)}
                      >
                        {n.name}
                        {count > 0 && (
                          <span className="ml-1" style={{ color: "var(--accent-green)" }}>{count}</span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Per-API headers for selected node */}
                {selectedNode ? (
                  <div>
                    {perApiEntries.length > 0 && (
                      <div className="space-y-1 mb-2">
                        {perApiEntries.map(([key, value]) => (
                          <div key={key} className="flex items-center gap-2">
                            <span
                              className="text-[11px] font-mono shrink-0 px-1.5 py-0.5 rounded"
                              style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-primary)", minWidth: 80 }}
                            >
                              {key}
                            </span>
                            <input
                              className="flex-1 text-[11px] font-mono bg-transparent rounded px-1.5 py-0.5 outline-none border min-w-0"
                              style={{ color: "var(--text-primary)", borderColor: "var(--border)" }}
                              value={value}
                              onChange={(e) => updatePerApiHeaderValue(key, e.target.value)}
                            />
                            <button
                              onClick={() => removePerApiHeader(key)}
                              className="text-[11px] shrink-0 cursor-pointer px-1"
                              style={{ color: "var(--accent-red)" }}
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <input
                        className="text-[11px] font-mono bg-transparent rounded px-1.5 py-0.5 outline-none border"
                        style={{ color: "var(--text-primary)", borderColor: "var(--border)", width: 120 }}
                        placeholder="Header name"
                        value={perKey}
                        onChange={(e) => setPerKey(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") addPerApiHeader(); }}
                      />
                      <input
                        className="flex-1 text-[11px] font-mono bg-transparent rounded px-1.5 py-0.5 outline-none border min-w-0"
                        style={{ color: "var(--text-primary)", borderColor: "var(--border)" }}
                        placeholder="Value"
                        value={perValue}
                        onChange={(e) => setPerValue(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") addPerApiHeader(); }}
                      />
                      <button
                        onClick={addPerApiHeader}
                        className="text-[11px] font-semibold px-2.5 py-1 rounded-full cursor-pointer shrink-0 transition-all duration-150"
                        style={{
                          backgroundColor: "var(--accent-blue)",
                          color: "var(--bg-primary)",
                          boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
                        }}
                      >
                        + Add
                      </button>
                    </div>
                  </div>
                ) : (
                  <p
                    className="text-[10px] px-2 py-1.5 rounded leading-relaxed"
                    style={{
                      color: "var(--text-secondary)",
                      backgroundColor: "color-mix(in srgb, var(--bg-tertiary) 50%, transparent)",
                      fontStyle: "italic",
                    }}
                  >
                    Select an API above to manage its headers.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
