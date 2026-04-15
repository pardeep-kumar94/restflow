"use client";

import { type ReactNode } from "react";

interface KeyValueRowProps {
  keyName: string;
  value: string;
  onKeyChange: (key: string) => void;
  onValueChange: (value: string) => void;
  onRemove: () => void;
  variablePicker?: ReactNode;
}

export function KeyValueRow({
  keyName,
  value,
  onKeyChange,
  onValueChange,
  onRemove,
  variablePicker,
}: KeyValueRowProps) {
  return (
    <div className="flex items-center gap-1">
      <input
        value={keyName}
        onChange={(e) => onKeyChange(e.target.value)}
        placeholder="Key"
        className="flex-1 px-2 py-1 text-[12px] rounded outline-none"
        style={{
          backgroundColor: "var(--bg-primary)",
          color: "var(--text-primary)",
          border: "1px solid var(--border)",
        }}
      />
      <input
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        placeholder="Value"
        className="flex-1 px-2 py-1 text-[12px] rounded outline-none"
        style={{
          backgroundColor: "var(--bg-primary)",
          color: value.includes("{{") ? "var(--accent-blue)" : "var(--text-primary)",
          border: "1px solid var(--border)",
        }}
      />
      {variablePicker}
      <button
        onClick={onRemove}
        className="text-[11px] px-1 cursor-pointer hover:opacity-80"
        style={{ color: "var(--accent-red)" }}
      >
        ✕
      </button>
    </div>
  );
}
