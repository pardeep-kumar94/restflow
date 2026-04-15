"use client";

import Link from "next/link";
import { Button } from "./button";
import { useWorkflowStore } from "@/stores/workflow-store";

interface TopBarProps {
  onImport: () => void;
  onRun: () => void;
}

export function TopBar({ onImport, onRun }: TopBarProps) {
  const { workflow, setWorkflowName, isExecuting, appMode, setAppMode, sectionToolActive, setSectionToolActive } = useWorkflowStore();

  return (
    <div className="shrink-0">
      {/* Gradient accent border */}
      <div
        className="h-[1px]"
        style={{
          background: "linear-gradient(to right, var(--accent-blue), var(--accent-purple), var(--accent-pink, #ec4899))",
        }}
      />
      <header
        className="h-12 flex items-center justify-between px-4 border-b"
        style={{
          borderColor: "var(--border)",
          backgroundColor: "var(--bg-secondary)",
        }}
      >
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="4" r="2.5" fill="var(--accent-blue)" />
              <circle cx="4" cy="20" r="2.5" fill="var(--accent-purple)" />
              <circle cx="20" cy="20" r="2.5" fill="var(--accent-purple)" />
              <line x1="12" y1="6.5" x2="4" y2="17.5" stroke="var(--accent-blue)" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="12" y1="6.5" x2="20" y2="17.5" stroke="var(--accent-blue)" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="6.5" y1="20" x2="17.5" y2="20" stroke="var(--accent-purple)" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span className="text-base font-bold tracking-tight">
              <span style={{ color: "var(--accent-blue)" }}>Rest</span>
              <span style={{ color: "var(--text-primary)" }}>flow</span>
            </span>
          </Link>

          {/* Separator */}
          <div className="h-5 w-[1px]" style={{ backgroundColor: "var(--border)" }} />

          <input
            value={workflow.name}
            onChange={(e) => setWorkflowName(e.target.value)}
            className="bg-transparent text-xs px-2 py-1 rounded outline-none border"
            style={{
              color: "var(--text-primary)",
              borderColor: "transparent",
            }}
            onFocus={(e) => {
              e.target.style.borderColor = "var(--border)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "transparent";
            }}
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Mode toggle */}
          <div
            className="flex rounded-full overflow-hidden border text-[12px] anim-fade-in"
            style={{ borderColor: "var(--border)" }}
          >
            <button
              className="px-4 py-1 rounded-full transition-colors"
              style={{
                backgroundColor: appMode === "design" ? "var(--accent-blue)" : "transparent",
                color: appMode === "design" ? "var(--bg-primary)" : "var(--text-secondary)",
                boxShadow: appMode === "design" ? "0 0 8px color-mix(in srgb, var(--accent-blue) 40%, transparent)" : "none",
              }}
              onClick={() => setAppMode("design")}
              title="Flow (⌘1)"
            >
              Flow
            </button>
            <button
              className="px-4 py-1 rounded-full transition-colors"
              style={{
                backgroundColor: appMode === "execute" ? "var(--accent-green)" : "transparent",
                color: appMode === "execute" ? "var(--bg-primary)" : "var(--text-secondary)",
                boxShadow: appMode === "execute" ? "0 0 8px color-mix(in srgb, var(--accent-green) 40%, transparent)" : "none",
              }}
              onClick={() => setAppMode("execute")}
              title="Execute (⌘2)"
            >
              Execute
            </button>
          </div>

          {appMode === "design" && (
            <button
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[12px] font-medium transition-all"
              style={{
                backgroundColor: sectionToolActive ? "var(--accent-purple)" : "transparent",
                color: sectionToolActive ? "var(--bg-primary)" : "var(--text-secondary)",
                border: `1px solid ${sectionToolActive ? "var(--accent-purple)" : "var(--border)"}`,
              }}
              onClick={() => setSectionToolActive(!sectionToolActive)}
              title="Draw a rectangle on canvas to create a section"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="1" y="1" width="14" height="14" rx="2" strokeDasharray="3 2" />
                <line x1="4" y1="5" x2="12" y2="5" />
                <line x1="4" y1="8" x2="10" y2="8" />
              </svg>
              Section
            </button>
          )}
          {appMode === "execute" && (
            <Button variant="secondary" onClick={() => setAppMode("design")}>
              Back to Flow
            </Button>
          )}
          <Button variant="secondary" onClick={onImport}>
            Import API
          </Button>
          {appMode !== "execute" && (
            <Button
              variant="primary"
              onClick={onRun}
              disabled={workflow.nodes.length === 0}
            >
              Execute
            </Button>
          )}
        </div>
      </header>
    </div>
  );
}
