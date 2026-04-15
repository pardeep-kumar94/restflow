"use client";

interface SuggestionCardProps {
  sourceStepName: string;
  sourceField: string;
  targetLabel: string;
  onAccept: () => void;
  onDismiss: () => void;
}

export function SuggestionCard({
  sourceStepName,
  sourceField,
  targetLabel,
  onAccept,
  onDismiss,
}: SuggestionCardProps) {
  return (
    <div
      className="flex items-center gap-2 px-2 py-1.5 rounded text-[11px] mb-1"
      style={{
        backgroundColor: "color-mix(in srgb, var(--accent-green) 8%, transparent)",
        border: "1px solid color-mix(in srgb, var(--accent-green) 25%, transparent)",
      }}
    >
      <div className="flex-1 min-w-0 truncate">
        <span style={{ color: "var(--accent-purple)" }}>{sourceStepName}</span>
        <span style={{ color: "var(--text-secondary)" }}>{" → "}</span>
        <span style={{ color: "var(--text-primary)" }}>{sourceField}</span>
        <span style={{ color: "var(--text-secondary)" }}>{" → "}</span>
        <span style={{ color: "var(--accent-yellow)" }}>{targetLabel}</span>
      </div>
      <button
        onClick={onAccept}
        className="px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer shrink-0"
        style={{
          backgroundColor: "var(--accent-green)",
          color: "var(--bg-primary)",
        }}
      >
        Map
      </button>
      <button
        onClick={onDismiss}
        className="text-[10px] cursor-pointer shrink-0 hover:opacity-80"
        style={{ color: "var(--text-secondary)" }}
      >
        ✕
      </button>
    </div>
  );
}
