"use client";

import { useState } from "react";
import { useWorkflowStore } from "@/stores/workflow-store";
import { ResponseTab } from "./response-tab";

export function ResponseViewer() {
  const { workflow, executionContext, isExecuting } = useWorkflowStore();
  const [activeStepId, setActiveStepId] = useState<string | null>(null);

  const results = executionContext?.results ?? {};
  const stepsWithResults = workflow.nodes.filter((s) => results[s.id]);

  const selectedStepId = activeStepId ?? stepsWithResults[stepsWithResults.length - 1]?.id;

  if (!executionContext && !isExecuting) {
    return (
      <div
        className="h-full flex items-center justify-center"
        style={{
          backgroundColor: "var(--bg-secondary)",
          borderTop: "1px solid var(--border)",
        }}
      >
        <div className="flex flex-col items-center gap-2">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          <p className="text-[12px]" style={{ color: "var(--text-secondary)" }}>
            Run the workflow to see results here
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="h-full flex flex-col overflow-hidden"
      style={{
        backgroundColor: "var(--bg-secondary)",
        borderTop: "1px solid var(--border)",
      }}
    >
      <div className="flex border-b overflow-x-auto" style={{ borderColor: "var(--border)" }}>
        {workflow.nodes.map((step) => {
          const result = results[step.id];
          const isActive = selectedStepId === step.id;
          const statusColor = result?.error
            ? "var(--accent-red)"
            : result
            ? "var(--accent-green)"
            : "var(--text-secondary)";

          return (
            <button
              key={step.id}
              onClick={() => setActiveStepId(step.id)}
              className="px-3 py-2 text-[11px] whitespace-nowrap cursor-pointer shrink-0"
              style={{
                color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                borderBottom: isActive ? "2px solid var(--accent-blue)" : "2px solid transparent",
              }}
            >
              <span
                className="inline-block w-1.5 h-1.5 rounded-full mr-1.5"
                style={{
                  backgroundColor: isExecuting && !result ? "var(--accent-yellow)" : statusColor,
                }}
              />
              {step.name}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-auto p-3 anim-fade-in">
        {isExecuting && !results[selectedStepId ?? ""] && (
          <p className="text-[12px]" style={{ color: "var(--accent-yellow)" }}>
            Executing...
          </p>
        )}
        {selectedStepId && results[selectedStepId] && (
          <ResponseTab
            result={results[selectedStepId]}
            stepName={
              workflow.nodes.find((s) => s.id === selectedStepId)?.name ?? ""
            }
          />
        )}
      </div>
    </div>
  );
}
