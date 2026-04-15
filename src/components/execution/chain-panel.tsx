"use client";

import { useState, type DragEvent } from "react";
import { MethodBadge } from "@/components/common/method-badge";
import { extractPathParams } from "@/lib/schema-utils";
import { useWorkflowStore } from "@/stores/workflow-store";
import type { WorkflowNode, APIEndpoint, NodeConnection } from "@/types";

interface ChainPanelProps {
  sourceNodeId: string;
  onCancel: () => void;
}

interface FieldInfo {
  name: string;
  location: "path" | "query" | "header" | "body";
  type: string;
  required: boolean;
  description?: string;
  children?: FieldInfo[];
}

interface ResponseEntry {
  key: string;
  path: string;
  value: unknown;
  type: string;
}

// Mapping: targetNodeId -> { "location.fieldName": { sourceKey, sourcePath, value } }
interface MappingValue {
  sourceKey: string;
  sourcePath: string;
  value: unknown;
}
type Mappings = Record<string, Record<string, MappingValue>>;

/** Build a tree node structure from response data for the available data section */
interface DataNode {
  key: string;
  path: string;
  value: unknown;
  type: "scalar" | "object" | "array";
  scalarType?: string;   // e.g. "string", "number"
  children?: DataNode[]; // for objects
  items?: DataNode[];    // for arrays — each item is a node
  itemCount?: number;
}

function buildAvailableTree(obj: unknown, key = "root", path = "", depth = 0, max = 8): DataNode | null {
  if (obj == null || typeof obj !== "object") {
    return { key, path, value: obj, type: "scalar", scalarType: obj == null ? "null" : typeof obj };
  }

  if (Array.isArray(obj)) {
    // Arrays don't increase depth — only object nesting does
    const items: DataNode[] = obj.slice(0, 50).map((item, i) => {
      const itemPath = path ? `${path}[${i}]` : `[${i}]`;
      const child = buildAvailableTree(item, `${i}`, itemPath, depth, max);
      return child ?? { key: `${i}`, path: itemPath, value: item, type: "scalar" as const, scalarType: typeof item };
    });
    return { key, path, value: obj, type: "array", items, itemCount: obj.length };
  }

  // Object — only objects increase depth
  if (depth > max) {
    // Too deep, show as a scalar JSON string so it's still draggable
    return { key, path, value: obj, type: "scalar", scalarType: "object" };
  }

  const children: DataNode[] = [];
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const childPath = path ? `${path}.${k}` : k;
    const child = buildAvailableTree(v, k, childPath, depth + 1, max);
    if (child) children.push(child);
  }
  return { key, path, value: obj, type: "object", children };
}

/** Flatten only top-level scalar fields (for non-array/non-object response) */
function flattenScalars(obj: unknown, prefix = ""): ResponseEntry[] {
  const entries: ResponseEntry[] = [];
  if (obj == null || typeof obj !== "object" || Array.isArray(obj)) return entries;
  for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (val == null || typeof val !== "object") {
      entries.push({ key, path, value: val, type: typeof val });
    }
  }
  return entries;
}

export function ChainPanel({ sourceNodeId, onCancel }: ChainPanelProps) {
  const { workflow, endpoints, executionContext, setUserOverride } = useWorkflowStore();
  const connections = workflow.connections;
  const allNodes = workflow.nodes;

  const [mappings, setMappings] = useState<Mappings>({});
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);

  const sourceNode = allNodes.find((n: WorkflowNode) => n.id === sourceNodeId);
  const sourceEndpoint = sourceNode
    ? endpoints.find((e: APIEndpoint) => e.id === sourceNode.endpointId)
    : undefined;
  const sourceResult = executionContext?.results[sourceNodeId];

  // Collect params used by the source API
  const sourceParams: ResponseEntry[] = [];
  if (sourceNode && sourceEndpoint) {
    const url = sourceNode.urlOverride || sourceEndpoint.path;
    for (const param of extractPathParams(url)) {
      const override = executionContext?.userOverrides?.[sourceNodeId]?.[`path.${param}`];
      sourceParams.push({
        key: param,
        path: `param.${param}`,
        value: override ?? `{${param}}`,
        type: "path param",
      });
    }
    for (const p of sourceEndpoint.parameters ?? []) {
      if (p.in === "query") {
        const override = executionContext?.userOverrides?.[sourceNodeId]?.[`query.${p.name}`];
        const fromNode = sourceNode.queryParams?.[p.name];
        const val = override ?? fromNode;
        if (val !== undefined && val !== "") {
          sourceParams.push({
            key: p.name,
            path: `param.${p.name}`,
            value: val,
            type: "query param",
          });
        }
      }
    }
  }

  const downstreamConnections = connections.filter(
    (c: NodeConnection) => c.sourceNodeId === sourceNodeId
  );

  if (downstreamConnections.length === 0) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
          No downstream APIs connected.
        </p>
      </div>
    );
  }

  const responseTree = sourceResult?.response
    ? buildAvailableTree(sourceResult.response, "response", "")
    : null;

  // --- Drag handlers ---
  const handleDragStart = (e: DragEvent, entry: ResponseEntry) => {
    e.dataTransfer.setData("application/json", JSON.stringify(entry));
    e.dataTransfer.effectAllowed = "link";
  };

  const handleDragOver = (e: DragEvent, dropKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "link";
    setDragOverTarget(dropKey);
  };

  const handleDragLeave = () => {
    setDragOverTarget(null);
  };

  const handleDrop = (e: DragEvent, targetNodeId: string, field: FieldInfo) => {
    e.preventDefault();
    setDragOverTarget(null);

    try {
      const entry: ResponseEntry = JSON.parse(e.dataTransfer.getData("application/json"));
      const dropKey = `${targetNodeId}::${field.location}.${field.name}`;

      // Save mapping locally for display
      setMappings((prev) => ({
        ...prev,
        [targetNodeId]: {
          ...(prev[targetNodeId] ?? {}),
          [`${field.location}.${field.name}`]: {
            sourceKey: entry.key,
            sourcePath: entry.path,
            value: entry.value,
          },
        },
      }));

      // Persist to store as userOverride on the target node
      setUserOverride(targetNodeId, `${field.location}.${field.name}`, entry.value);
    } catch {
      // ignore bad drag data
    }
  };

  const handleManualSet = (targetNodeId: string, fieldKey: string, fieldPath: string, value: unknown) => {
    setMappings((prev) => ({
      ...prev,
      [targetNodeId]: {
        ...(prev[targetNodeId] ?? {}),
        [fieldKey]: {
          sourceKey: "manual",
          sourcePath: "manual",
          value,
        },
      },
    }));
    setUserOverride(targetNodeId, fieldKey, value);
  };

  const removeMappingFor = (targetNodeId: string, fieldKey: string) => {
    setMappings((prev) => {
      const node = { ...(prev[targetNodeId] ?? {}) };
      delete node[fieldKey];
      return { ...prev, [targetNodeId]: node };
    });
    setUserOverride(targetNodeId, fieldKey, undefined);
  };

  return (
    <div className="h-full flex flex-col anim-fade-in" style={{ backgroundColor: "var(--bg-primary)" }}>
      {/* Header bar */}
      <div
        className="shrink-0 flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-secondary)" }}
      >
        <div>
          <p className="text-[12px] font-bold" style={{ color: "var(--accent-blue)" }}>
            Chain Response
          </p>
          <p className="text-[10px]" style={{ color: "var(--text-secondary)" }}>
            From: {sourceNode?.name ?? sourceNodeId}
          </p>
        </div>
        <button
          onClick={onCancel}
          className="px-3 py-1 text-[11px] font-bold rounded cursor-pointer"
          style={{
            backgroundColor: "var(--bg-tertiary)",
            color: "var(--text-secondary)",
            border: "1px solid var(--border)",
          }}
        >
          Cancel
        </button>
      </div>

      {/* Split: top = what next API needs (drop zone), bottom = available data (draggable) */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Top half — What next API requires (DROP ZONE) */}
        <div className="flex-1 overflow-auto border-b" style={{ borderColor: "var(--border)" }}>
          <div className="px-4 py-2 sticky top-0 z-10" style={{ backgroundColor: "var(--bg-tertiary)" }}>
            <p className="text-[11px] font-bold" style={{ color: "var(--accent-yellow)" }}>
              What Next API Requires
            </p>
            <p className="text-[9px]" style={{ color: "var(--text-secondary)" }}>
              Drop values from below onto fields
            </p>
          </div>
          <div className="p-3 space-y-3">
            {downstreamConnections.map((conn: NodeConnection) => {
              const targetNode = allNodes.find((n: WorkflowNode) => n.id === conn.targetNodeId);
              const targetEndpoint = targetNode
                ? endpoints.find((e: APIEndpoint) => e.id === targetNode.endpointId)
                : undefined;
              if (!targetNode || !targetEndpoint) return null;

              const fields = collectRequiredFields(targetNode, targetEndpoint);
              const nodeMappings = mappings[targetNode.id] ?? {};

              return (
                <div key={conn.id} className="anim-fade-in-up">
                  <div className="flex items-center gap-2 mb-2">
                    <MethodBadge method={targetEndpoint.method} />
                    <span className="text-[11px] font-medium truncate" style={{ color: "var(--text-primary)" }}>
                      {targetNode.name}
                    </span>
                  </div>

                  {fields.length === 0 ? (
                    <p className="text-[11px] px-2" style={{ color: "var(--text-secondary)" }}>
                      No parameters required.
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {(["path", "query", "header", "body"] as const).map((loc) => {
                        const locFields = fields.filter((f) => f.location === loc);
                        if (locFields.length === 0) return null;

                        const locLabel = loc === "path" ? "Path Params" : loc === "query" ? "Query Params" : loc === "header" ? "Headers" : "Body Payload";
                        const locColor = loc === "path" ? "var(--accent-yellow)" : loc === "query" ? "var(--accent-blue)" : loc === "header" ? "var(--text-secondary)" : "var(--accent-green)";

                        return (
                          <div key={loc}>
                            <p className="text-[9px] font-bold mb-0.5 px-2" style={{ color: locColor }}>
                              {locLabel}
                            </p>
                            {locFields.map((f) => (
                              <DropField
                                key={`${f.location}-${f.name}`}
                                field={f}
                                targetNodeId={targetNode.id}
                                parentPath=""
                                mappings={nodeMappings}
                                dragOverTarget={dragOverTarget}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                onRemoveMapping={removeMappingFor}
                                onManualSet={handleManualSet}
                              />
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom half — Available data (DRAGGABLE) */}
        <div className="flex-1 overflow-auto">
          <div className="px-4 py-2 sticky top-0 z-10" style={{ backgroundColor: "var(--bg-tertiary)" }}>
            <p className="text-[11px] font-bold" style={{ color: "var(--accent-green)" }}>
              Available Data
            </p>
            <p className="text-[9px]" style={{ color: "var(--text-secondary)" }}>
              Drag items to map them above
            </p>
          </div>
          <div className="p-3">
            {/* Params used in this API */}
            {sourceParams.length > 0 && (
              <div className="mb-2">
                <p className="text-[9px] font-bold mb-1 px-2" style={{ color: "var(--accent-yellow)" }}>
                  Params Used
                </p>
                <div className="space-y-0.5 mb-2">
                  {sourceParams.map((entry, i) => (
                    <DraggableItem key={`param-${i}`} entry={entry} onDragStart={handleDragStart} variant="param" />
                  ))}
                </div>
                <div className="border-b mb-2" style={{ borderColor: "var(--border)" }} />
              </div>
            )}

            {/* Response tree */}
            {!responseTree && sourceParams.length === 0 ? (
              <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
                No data available.
              </p>
            ) : responseTree ? (
              <>
                <p className="text-[9px] font-bold mb-1 px-2" style={{ color: "var(--accent-green)" }}>
                  Response Fields
                </p>
                <DraggableDataNode node={responseTree} onDragStart={handleDragStart} depth={0} isRoot className="anim-fade-in-up" />
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Recursive drop-zone field — handles scalars, objects, and arrays with + add item */
function DropField({
  field,
  targetNodeId,
  parentPath,
  mappings,
  dragOverTarget,
  onDragOver,
  onDragLeave,
  onDrop,
  onRemoveMapping,
  onManualSet,
  depth = 0,
}: {
  field: FieldInfo;
  targetNodeId: string;
  parentPath: string;
  mappings: Record<string, MappingValue>;
  dragOverTarget: string | null;
  onDragOver: (e: DragEvent, dropKey: string) => void;
  onDragLeave: () => void;
  onDrop: (e: DragEvent, targetNodeId: string, field: FieldInfo) => void;
  onRemoveMapping: (targetNodeId: string, fieldKey: string) => void;
  onManualSet: (targetNodeId: string, fieldKey: string, fieldPath: string, value: unknown) => void;
  depth?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const fieldPath = parentPath ? `${parentPath}.${field.name}` : field.name;
  const fieldKey = `${field.location}.${fieldPath}`;
  const dropKey = `${targetNodeId}::${fieldKey}`;
  const mapped = mappings[fieldKey];
  const isOver = dragOverTarget === dropKey;
  const hasChildren = field.children && field.children.length > 0;
  const isArray = field.type.startsWith("array") && hasChildren;

  // For array fields: track multiple items
  const [arrayItems, setArrayItems] = useState<number[]>([]);
  const [activeItem, setActiveItem] = useState<number | null>(null);

  const addItem = () => {
    const nextIdx = arrayItems.length;
    setArrayItems((prev) => [...prev, nextIdx]);
    setActiveItem(nextIdx);
    setExpanded(true);
  };

  const removeItem = (idx: number) => {
    setArrayItems((prev) => prev.filter((i) => i !== idx));
    if (activeItem === idx) setActiveItem(null);
    // Remove all mappings for this item
    if (field.children) {
      for (const child of field.children) {
        const childKey = `${field.location}.${fieldPath}[${idx}].${child.name}`;
        onRemoveMapping(targetNodeId, childKey);
      }
    }
  };

  // Non-array with children (plain object)
  if (hasChildren && !isArray) {
    return (
      <div style={{ marginLeft: depth * 12 }}>
        <div
          className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer"
          style={{ backgroundColor: "var(--bg-secondary)", border: "1px solid transparent" }}
          onClick={() => setExpanded(!expanded)}
        >
          <span className="text-[10px] shrink-0 select-none" style={{ color: "var(--accent-blue)", width: 12 }}>
            {expanded ? "▼" : "▶"}
          </span>
          <span className="text-[11px] font-mono font-medium shrink-0" style={{ color: "var(--accent-blue)" }}>
            {field.name}
          </span>
          <span className="text-[10px] shrink-0" style={{ color: "var(--text-secondary)" }}>{field.type}</span>
          {field.required && (
            <span className="text-[9px] font-bold shrink-0" style={{ color: "var(--accent-red)" }}>required</span>
          )}
          <span className="text-[9px] flex-1 text-right" style={{ color: "var(--text-secondary)" }}>
            {expanded ? "collapse" : "tap to expand"}
          </span>
        </div>
        {expanded && (
          <div className="mt-0.5 space-y-0.5">
            {field.children!.map((child) => (
              <DropField
                key={`${child.location}-${fieldPath}.${child.name}`}
                field={child}
                targetNodeId={targetNodeId}
                parentPath={fieldPath}
                mappings={mappings}
                dragOverTarget={dragOverTarget}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                onRemoveMapping={onRemoveMapping}
                onManualSet={onManualSet}
                depth={depth + 1}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Array field with children (array of objects)
  if (isArray) {
    return (
      <div style={{ marginLeft: depth * 12 }}>
        {/* Array header row */}
        <div
          className="flex items-center gap-2 px-2 py-1.5 rounded"
          style={{ backgroundColor: "var(--bg-secondary)", border: "1px solid transparent" }}
        >
          <span
            className="text-[10px] shrink-0 select-none cursor-pointer"
            style={{ color: "var(--accent-blue)", width: 12 }}
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? "▼" : "▶"}
          </span>
          <span
            className="text-[11px] font-mono font-medium shrink-0 cursor-pointer"
            style={{ color: "var(--accent-blue)" }}
            onClick={() => setExpanded(!expanded)}
          >
            {field.name}
          </span>
          <span className="text-[10px] shrink-0" style={{ color: "var(--text-secondary)" }}>{field.type}</span>
          {field.required && (
            <span className="text-[9px] font-bold shrink-0" style={{ color: "var(--accent-red)" }}>required</span>
          )}
          <span className="text-[9px] shrink-0" style={{ color: "var(--text-secondary)" }}>
            {arrayItems.length} item{arrayItems.length !== 1 ? "s" : ""}
          </span>
          <button
            onClick={addItem}
            className="ml-auto px-2 py-0.5 text-[10px] font-bold rounded cursor-pointer shrink-0"
            style={{
              backgroundColor: "var(--accent-blue)",
              color: "var(--bg-primary)",
            }}
          >
            + Add Item
          </button>
        </div>

        {/* Item chips grid */}
        {expanded && arrayItems.length > 0 && (
          <div className="mt-1 ml-3">
            <div className="flex flex-wrap gap-1 mb-1">
              {arrayItems.map((idx) => {
                const isActive = activeItem === idx;
                // Check how many fields are mapped for this item
                const mappedCount = field.children!.filter(
                  (c) => mappings[`${field.location}.${fieldPath}[${idx}].${c.name}`]
                ).length;
                const totalFields = field.children!.length;

                return (
                  <div
                    key={idx}
                    className="flex items-center gap-1 px-2 py-1 rounded cursor-pointer select-none"
                    style={{
                      backgroundColor: isActive
                        ? "color-mix(in srgb, var(--accent-blue) 15%, var(--bg-secondary))"
                        : mappedCount === totalFields && totalFields > 0
                        ? "color-mix(in srgb, var(--accent-green) 12%, var(--bg-secondary))"
                        : "var(--bg-tertiary)",
                      border: isActive
                        ? "1px solid var(--accent-blue)"
                        : mappedCount === totalFields && totalFields > 0
                        ? "1px solid color-mix(in srgb, var(--accent-green) 30%, transparent)"
                        : "1px solid var(--border)",
                    }}
                    onClick={() => setActiveItem(isActive ? null : idx)}
                  >
                    <span className="text-[11px] font-bold" style={{ color: isActive ? "var(--accent-blue)" : "var(--text-primary)" }}>
                      {idx + 1}
                    </span>
                    <span className="text-[9px]" style={{ color: "var(--text-secondary)" }}>
                      {mappedCount}/{totalFields}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeItem(idx); }}
                      className="text-[9px] cursor-pointer"
                      style={{ color: "var(--accent-red)" }}
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Active item's fields */}
            {activeItem !== null && (
              <div
                className="space-y-0.5 p-2 rounded border mb-1"
                style={{ borderColor: "var(--accent-blue)", backgroundColor: "var(--bg-primary)" }}
              >
                <p className="text-[9px] font-bold mb-1" style={{ color: "var(--accent-blue)" }}>
                  Item {activeItem + 1}
                </p>
                {field.children!.map((child) => (
                  <DropField
                    key={`${child.location}-${fieldPath}[${activeItem}].${child.name}`}
                    field={child}
                    targetNodeId={targetNodeId}
                    parentPath={`${fieldPath}[${activeItem}]`}
                    mappings={mappings}
                    dragOverTarget={dragOverTarget}
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onDrop={onDrop}
                    onRemoveMapping={onRemoveMapping}
                    onManualSet={onManualSet}
                    depth={0}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Prompt when no items yet */}
        {expanded && arrayItems.length === 0 && (
          <div className="mt-1 ml-3 px-2 py-2 rounded text-[10px]" style={{ color: "var(--text-secondary)", backgroundColor: "var(--bg-tertiary)" }}>
            No items yet. Press "+ Add Item" to start building the array.
          </div>
        )}
      </div>
    );
  }

  // Scalar / leaf field (no children) — editable + droppable
  const isEditable = !field.type.startsWith("array") && !field.type.startsWith("object");
  const [manualValue, setManualValue] = useState("");

  const commitManual = () => {
    if (!manualValue.trim()) return;
    let parsed: unknown = manualValue;
    if (field.type === "integer" || field.type === "number") {
      const n = Number(manualValue);
      if (!isNaN(n)) parsed = n;
    } else if (field.type === "boolean") {
      parsed = manualValue === "true";
    }
    onManualSet(targetNodeId, fieldKey, fieldPath, parsed);
    setManualValue("");
  };

  return (
    <div style={{ marginLeft: depth * 12 }}>
      <div
        onDragOver={(e) => onDragOver(e, dropKey)}
        onDragLeave={onDragLeave}
        onDrop={(e) => onDrop(e, targetNodeId, { ...field, name: fieldPath })}
        className="flex items-center gap-2 px-2 py-1.5 rounded transition-all"
        style={{
          backgroundColor: isOver
            ? "color-mix(in srgb, var(--accent-blue) 20%, var(--bg-secondary))"
            : mapped
            ? "color-mix(in srgb, var(--accent-green) 10%, var(--bg-secondary))"
            : "var(--bg-secondary)",
          border: isOver
            ? "1px dashed var(--accent-blue)"
            : mapped
            ? "1px solid color-mix(in srgb, var(--accent-green) 30%, transparent)"
            : "1px solid transparent",
        }}
      >
        <span style={{ width: 12 }} className="shrink-0" />
        <span className="text-[11px] font-mono font-medium shrink-0" style={{ color: "var(--text-primary)" }}>
          {field.name}
        </span>
        <span className="text-[10px] shrink-0" style={{ color: "var(--text-secondary)" }}>
          {field.type}
        </span>
        {field.required && !mapped && (
          <span className="text-[9px] font-bold shrink-0" style={{ color: "var(--accent-red)" }}>required</span>
        )}

        {mapped ? (
          <div className="flex items-center gap-1 flex-1 min-w-0 justify-end">
            <span className="text-[10px] font-mono truncate" style={{ color: "var(--accent-green)" }}>
              ← {mapped.sourceKey}
            </span>
            <span className="text-[9px] font-mono truncate" style={{ color: "var(--text-secondary)" }}>
              {formatValue(mapped.value)}
            </span>
            <button
              onClick={() => onRemoveMapping(targetNodeId, fieldKey)}
              className="text-[10px] shrink-0 cursor-pointer ml-1"
              style={{ color: "var(--accent-red)" }}
            >
              ✕
            </button>
          </div>
        ) : isEditable ? (
          <div className="flex items-center gap-1 flex-1 min-w-0">
            {field.type === "boolean" ? (
              <select
                className="flex-1 text-[10px] font-mono bg-transparent rounded px-1 py-0.5 outline-none border"
                style={{ color: "var(--text-primary)", borderColor: "var(--border)" }}
                value={manualValue}
                onChange={(e) => {
                  setManualValue(e.target.value);
                  const v = e.target.value;
                  if (v) onManualSet(targetNodeId, fieldKey, fieldPath, v === "true");
                }}
              >
                <option value="">select...</option>
                <option value="true">true</option>
                <option value="false">false</option>
              </select>
            ) : (
              <input
                className="flex-1 text-[10px] font-mono bg-transparent rounded px-1 py-0.5 outline-none border min-w-0"
                style={{ color: "var(--text-primary)", borderColor: "var(--border)" }}
                placeholder={isOver ? "Drop here" : `enter ${field.type}...`}
                type={field.type === "integer" || field.type === "number" ? "number" : "text"}
                value={manualValue}
                onChange={(e) => setManualValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") commitManual(); }}
                onBlur={commitManual}
              />
            )}
          </div>
        ) : (
          <span className="text-[9px] flex-1 text-right" style={{ color: "var(--text-secondary)" }}>
            {isOver ? "Drop here" : "drag a value here"}
          </span>
        )}
      </div>
    </div>
  );
}

/** Draggable param row (simple, for source params) */
function DraggableItem({
  entry,
  onDragStart,
  variant,
}: {
  entry: ResponseEntry;
  onDragStart: (e: DragEvent, entry: ResponseEntry) => void;
  variant: "param" | "response";
}) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, entry)}
      className="flex items-center gap-2 px-2 py-1 rounded cursor-grab active:cursor-grabbing select-none"
      style={{
        backgroundColor: variant === "param"
          ? "color-mix(in srgb, var(--accent-yellow) 8%, var(--bg-secondary))"
          : "var(--bg-secondary)",
      }}
    >
      <span className="text-[11px] shrink-0" style={{ color: "var(--text-secondary)" }}>⠿</span>
      <span className="text-[11px] font-mono shrink-0" style={{ color: "var(--accent-yellow)" }}>
        {entry.key}
      </span>
      <span className="text-[9px] shrink-0" style={{ color: "var(--text-secondary)" }}>{entry.type}</span>
      <span className="text-[10px] font-mono truncate flex-1 text-right" style={{ color: "var(--text-secondary)" }}>
        {String(entry.value ?? "null")}
      </span>
    </div>
  );
}

/** Recursive draggable tree node for response data — arrays show as numbered grid blocks */
function DraggableDataNode({
  node,
  onDragStart,
  depth,
  isRoot = false,
  className,
}: {
  node: DataNode;
  onDragStart: (e: DragEvent, entry: ResponseEntry) => void;
  depth: number;
  isRoot?: boolean;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(isRoot);
  const [activeItemIdx, setActiveItemIdx] = useState<number | null>(null);

  // Scalar leaf — draggable row
  if (node.type === "scalar") {
    const displayVal = String(node.value ?? "null");
    return (
      <div
        draggable
        onDragStart={(e) =>
          onDragStart(e, { key: node.key, path: node.path, value: node.value, type: node.scalarType ?? "string" })
        }
        className={`flex items-center gap-2 px-2 py-1 rounded cursor-grab active:cursor-grabbing select-none ${className ?? ""}`}
        style={{ backgroundColor: "var(--bg-secondary)", marginLeft: depth * 12 }}
      >
        <span className="text-[11px] shrink-0" style={{ color: "var(--text-secondary)" }}>⠿</span>
        <span className="text-[11px] font-mono shrink-0" style={{ color: "var(--text-primary)" }}>
          {node.key}
        </span>
        <span className="text-[9px] shrink-0" style={{ color: "var(--text-secondary)" }}>{node.scalarType}</span>
        <span className="text-[10px] font-mono truncate flex-1 text-right" style={{ color: "var(--text-secondary)" }}>
          {displayVal.length > 40 ? displayVal.slice(0, 40) + "…" : displayVal}
        </span>
      </div>
    );
  }

  // Array — numbered grid blocks
  if (node.type === "array") {
    const items = node.items ?? [];
    return (
      <div className={className} style={{ marginLeft: depth * 12 }}>
        {/* Array header — the whole array is also draggable */}
        <div
          draggable
          onDragStart={(e) =>
            onDragStart(e, { key: node.key, path: node.path, value: node.value, type: `array (${node.itemCount} items)` })
          }
          className="flex items-center gap-2 px-2 py-1 rounded cursor-grab active:cursor-grabbing select-none"
          style={{ backgroundColor: "color-mix(in srgb, var(--accent-yellow) 8%, var(--bg-secondary))" }}
        >
          <span className="text-[11px] shrink-0" style={{ color: "var(--text-secondary)" }}>⠿</span>
          <span
            className="text-[10px] shrink-0 select-none cursor-pointer"
            style={{ color: "var(--accent-yellow)" }}
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
          >
            {expanded ? "▼" : "▶"}
          </span>
          <span
            className="text-[11px] font-mono font-medium shrink-0 cursor-pointer"
            style={{ color: "var(--accent-yellow)" }}
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
          >
            {isRoot ? "response" : node.key}
          </span>
          <span className="text-[9px] shrink-0" style={{ color: "var(--text-secondary)" }}>
            {node.itemCount} items
          </span>
        </div>

        {/* Grid of numbered item blocks */}
        {expanded && items.length > 0 && (
          <div className="mt-1 ml-3">
            <div className="flex flex-wrap gap-1 mb-1">
              {items.map((item, i) => {
                const isActive = activeItemIdx === i;
                return (
                  <div
                    key={i}
                    className="px-2.5 py-1 rounded cursor-pointer select-none text-center anim-scale-in"
                    style={{
                      minWidth: 32,
                      backgroundColor: isActive
                        ? "color-mix(in srgb, var(--accent-blue) 15%, var(--bg-secondary))"
                        : "var(--bg-tertiary)",
                      border: isActive
                        ? "1px solid var(--accent-blue)"
                        : "1px solid var(--border)",
                    }}
                    onClick={() => setActiveItemIdx(isActive ? null : i)}
                  >
                    <span
                      className="text-[11px] font-bold"
                      style={{ color: isActive ? "var(--accent-blue)" : "var(--text-primary)" }}
                    >
                      {i + 1}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Expanded item fields */}
            {activeItemIdx !== null && items[activeItemIdx] && (
              <div
                className="p-2 rounded border mb-1 space-y-0.5 anim-expand-down"
                style={{ borderColor: "var(--accent-blue)", backgroundColor: "var(--bg-primary)" }}
              >
                <p className="text-[9px] font-bold mb-1" style={{ color: "var(--accent-blue)" }}>
                  Item {activeItemIdx + 1}
                </p>
                {items[activeItemIdx].type === "object" && items[activeItemIdx].children ? (
                  items[activeItemIdx].children!.map((child) => (
                    <DraggableDataNode key={child.path} node={child} onDragStart={onDragStart} depth={0} />
                  ))
                ) : (
                  <DraggableDataNode node={items[activeItemIdx]} onDragStart={onDragStart} depth={0} />
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Object — expandable with child fields
  return (
    <div className={className} style={{ marginLeft: depth * 12 }}>
      {!isRoot && (
        <div
          className="flex items-center gap-2 px-2 py-1 rounded cursor-pointer select-none"
          style={{ backgroundColor: "var(--bg-secondary)" }}
          onClick={() => setExpanded(!expanded)}
        >
          <span className="text-[10px] shrink-0" style={{ color: "var(--accent-blue)" }}>
            {expanded ? "▼" : "▶"}
          </span>
          <span className="text-[11px] font-mono font-medium shrink-0" style={{ color: "var(--accent-blue)" }}>
            {node.key}
          </span>
          <span className="text-[9px]" style={{ color: "var(--text-secondary)" }}>object</span>
        </div>
      )}
      {expanded && node.children && (
        <div className={`space-y-0.5 ${isRoot ? "" : "mt-0.5"}`}>
          {node.children.map((child) => (
            <DraggableDataNode key={child.path} node={child} onDragStart={onDragStart} depth={isRoot ? 0 : depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function formatValue(value: unknown): string {
  if (Array.isArray(value)) return `[${value.length} items]`;
  if (value == null) return "null";
  const s = String(value);
  return s.length > 30 ? s.slice(0, 30) + "…" : s;
}

/** Build child FieldInfo[] from a JSON schema object/array */
function schemaToChildren(schema: Record<string, any>, location: "path" | "query" | "header" | "body"): FieldInfo[] {
  if (!schema || typeof schema !== "object") return [];

  // If it's an array, recurse into items
  if (schema.type === "array" && schema.items) {
    return schemaToChildren(schema.items, location);
  }

  if (schema.type === "object" && schema.properties) {
    const requiredSet = new Set<string>(schema.required ?? []);
    const children: FieldInfo[] = [];
    for (const [key, val] of Object.entries(schema.properties)) {
      const v = val as Record<string, any>;
      const childType = v?.type ?? "any";
      const field: FieldInfo = {
        name: key,
        location,
        type: childType === "array" ? `array<${v?.items?.type ?? "any"}>` : childType,
        required: requiredSet.has(key),
        description: v?.description,
      };
      // Recurse for nested objects/arrays
      if (childType === "object" && v?.properties) {
        field.children = schemaToChildren(v, location);
      } else if (childType === "array" && v?.items) {
        const itemChildren = schemaToChildren(v.items, location);
        if (itemChildren.length > 0) {
          field.children = itemChildren;
        }
      }
      children.push(field);
    }
    return children;
  }

  return [];
}

/** Collect all fields (path, query, header, body) that the target API needs */
function collectRequiredFields(node: WorkflowNode, endpoint: APIEndpoint): FieldInfo[] {
  const fields: FieldInfo[] = [];

  const url = node.urlOverride || endpoint.path;
  for (const param of extractPathParams(url)) {
    fields.push({ name: param, location: "path", type: "string", required: true });
  }

  for (const p of endpoint.parameters ?? []) {
    if (p.in === "query" || p.in === "header") {
      fields.push({
        name: p.name,
        location: p.in as "query" | "header",
        type: p.schema?.type ?? "string",
        required: !!p.required,
        description: p.description,
      });
    }
  }

  if (endpoint.requestSchema && typeof endpoint.requestSchema === "object") {
    const schema = endpoint.requestSchema;
    const requiredSet = new Set<string>(schema.required ?? []);

    if (schema.properties) {
      for (const [key, val] of Object.entries(schema.properties)) {
        const v = val as Record<string, any>;
        const fieldType = v?.type ?? "any";
        const field: FieldInfo = {
          name: key,
          location: "body",
          type: fieldType === "array" ? `array<${v?.items?.type ?? "any"}>` : fieldType,
          required: requiredSet.has(key),
          description: v?.description,
        };
        if (fieldType === "object" && v?.properties) {
          field.children = schemaToChildren(v, "body");
        } else if (fieldType === "array" && v?.items) {
          const itemChildren = schemaToChildren(v.items, "body");
          if (itemChildren.length > 0) {
            field.children = itemChildren;
          }
        }
        fields.push(field);
      }
    } else if (schema.type === "array") {
      const field: FieldInfo = {
        name: "items",
        location: "body",
        type: `array<${schema.items?.type ?? "any"}>`,
        required: true,
        description: "Request body is an array",
      };
      if (schema.items) {
        const itemChildren = schemaToChildren(schema.items, "body");
        if (itemChildren.length > 0) {
          field.children = itemChildren;
        }
      }
      fields.push(field);
    }
  }

  return fields;
}
