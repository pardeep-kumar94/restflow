"use client";

import { useState } from "react";
import { useWorkflowStore } from "@/stores/workflow-store";

const PRESETS: { label: string; value: string; hint: string }[] = [
  { label: "Timestamp (Unix)", value: "{{$timestamp}}", hint: "Current Unix timestamp in seconds" },
  { label: "Timestamp (ms)", value: "{{$timestampMs}}", hint: "Current Unix timestamp in milliseconds" },
  { label: "Date (ISO)", value: "{{$isoDate}}", hint: "Current date in ISO 8601 format" },
  { label: "Date (YYYY-MM-DD)", value: "{{$date}}", hint: "Current date as YYYY-MM-DD" },
  { label: "UUID", value: "{{$uuid}}", hint: "Random UUID v4" },
  { label: "Random Int", value: "{{$randomInt}}", hint: "Random integer 0–9999" },
];

/** Resolve dynamic preset values at call time */
export function resolveDynamicVar(value: string): string {
  const now = new Date();
  switch (value) {
    case "{{$timestamp}}":
      return String(Math.floor(now.getTime() / 1000));
    case "{{$timestampMs}}":
      return String(now.getTime());
    case "{{$isoDate}}":
      return now.toISOString();
    case "{{$date}}":
      return now.toISOString().slice(0, 10);
    case "{{$uuid}}":
      return crypto.randomUUID();
    case "{{$randomInt}}":
      return String(Math.floor(Math.random() * 10000));
    default:
      return value;
  }
}

export function VariablesBar() {
  const { customVariables, setCustomVariables } = useWorkflowStore();
  const [expanded, setExpanded] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");

  const entries = Object.entries(customVariables);

  const addVariable = () => {
    if (!newKey.trim()) return;
    setCustomVariables({ ...customVariables, [newKey.trim()]: newValue });
    setNewKey("");
    setNewValue("");
  };

  const removeVariable = (key: string) => {
    const next = { ...customVariables };
    delete next[key];
    setCustomVariables(next);
  };

  const updateValue = (key: string, value: string) => {
    setCustomVariables({ ...customVariables, [key]: value });
  };

  const addPreset = (preset: typeof PRESETS[number]) => {
    const key = preset.label.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
    setCustomVariables({ ...customVariables, [key]: preset.value });
  };

  return (
    <div className="shrink-0 border-b" style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-secondary)" }}>
      <div
        className="flex items-center justify-between px-4 py-2 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style={{ color: "var(--text-secondary)" }}>
            <path d="M4 2v4.5L2 8l2 1.5V14M12 2v4.5L14 8l-2 1.5V14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="8" cy="8" r="1.5" fill="currentColor" />
          </svg>
          <span className="text-[11px] font-bold" style={{ color: "var(--text-primary)" }}>
            Variables
          </span>
          {entries.length > 0 && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
              style={{ backgroundColor: "var(--accent-purple)", color: "var(--bg-primary)" }}
            >
              {entries.length}
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

      {expanded && (
        <div
          className="px-4 pb-3"
          style={{ animation: "headersSlideDown 0.2s ease-out" }}
        >
          {/* Existing variables */}
          {entries.length > 0 && (
            <div className="space-y-1 mb-2">
              {entries.map(([key, value]) => (
                <div key={key} className="flex items-center gap-2">
                  <span
                    className="text-[11px] font-mono shrink-0 px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--accent-purple)", minWidth: 80 }}
                  >
                    {key}
                  </span>
                  <input
                    className="flex-1 text-[11px] font-mono bg-transparent rounded px-1.5 py-0.5 outline-none border min-w-0"
                    style={{ color: "var(--text-primary)", borderColor: "var(--border)" }}
                    value={value}
                    onChange={(e) => updateValue(key, e.target.value)}
                  />
                  <span className="text-[9px] font-mono shrink-0" style={{ color: "var(--text-secondary)" }}>
                    {"{{vars." + key + "}}"}
                  </span>
                  <button
                    onClick={() => removeVariable(key)}
                    className="text-[11px] shrink-0 cursor-pointer px-1"
                    style={{ color: "var(--accent-red)" }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add new variable */}
          <div className="flex items-center gap-2 mb-3">
            <input
              className="text-[11px] font-mono bg-transparent rounded px-1.5 py-0.5 outline-none border"
              style={{ color: "var(--text-primary)", borderColor: "var(--border)", width: 120 }}
              placeholder="Variable name"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") addVariable(); }}
            />
            <input
              className="flex-1 text-[11px] font-mono bg-transparent rounded px-1.5 py-0.5 outline-none border min-w-0"
              style={{ color: "var(--text-primary)", borderColor: "var(--border)" }}
              placeholder="Value or dynamic expression"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") addVariable(); }}
            />
            <button
              onClick={addVariable}
              className="text-[11px] font-semibold px-2.5 py-1 rounded-full cursor-pointer shrink-0 transition-all duration-150"
              style={{
                backgroundColor: "var(--accent-purple)",
                color: "var(--bg-primary)",
                boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
              }}
            >
              + Add
            </button>
          </div>

          {/* Quick presets */}
          <div>
            <p className="text-[10px] font-bold mb-1.5" style={{ color: "var(--text-secondary)" }}>
              QUICK ADD
            </p>
            <div className="flex flex-wrap gap-1">
              {PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => addPreset(preset)}
                  className="text-[10px] font-mono px-2 py-1 rounded cursor-pointer transition-colors"
                  style={{
                    backgroundColor: "var(--bg-tertiary)",
                    color: "var(--text-secondary)",
                    border: "1px solid var(--border)",
                  }}
                  title={preset.hint}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {entries.length === 0 && (
            <p
              className="text-[10px] mt-2.5 leading-relaxed px-2 py-1.5 rounded"
              style={{
                color: "var(--text-secondary)",
                backgroundColor: "color-mix(in srgb, var(--bg-tertiary) 50%, transparent)",
                fontStyle: "italic",
              }}
            >
              Create reusable variables like timestamps, dates, or tokens. Use them as {"{{vars.myVar}}"} in any field.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
