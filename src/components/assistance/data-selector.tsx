"use client";

import { useState } from "react";
import { buildDataTree, type TreeNode } from "@/lib/schema-utils";

interface SelectedValue {
  path: string;
  key: string;
  value: unknown;
}

interface DataSelectorProps {
  data: unknown;
  stepName: string;
  onConfirm: (selections: SelectedValue[]) => void;
  onSkip: () => void;
  onCancel: () => void;
}

export type { SelectedValue };

export function DataSelector({ data, stepName, onConfirm, onSkip, onCancel }: DataSelectorProps) {
  const [selected, setSelected] = useState<Map<string, SelectedValue>>(new Map());
  const tree = buildDataTree(data);

  const toggleSelection = (path: string, key: string, value: unknown) => {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.set(path, { path, key, value });
      }
      return next;
    });
  };

  return (
    <div className="flex flex-col h-full">
      <p className="text-[12px] mb-3" style={{ color: "var(--text-secondary)" }}>
        Select data from <strong style={{ color: "var(--accent-purple)" }}>{stepName}</strong> to pass to the next step.
      </p>

      <div className="flex-1 overflow-auto mb-3 rounded p-2" style={{ backgroundColor: "var(--bg-primary)", border: "1px solid var(--border)" }}>
        {tree.length === 0 ? (
          <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>No data available</p>
        ) : (
          tree.map((node) => (
            <CheckboxTreeNode
              key={node.path}
              node={node}
              depth={0}
              selected={selected}
              onToggle={toggleSelection}
            />
          ))
        )}
      </div>

      {selected.size > 0 && (
        <div className="mb-3 p-2 rounded" style={{ backgroundColor: "var(--bg-tertiary)", border: "1px solid var(--border)" }}>
          <p className="text-[10px] font-bold uppercase mb-1" style={{ color: "var(--accent-green)" }}>
            Selected ({selected.size})
          </p>
          {Array.from(selected.values()).map((s) => (
            <div key={s.path} className="text-[11px] flex items-center gap-1 py-0.5">
              <span style={{ color: "var(--text-primary)" }}>{s.key}</span>
              <span style={{ color: "var(--text-secondary)" }}>=</span>
              <span className="truncate" style={{ color: "var(--accent-green)" }}>
                {typeof s.value === "string" ? `"${s.value.slice(0, 30)}"` : String(s.value)}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 justify-end">
        <button
          onClick={onCancel}
          className="px-3 py-1.5 text-[11px] rounded cursor-pointer"
          style={{ color: "var(--text-secondary)", border: "1px solid var(--border)" }}
        >
          Cancel Execution
        </button>
        <button
          onClick={onSkip}
          className="px-3 py-1.5 text-[11px] rounded cursor-pointer"
          style={{ color: "var(--text-primary)", border: "1px solid var(--border)", backgroundColor: "var(--bg-tertiary)" }}
        >
          Skip
        </button>
        <button
          onClick={() => onConfirm(Array.from(selected.values()))}
          disabled={selected.size === 0}
          className="px-3 py-1.5 text-[11px] rounded cursor-pointer font-bold"
          style={{
            backgroundColor: selected.size > 0 ? "var(--accent-green)" : "var(--bg-tertiary)",
            color: selected.size > 0 ? "var(--bg-primary)" : "var(--text-secondary)",
          }}
        >
          Confirm Selection ({selected.size})
        </button>
      </div>
    </div>
  );
}

function CheckboxTreeNode({
  node,
  depth,
  selected,
  onToggle,
}: {
  node: TreeNode;
  depth: number;
  selected: Map<string, { path: string; key: string; value: unknown }>;
  onToggle: (path: string, key: string, value: unknown) => void;
}) {
  const [expanded, setExpanded] = useState(depth < 1);
  const isLeaf = node.type === "value";
  const isChecked = selected.has(node.path);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div style={{ marginLeft: depth > 0 ? 14 : 0 }}>
      <div
        className="flex items-center gap-1.5 py-0.5 rounded hover:bg-white/5 px-1 text-[11px]"
        style={{ cursor: isLeaf || hasChildren ? "pointer" : "default" }}
        onClick={() => {
          if (isLeaf) onToggle(node.path, node.key, node.value);
          else if (hasChildren) setExpanded(!expanded);
        }}
      >
        {isLeaf ? (
          <input
            type="checkbox"
            checked={isChecked}
            onChange={() => onToggle(node.path, node.key, node.value)}
            onClick={(e) => e.stopPropagation()}
            className="accent-[var(--accent-green)] shrink-0"
          />
        ) : (
          <span className="text-[9px] shrink-0 w-3 text-center" style={{ color: "var(--text-secondary)" }}>
            {expanded ? "▼" : "▶"}
          </span>
        )}
        <span style={{ color: isLeaf ? "var(--text-primary)" : "var(--text-secondary)" }}>
          {node.key}
        </span>
        {!isLeaf && (
          <span className="text-[9px]" style={{ color: "var(--text-secondary)" }}>
            {node.type === "array" ? `[${node.children?.length ?? 0}]` : `{${node.children?.length ?? 0}}`}
          </span>
        )}
        {isLeaf && node.value !== undefined && (
          <span className="ml-auto truncate max-w-[200px] text-[10px]" style={{ color: "var(--accent-green)" }}>
            {node.value === null ? "null" : typeof node.value === "string" ? `"${String(node.value).slice(0, 40)}"` : String(node.value)}
          </span>
        )}
      </div>
      {!isLeaf && expanded && hasChildren && node.children!.map((child) => (
        <CheckboxTreeNode key={child.path} node={child} depth={depth + 1} selected={selected} onToggle={onToggle} />
      ))}
    </div>
  );
}
