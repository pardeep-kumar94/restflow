"use client";

import { useState } from "react";

interface FieldPickerProps {
  item: unknown;
  /** Target params the downstream APIs need (e.g. ["outlet_slug", "menu_uid"]) */
  targetParams: string[];
  onConfirm: (selectedFields: Record<string, unknown>) => void;
  onCancel: () => void;
}

interface FieldEntry {
  path: string;
  key: string;
  value: unknown;
  depth: number;
  isLeaf: boolean;
}

function flattenItem(obj: unknown, prefix = "", depth = 0, maxDepth = 4): FieldEntry[] {
  const entries: FieldEntry[] = [];
  if (obj == null || typeof obj !== "object" || depth > maxDepth) return entries;

  if (Array.isArray(obj)) {
    obj.slice(0, 10).forEach((item, i) => {
      const path = prefix ? `${prefix}[${i}]` : `[${i}]`;
      const isLeaf = item == null || typeof item !== "object";
      entries.push({ path, key: `[${i}]`, value: isLeaf ? item : undefined, depth, isLeaf });
      if (!isLeaf) {
        entries.push(...flattenItem(item, path, depth + 1, maxDepth));
      }
    });
    return entries;
  }

  for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${key}` : key;
    const isLeaf = val == null || typeof val !== "object";
    entries.push({ path, key, value: isLeaf ? val : undefined, depth, isLeaf });
    if (!isLeaf) {
      entries.push(...flattenItem(val, path, depth + 1, maxDepth));
    }
  }
  return entries;
}

/** Auto-guess which target param a source field should map to */
function autoMatchTarget(fieldName: string, targets: string[]): string {
  const fn = fieldName.toLowerCase().replace(/[_-]/g, "");
  // Exact match
  for (const t of targets) {
    if (t.toLowerCase().replace(/[_-]/g, "") === fn) return t;
  }
  // Field name is contained in target or vice versa
  for (const t of targets) {
    const tn = t.toLowerCase().replace(/[_-]/g, "");
    if (tn.includes(fn) || fn.includes(tn)) return t;
  }
  // Common patterns: "id" matches "*_id", "*_uid", "*Id"
  if (fn === "id") {
    for (const t of targets) {
      const tn = t.toLowerCase();
      if (tn.endsWith("id") || tn.endsWith("uid")) return t;
    }
  }
  return "";
}

export function FieldPicker({ item, targetParams, onConfirm, onCancel }: FieldPickerProps) {
  const fields = flattenItem(item);
  const leafFields = fields.filter((f) => f.isLeaf);

  // State: which fields are checked, and what target param each maps to
  const [fieldMappings, setFieldMappings] = useState<Record<string, { checked: boolean; target: string }>>(() => {
    const mappings: Record<string, { checked: boolean; target: string }> = {};
    const usedTargets = new Set<string>();

    for (const field of leafFields) {
      const autoTarget = autoMatchTarget(field.key, targetParams.filter((t) => !usedTargets.has(t)));
      const hasMatch = autoTarget !== "";
      if (hasMatch) usedTargets.add(autoTarget);
      mappings[field.path] = { checked: hasMatch, target: autoTarget };
    }
    return mappings;
  });

  const toggleCheck = (path: string) => {
    setFieldMappings((prev) => ({
      ...prev,
      [path]: { ...prev[path], checked: !prev[path].checked },
    }));
  };

  const setTarget = (path: string, target: string) => {
    setFieldMappings((prev) => ({
      ...prev,
      [path]: { ...prev[path], target },
    }));
  };

  const handleConfirm = () => {
    const selected: Record<string, unknown> = {};
    for (const field of leafFields) {
      const mapping = fieldMappings[field.path];
      if (mapping?.checked) {
        // Use "sourceField->targetParam" format so executor knows the mapping
        const key = mapping.target ? `${field.key}->${mapping.target}` : field.key;
        selected[key] = field.value;
      }
    }
    onConfirm(selected);
  };

  const checkedCount = Object.values(fieldMappings).filter((m) => m.checked).length;

  return (
    <div className="mt-3 rounded border p-3" style={{ borderColor: "var(--accent-blue)", backgroundColor: "var(--bg-primary)" }}>
      <p className="text-[12px] font-medium mb-1" style={{ color: "var(--text-primary)" }}>
        Select fields to pass forward
      </p>
      {targetParams.length > 0 && (
        <p className="text-[10px] mb-2" style={{ color: "var(--text-secondary)" }}>
          Next API needs: {targetParams.join(", ")}
        </p>
      )}

      <div className="max-h-[300px] overflow-auto space-y-1.5">
        {fields.map((field) => {
          const mapping = fieldMappings[field.path];
          if (!field.isLeaf) {
            return (
              <div key={field.path} className="flex items-center gap-2" style={{ paddingLeft: `${field.depth * 12}px` }}>
                <span className="w-3.5 shrink-0 text-[10px]" style={{ color: "var(--text-secondary)" }}>▾</span>
                <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>{field.key}</span>
              </div>
            );
          }

          return (
            <div key={field.path} style={{ paddingLeft: `${field.depth * 12}px` }}>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={mapping?.checked ?? false}
                  onChange={() => toggleCheck(field.path)}
                  className="shrink-0"
                />
                <span className="text-[11px] shrink-0" style={{ color: "var(--text-secondary)" }}>{field.key}</span>
                <span className="text-[11px] font-mono truncate" style={{ color: "var(--text-primary)" }}>
                  {String(field.value ?? "null")}
                </span>
              </div>
              {/* Target param dropdown - shown when checked and targets available */}
              {mapping?.checked && targetParams.length > 0 && (
                <div className="flex items-center gap-1 mt-0.5 ml-5">
                  <span className="text-[10px]" style={{ color: "var(--text-secondary)" }}>→ maps to:</span>
                  <select
                    value={mapping.target}
                    onChange={(e) => setTarget(field.path, e.target.value)}
                    className="text-[10px] px-1 py-0.5 rounded border outline-none"
                    style={{
                      backgroundColor: "var(--bg-tertiary)",
                      color: "var(--text-primary)",
                      borderColor: mapping.target ? "var(--accent-green)" : "var(--accent-yellow)",
                    }}
                  >
                    <option value="">-- select target --</option>
                    {targetParams.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex justify-end gap-2 mt-3">
        <button className="text-[11px] px-3 py-1 rounded border" style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }} onClick={onCancel}>
          Cancel
        </button>
        <button className="text-[11px] px-3 py-1 rounded" style={{ backgroundColor: "var(--accent-blue)", color: "var(--bg-primary)" }} onClick={handleConfirm}>
          Confirm ({checkedCount} fields)
        </button>
      </div>
    </div>
  );
}
