"use client";

import { useState } from "react";
import { FieldPicker } from "./field-picker";

interface ArraySelectorProps {
  data: unknown[];
  stepName: string;
  /** Target params that downstream APIs need (e.g. ["outlet_slug", "menu_uid"]) */
  targetParams?: string[];
  onSelect: (selectedFields: Record<string, unknown>) => void;
  onSkip: () => void;
}

function getDisplayFields(item: unknown, max = 4): { key: string; value: string }[] {
  if (item == null || typeof item !== "object") return [{ key: "value", value: String(item) }];
  const fields: { key: string; value: string }[] = [];
  for (const [key, val] of Object.entries(item as Record<string, unknown>)) {
    if (val == null || typeof val === "object") continue;
    fields.push({ key, value: String(val) });
    if (fields.length >= max) break;
  }
  return fields;
}

export function ArraySelector({ data, stepName, targetParams = [], onSelect, onSkip }: ArraySelectorProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showFieldPicker, setShowFieldPicker] = useState(false);

  const items = data.slice(0, 50);

  const handleItemClick = (index: number) => {
    setSelectedIndex(index);
    setShowFieldPicker(true);
  };

  const handleFieldsConfirmed = (fields: Record<string, unknown>) => {
    onSelect(fields);
    setShowFieldPicker(false);
  };

  return (
    <div className="rounded-lg border p-4 my-2" style={{ borderColor: "var(--accent-yellow)", backgroundColor: "var(--bg-secondary)" }}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-[12px] font-medium" style={{ color: "var(--text-primary)" }}>
            Select from {stepName} response
          </p>
          <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
            {data.length} items available — click to select and choose fields
          </p>
        </div>
        <button className="text-[11px] px-2 py-1 rounded border" style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }} onClick={onSkip}>
          Skip
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-[300px] overflow-auto">
        {items.map((item, i) => {
          const fields = getDisplayFields(item);
          const isSelected = selectedIndex === i;
          return (
            <div
              key={i}
              className="rounded border p-2 cursor-pointer transition-colors"
              style={{
                borderColor: isSelected ? "var(--accent-blue)" : "var(--border)",
                backgroundColor: isSelected ? "var(--bg-tertiary)" : "var(--bg-primary)",
              }}
              onClick={() => handleItemClick(i)}
            >
              {fields.map((f) => (
                <div key={f.key} className="flex justify-between gap-1">
                  <span className="text-[10px] truncate" style={{ color: "var(--text-secondary)" }}>{f.key}</span>
                  <span className="text-[10px] font-mono truncate" style={{ color: "var(--text-primary)" }}>{f.value}</span>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {showFieldPicker && selectedIndex != null && (
        <FieldPicker item={items[selectedIndex]} targetParams={targetParams} onConfirm={handleFieldsConfirmed} onCancel={() => setShowFieldPicker(false)} />
      )}
    </div>
  );
}
