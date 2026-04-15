"use client";

import { useState } from "react";
import { DataSelector, type SelectedValue } from "./data-selector";
import { SelectionMapper } from "./selection-mapper";
import type { StepResult, APIEndpoint, StepSelections } from "@/types";

interface AssistanceModalProps {
  open: boolean;
  stepName: string;
  result: StepResult;
  nextStepName: string;
  nextEndpoint: APIEndpoint | undefined;
  nextStepUrl: string;
  onComplete: (selections: StepSelections) => void;
  onSkip: () => void;
  onCancel: () => void;
}

type Phase = "select" | "map";

export function AssistanceModal({
  open,
  stepName,
  result,
  nextStepName,
  nextEndpoint,
  nextStepUrl,
  onComplete,
  onSkip,
  onCancel,
}: AssistanceModalProps) {
  const [phase, setPhase] = useState<Phase>("select");
  const [selections, setSelections] = useState<SelectedValue[]>([]);

  if (!open) return null;

  const handleConfirmSelection = (selected: SelectedValue[]) => {
    setSelections(selected);
    setPhase("map");
  };

  const handleBack = () => {
    setPhase("select");
  };

  const handleComplete = (result: StepSelections) => {
    setPhase("select");
    setSelections([]);
    onComplete(result);
  };

  const handleCancel = () => {
    setPhase("select");
    setSelections([]);
    onCancel();
  };

  const handleSkip = () => {
    setPhase("select");
    setSelections([]);
    onSkip();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
    >
      <div
        className="rounded-lg p-6 w-full max-w-2xl flex flex-col"
        style={{
          backgroundColor: "var(--bg-secondary)",
          border: "1px solid var(--border)",
          maxHeight: "80vh",
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
            {phase === "select" ? "Select Data" : "Map to Next Step"}
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-[10px] px-2 py-0.5 rounded" style={{
              backgroundColor: phase === "select" ? "var(--accent-purple)" : "var(--accent-blue)",
              color: "var(--bg-primary)",
            }}>
              {phase === "select" ? "Step 1/2" : "Step 2/2"}
            </span>
            <button
              onClick={handleCancel}
              className="text-xs cursor-pointer hover:opacity-80"
              style={{ color: "var(--text-secondary)" }}
            >
              ✕
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-auto">
          {phase === "select" ? (
            <DataSelector
              data={result.response}
              stepName={stepName}
              onConfirm={handleConfirmSelection}
              onSkip={handleSkip}
              onCancel={handleCancel}
            />
          ) : (
            <SelectionMapper
              selections={selections}
              nextStepName={nextStepName}
              nextEndpoint={nextEndpoint}
              nextStepUrl={nextStepUrl}
              onConfirm={handleComplete}
              onBack={handleBack}
              onCancel={handleCancel}
            />
          )}
        </div>
      </div>
    </div>
  );
}
