"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import type { NodeConnection, ConnectionMapping, WorkflowNode, APIEndpoint } from "@/types";
import { useWorkflowStore } from "@/stores/workflow-store";
import { flattenSchema, extractPathParams, buildDataTree, type TreeNode, type FlatField } from "@/lib/schema-utils";

/* ─── Types ─── */

interface SourceField {
  name: string;
  path: string;
  type: string;
  section: "response" | "params" | "headers";
  depth: number;
  isArray?: boolean;
  isObject?: boolean;
  isArrayItem?: boolean;
  preview?: string;
}

interface TargetField {
  field: string;
  location: "header" | "query" | "body";
  schemaType: string;
  depth: number;
  isArray?: boolean;
  isObject?: boolean;
  enum?: string[];
  minimum?: number;
  maximum?: number;
  required?: boolean;
  section: string;
  /** For dynamic array items: the array path + index prefix, e.g. "items.0" */
  arrayItemPrefix?: string;
}

interface MappingLink {
  sourcePath: string;
  sourceName: string;
  targetKey: string; // "location::field"
  value: string;
}

/* ─── Constants ─── */

const PAGE_SIZE = 20;
const MAX_DEPTH = 8;

/* ─── Source field builders ─── */

function treeToSourceFields(nodes: TreeNode[], prefix: string, depth: number, fields: SourceField[] = []): SourceField[] {
  if (depth > MAX_DEPTH) return fields;
  for (const node of nodes) {
    const path = `${prefix}.${node.path}`;
    const isArr = node.type === "array";
    const isObj = node.type === "object";
    fields.push({
      name: node.key,
      path,
      type: isArr ? "array" : isObj ? "object" : typeof node.value === "number" ? "number" : typeof node.value === "boolean" ? "boolean" : "string",
      section: "response",
      depth,
      isArray: isArr,
      isObject: isObj,
      isArrayItem: /\.\d+\./.test(path) || /\.\d+$/.test(path),
      preview: node.type === "value" ? String(node.value ?? "") : undefined,
    });
    if (node.children) {
      treeToSourceFields(node.children, prefix, depth + 1, fields);
    }
  }
  return fields;
}

function buildSourceFields(endpoint: APIEndpoint | undefined, responseData?: unknown): SourceField[] {
  const fields: SourceField[] = [];

  if (responseData != null && typeof responseData === "object") {
    const tree = buildDataTree(responseData);
    treeToSourceFields(tree, "response", 0, fields);
  } else if (endpoint?.responseSchema) {
    const flat = flattenSchema(endpoint.responseSchema);
    for (const f of flat) {
      const depth = f.path.split(".").filter((p) => p !== "[]").length - 1;
      fields.push({
        name: f.name,
        path: `response.${f.path}`,
        type: f.type,
        section: "response",
        depth: Math.max(0, depth),
        isArray: f.type === "array",
        isObject: f.type === "object",
        isArrayItem: f.path.includes("[]"),
      });
    }
  }

  if (endpoint) {
    for (const param of endpoint.parameters ?? []) {
      if (param.in === "query" || param.in === "path") {
        fields.push({ name: param.name, path: `queryParams.${param.name}`, type: param.schema?.type ?? "string", section: "params", depth: 0 });
      }
      if (param.in === "header") {
        fields.push({ name: param.name, path: `headers.${param.name}`, type: "string", section: "headers", depth: 0 });
      }
    }
  }

  return fields;
}

/* ─── Target field builder (tree-aware, with dynamic array items) ─── */

function buildTargetFields(
  targetEndpoint: APIEndpoint | undefined,
  targetNode: WorkflowNode,
  /** number of items per array field path, e.g. { "items": 2 } */
  arrayItemCounts: Record<string, number>,
): TargetField[] {
  const fields: TargetField[] = [];
  const targetUrl = targetNode.urlOverride || (targetEndpoint ? `${targetEndpoint.baseUrl ?? ""}${targetEndpoint.path}` : "");
  const pathParams = extractPathParams(targetUrl);

  // Path params
  for (const param of pathParams) {
    fields.push({ field: param, location: "query", schemaType: "string", depth: 0, section: "Path Params" });
  }

  if (!targetEndpoint) return fields;

  // Header / query params
  for (const param of targetEndpoint.parameters) {
    if (param.in === "header") {
      fields.push({ field: param.name, location: "header", schemaType: param.schema?.type ?? "string", depth: 0, section: "Headers", enum: param.schema?.enum });
    }
    if (param.in === "query" && !pathParams.includes(param.name)) {
      fields.push({ field: param.name, location: "query", schemaType: param.schema?.type ?? "string", depth: 0, section: "Query Params", enum: param.schema?.enum });
    }
  }

  // Body — build as tree
  if (targetEndpoint.requestSchema) {
    buildBodyTree(targetEndpoint.requestSchema, "", 0, fields, arrayItemCounts);
  }

  return fields;
}

function buildBodyTree(
  schema: Record<string, any>,
  prefix: string,
  depth: number,
  fields: TargetField[],
  arrayItemCounts: Record<string, number>,
) {
  if (!schema || typeof schema !== "object" || depth > MAX_DEPTH) return;

  if (schema.type === "object" && schema.properties) {
    for (const [key, value] of Object.entries(schema.properties)) {
      const val = value as Record<string, any>;
      const path = prefix ? `${prefix}.${key}` : key;
      const isArr = val?.type === "array";
      const isObj = val?.type === "object" && !!val?.properties;

      fields.push({
        field: path,
        location: "body",
        schemaType: val?.type ?? "any",
        depth,
        isArray: isArr,
        isObject: isObj,
        section: "Body",
        enum: val?.enum,
        minimum: val?.minimum,
        maximum: val?.maximum,
        required: schema.required?.includes(key),
      });

      if (isObj) {
        buildBodyTree(val, path, depth + 1, fields, arrayItemCounts);
      }

      if (isArr && val?.items) {
        const itemSchema = val.items as Record<string, any>;
        const count = arrayItemCounts[path] ?? 1;
        for (let i = 0; i < count; i++) {
          const itemPrefix = `${path}.${i}`;
          // Add a visual header for each array item
          fields.push({
            field: itemPrefix,
            location: "body",
            schemaType: "object",
            depth: depth + 1,
            isObject: true,
            section: "Body",
            arrayItemPrefix: itemPrefix,
          });
          if (itemSchema.type === "object" && itemSchema.properties) {
            buildBodyTree(itemSchema, itemPrefix, depth + 2, fields, arrayItemCounts);
          } else {
            // Primitive array items
            fields.push({
              field: itemPrefix,
              location: "body",
              schemaType: itemSchema.type ?? "any",
              depth: depth + 2,
              section: "Body",
            });
          }
        }
      }
    }
  }
}

/* ─── Name similarity for smart-map ─── */

function nameSim(a: string, b: string): number {
  const sa = a.toLowerCase().replace(/[_-]/g, "");
  const sb = b.toLowerCase().replace(/[_-]/g, "");
  if (sa === sb) return 1;
  if (sa.includes(sb) || sb.includes(sa)) return 0.7;
  const la = a.toLowerCase().split(/[_-]/).pop() ?? "";
  const lb = b.toLowerCase().split(/[_-]/).pop() ?? "";
  if (la.length > 2 && la === lb) return 0.6;
  return 0;
}

/* ─── Exports ─── */

/** Right-panel connection mapper */
export function ConnectionMapper() {
  const {
    workflow, endpoints, executionContext,
    selectedConnectionId, selectConnection,
    updateConnectionMappings, removeConnection,
  } = useWorkflowStore();

  const connection = workflow.connections.find((c) => c.id === selectedConnectionId);
  if (!connection) return null;

  return (
    <ConnectionMapperInner
      key={connection.id}
      connection={connection}
      workflow={workflow}
      endpoints={endpoints}
      executionContext={executionContext}
      onSave={(mappings) => updateConnectionMappings(connection.id, mappings)}
      onClose={() => selectConnection(null)}
      onDelete={() => { removeConnection(connection.id); selectConnection(null); }}
    />
  );
}

/* ─── Inner component ─── */

function ConnectionMapperInner({
  connection, workflow, endpoints, executionContext, onSave, onClose, onDelete,
}: {
  connection: NodeConnection;
  workflow: { nodes: WorkflowNode[]; connections: NodeConnection[] };
  endpoints: APIEndpoint[];
  executionContext: any;
  onSave: (mappings: ConnectionMapping[]) => void;
  onClose: () => void;
  onDelete: () => void;
}) {
  const sourceNode = workflow.nodes.find((n) => n.id === connection.sourceNodeId)!;
  const targetNode = workflow.nodes.find((n) => n.id === connection.targetNodeId)!;
  const sourceEndpoint = endpoints.find((e) => e.id === sourceNode?.endpointId);
  const targetEndpoint = endpoints.find((e) => e.id === targetNode?.endpointId);
  const sourceResponseData = executionContext?.results[sourceNode?.id]?.response;

  const containerRef = useRef<HTMLDivElement>(null);
  const sourceRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const targetRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [lineCoords, setLineCoords] = useState<{ sx: number; sy: number; tx: number; ty: number; key: string }[]>([]);

  // Links state
  const [links, setLinks] = useState<MappingLink[]>(() =>
    connection.fieldMappings.map((m) => ({
      sourcePath: m.sourceField ?? "",
      sourceName: m.sourceField ?? "",
      targetKey: `${m.targetLocation}::${m.targetField}`,
      value: m.value,
    }))
  );
  const [selectedSource, setSelectedSource] = useState<SourceField | null>(null);
  // Pagination
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Collapsed sets
  const [collapsedSource, setCollapsedSource] = useState<Set<string>>(new Set());
  const [collapsedTarget, setCollapsedTarget] = useState<Set<string>>(new Set());

  // Array item counts for target body arrays
  const [arrayItemCounts, setArrayItemCounts] = useState<Record<string, number>>(() => {
    // Infer from existing mappings
    const counts: Record<string, number> = {};
    for (const m of connection.fieldMappings) {
      if (m.targetLocation !== "body") continue;
      const match = m.targetField.match(/^(.+)\.(\d+)\./);
      if (match) {
        const arrPath = match[1];
        const idx = parseInt(match[2], 10) + 1;
        counts[arrPath] = Math.max(counts[arrPath] ?? 1, idx);
      }
    }
    return counts;
  });

  const addArrayItem = (arrayPath: string) => {
    setArrayItemCounts((prev) => ({ ...prev, [arrayPath]: (prev[arrayPath] ?? 1) + 1 }));
  };
  const removeArrayItem = (arrayPath: string) => {
    setArrayItemCounts((prev) => {
      const count = prev[arrayPath] ?? 1;
      if (count <= 1) return prev;
      const newCount = count - 1;
      // Remove links for the removed item
      const removedPrefix = `body::${arrayPath}.${newCount}`;
      setLinks((l) => l.filter((link) => !link.targetKey.startsWith(removedPrefix)));
      return { ...prev, [arrayPath]: newCount };
    });
  };

  // Build fields
  const allSourceFields = useMemo(() => buildSourceFields(sourceEndpoint, sourceResponseData), [sourceEndpoint, sourceResponseData]);
  const targetFields = useMemo(() => buildTargetFields(targetEndpoint, targetNode, arrayItemCounts), [targetEndpoint, targetNode.urlOverride, arrayItemCounts]);

  // Filter collapsed source
  const filteredSourceFields = useMemo(() => {
    return allSourceFields.filter((f) => {
      const pathParts = f.path.split(".");
      for (let i = 1; i < pathParts.length; i++) {
        const pp = pathParts.slice(0, i).join(".");
        if (collapsedSource.has(pp)) return false;
      }
      return true;
    });
  }, [allSourceFields, collapsedSource]);

  const visibleSourceFields = filteredSourceFields.slice(0, visibleCount);
  const hasMore = filteredSourceFields.length > visibleCount;

  // Filter collapsed target
  const visibleTargetFields = useMemo(() => {
    return targetFields.filter((f) => {
      const pathParts = f.field.split(".");
      for (let i = 1; i < pathParts.length; i++) {
        const pp = pathParts.slice(0, i).join(".");
        if (collapsedTarget.has(pp)) return false;
      }
      return true;
    });
  }, [targetFields, collapsedTarget]);

  const toggleSourceCollapse = (path: string) => {
    setCollapsedSource((prev) => { const next = new Set(prev); next.has(path) ? next.delete(path) : next.add(path); return next; });
  };
  const toggleTargetCollapse = (path: string) => {
    setCollapsedTarget((prev) => { const next = new Set(prev); next.has(path) ? next.delete(path) : next.add(path); return next; });
  };

  // ── Smart map: select source object → auto-map children to target ──
  const handleSmartMap = (sourceObj: SourceField) => {
    // Get all leaf children of this source object
    const childPrefix = sourceObj.path + ".";
    const children = allSourceFields.filter(
      (f) => f.path.startsWith(childPrefix) && f.type !== "array" && f.type !== "object"
    );

    // Get all mappable target fields (leaf fields)
    const leafTargets = targetFields.filter(
      (t) => !t.isArray && !t.isObject
    );

    const newLinks: MappingLink[] = [...links];
    const usedTargets = new Set(newLinks.map((l) => l.targetKey));

    for (const child of children) {
      const childName = child.name;
      // Find best matching target
      let bestTarget: TargetField | null = null;
      let bestScore = 0;
      for (const target of leafTargets) {
        const targetName = target.field.split(".").pop() ?? target.field;
        const score = nameSim(childName, targetName);
        const targetKey = `${target.location}::${target.field}`;
        if (score > bestScore && !usedTargets.has(targetKey)) {
          bestScore = score;
          bestTarget = target;
        }
      }
      if (bestTarget && bestScore >= 0.5) {
        const targetKey = `${bestTarget.location}::${bestTarget.field}`;
        usedTargets.add(targetKey);
        newLinks.push({
          sourcePath: child.path,
          sourceName: child.name,
          targetKey,
          value: `{{${sourceNode.id}.${child.path}}}`,
        });
      }
    }

    setLinks(newLinks);
    setSelectedSource(null);
  };

  const handleSourceClick = (field: SourceField) => {
    if (field.isArray) {
      toggleSourceCollapse(field.path);
      return;
    }
    if (field.isObject) {
      // Objects can be smart-mapped or collapsed
      toggleSourceCollapse(field.path);
      return;
    }
    if (selectedSource?.path === field.path) {
      setSelectedSource(null);
    } else {
      setSelectedSource(field);
    }
  };

  const handleTargetClick = (target: TargetField) => {
    if (target.isArray) {
      toggleTargetCollapse(target.field);
      return;
    }
    if (target.isObject) {
      toggleTargetCollapse(target.field);
      return;
    }
    if (!selectedSource) return;
    const targetKey = `${target.location}::${target.field}`;
    setLinks((prev) => prev.filter((l) => l.targetKey !== targetKey));

    const newLink: MappingLink = {
      sourcePath: selectedSource.path,
      sourceName: selectedSource.name,
      targetKey,
      value: `{{${sourceNode.id}.${selectedSource.path}}}`,
    };
    setLinks((prev) => [...prev, newLink]);
    setSelectedSource(null);
  };

  const handleRemoveLink = (targetKey: string) => {
    setLinks((prev) => prev.filter((l) => l.targetKey !== targetKey));
  };

  const handleSave = () => {
    const mappings: ConnectionMapping[] = [];
    for (const link of links) {
      const [location, ...fieldParts] = link.targetKey.split("::");
      const field = fieldParts.join("::");
      mappings.push({
        targetField: field,
        targetLocation: location as "header" | "query" | "body",
        value: link.value,
        sourceField: link.sourceName,
      });
    }
    onSave(mappings);
  };

  // SVG lines
  const updateLines = useCallback(() => {
    if (!containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const coords: typeof lineCoords = [];
    for (const link of links) {
      const sourceEl = sourceRefs.current[link.sourcePath];
      const targetEl = targetRefs.current[link.targetKey];
      if (!sourceEl || !targetEl) continue;
      const sRect = sourceEl.getBoundingClientRect();
      const tRect = targetEl.getBoundingClientRect();
      coords.push({
        sx: sRect.right - containerRect.left,
        sy: sRect.top + sRect.height / 2 - containerRect.top,
        tx: tRect.left - containerRect.left,
        ty: tRect.top + tRect.height / 2 - containerRect.top,
        key: `${link.sourcePath}→${link.targetKey}`,
      });
    }
    setLineCoords(coords);
  }, [links]);

  useEffect(() => {
    const t = setTimeout(updateLines, 50);
    return () => clearTimeout(t);
  }, [links, updateLines, collapsedSource, collapsedTarget, visibleCount, arrayItemCounts]);

  const mappedSourcePaths = new Set(links.map((l) => l.sourcePath));

  // Group source by section
  const sourceSections = useMemo(() => {
    const g: Record<string, SourceField[]> = {};
    for (const f of visibleSourceFields) {
      const label = f.section === "response" ? "Response" : f.section === "params" ? "Params" : "Headers";
      (g[label] ??= []).push(f);
    }
    return g;
  }, [visibleSourceFields]);

  // Group target by section
  const targetSections = useMemo(() => {
    const g: Record<string, TargetField[]> = {};
    for (const f of visibleTargetFields) {
      (g[f.section] ??= []).push(f);
    }
    return g;
  }, [visibleTargetFields]);

  if (!sourceNode || !targetNode) return null;

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ backgroundColor: "var(--bg-secondary)", borderLeft: "1px solid var(--border)" }}>
      {/* Header */}
      <div className="p-3 border-b shrink-0" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] font-bold" style={{ color: "var(--accent-green)" }}>
            {sourceNode.name} → {targetNode.name}
          </span>
          <div className="flex items-center gap-2">
            <button onClick={onDelete} className="text-[10px] cursor-pointer hover:opacity-80" style={{ color: "var(--accent-red)" }}>Delete</button>
            <button onClick={onClose} className="text-[10px] cursor-pointer hover:opacity-80" style={{ color: "var(--text-secondary)" }}>✕</button>
          </div>
        </div>
        {selectedSource && (
          <div className="px-2 py-1 rounded text-[10px] mt-1" style={{ backgroundColor: "color-mix(in srgb, var(--accent-blue) 15%, transparent)", color: "var(--accent-blue)" }}>
            Click a target field to map &quot;{selectedSource.name}&quot; →
          </div>
        )}
      </div>

      {/* Body */}
      <div ref={containerRef} className="flex-1 overflow-auto relative p-3" style={{ minHeight: 0 }}>
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
          {lineCoords.map((c) => {
            const dx = Math.abs(c.tx - c.sx) * 0.4;
            return <path key={c.key} d={`M ${c.sx} ${c.sy} C ${c.sx + dx} ${c.sy}, ${c.tx - dx} ${c.ty}, ${c.tx} ${c.ty}`} stroke="var(--accent-green)" strokeWidth={1.5} fill="none" opacity={0.6} />;
          })}
        </svg>

        <div className="flex gap-3" style={{ position: "relative", zIndex: 2 }}>
          {/* ── LEFT: Output ── */}
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase font-bold mb-1.5" style={{ color: "var(--accent-green)" }}>
              Output ({allSourceFields.length})
            </p>
            {Object.keys(sourceSections).length === 0 ? (
              <p className="text-[10px]" style={{ color: "var(--text-secondary)" }}>Run workflow first</p>
            ) : (
              <>
                {Object.entries(sourceSections).map(([section, fields]) => (
                  <div key={section} className="mb-2">
                    <p className="text-[9px] uppercase font-bold mb-0.5" style={{ color: "var(--text-secondary)", opacity: 0.6 }}>{section}</p>
                    <div className="flex flex-col gap-0.5">
                      {fields.map((f) => {
                        const isSelected = selectedSource?.path === f.path;
                        const isMapped = mappedSourcePaths.has(f.path);
                        const isExpandable = f.isArray || f.isObject;
                        const isCollapsed = collapsedSource.has(f.path);
                        const canMap = !f.isArray && !f.isObject;

                        return (
                          <div key={f.path}>
                            <div
                              ref={(el) => { sourceRefs.current[f.path] = el; }}
                              className={`flex items-center gap-1 px-2 py-1 rounded transition-all ${canMap || isExpandable ? "cursor-pointer hover:opacity-90" : ""}`}
                              style={{
                                marginLeft: f.depth * 10,
                                backgroundColor: isSelected ? "var(--accent-blue)" : isMapped ? "color-mix(in srgb, var(--accent-green) 15%, transparent)" : "color-mix(in srgb, var(--accent-green) 5%, transparent)",
                                color: isSelected ? "var(--bg-primary)" : isMapped ? "var(--accent-green)" : "var(--text-primary)",
                                border: isSelected ? "1px solid var(--accent-blue)" : "1px solid transparent",
                              }}
                              onClick={() => handleSourceClick(f)}
                            >
                              {isExpandable && (
                                <span className="text-[9px] shrink-0" style={{ color: "var(--accent-yellow)" }}>{isCollapsed ? "▶" : "▼"}</span>
                              )}
                              {f.isArrayItem && !isExpandable && (
                                <span className="text-[9px] shrink-0" style={{ color: "var(--text-secondary)", opacity: 0.5 }}>↳</span>
                              )}
                              <span className="text-[11px] truncate flex-1">{f.name}</span>
                              {f.preview && (
                                <span className="text-[9px] truncate max-w-[80px] shrink-0" style={{ color: isSelected ? "var(--bg-primary)" : "var(--text-secondary)", opacity: 0.5 }}>
                                  {f.preview.length > 20 ? f.preview.slice(0, 20) + "…" : f.preview}
                                </span>
                              )}
                              <span className="text-[9px] shrink-0" style={{ color: isSelected ? "var(--bg-primary)" : "var(--text-secondary)", opacity: 0.6 }}>
                                {f.isArray ? "[ ]" : f.isObject ? "{ }" : f.type}
                              </span>
                              {isMapped && !isSelected && (
                                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: "var(--accent-green)" }} />
                              )}
                            </div>
                            {/* Smart map button for objects/array items */}
                            {f.isObject && !isCollapsed && (
                              <button
                                className="text-[9px] cursor-pointer hover:opacity-80 ml-2 mt-0.5 mb-0.5 px-1.5 py-0.5 rounded"
                                style={{
                                  marginLeft: (f.depth + 1) * 10,
                                  backgroundColor: "color-mix(in srgb, var(--accent-purple) 12%, transparent)",
                                  color: "var(--accent-purple)",
                                  border: "1px solid color-mix(in srgb, var(--accent-purple) 25%, transparent)",
                                }}
                                onClick={(e) => { e.stopPropagation(); handleSmartMap(f); }}
                              >
                                Auto-map children →
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {hasMore && (
                  <button
                    onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                    className="w-full py-1.5 text-[10px] rounded cursor-pointer mt-1"
                    style={{ backgroundColor: "color-mix(in srgb, var(--accent-blue) 10%, transparent)", color: "var(--accent-blue)", border: "1px solid color-mix(in srgb, var(--accent-blue) 25%, transparent)" }}
                  >
                    Load more ({filteredSourceFields.length - visibleCount} remaining)
                  </button>
                )}
              </>
            )}
          </div>

          {/* Divider */}
          <div className="w-px shrink-0" style={{ backgroundColor: "var(--border)" }} />

          {/* ── RIGHT: Input (tree) ── */}
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase font-bold mb-1.5" style={{ color: "var(--accent-blue)" }}>Input</p>
            {visibleTargetFields.length === 0 ? (
              <p className="text-[10px]" style={{ color: "var(--text-secondary)" }}>No schema</p>
            ) : (
              Object.entries(targetSections).map(([section, fields]) => (
                <div key={section} className="mb-2">
                  <p className="text-[9px] uppercase font-bold mb-0.5" style={{ color: "var(--text-secondary)", opacity: 0.6 }}>{section}</p>
                  {fields.map((target) => {
                    const targetKey = `${target.location}::${target.field}`;
                    const link = links.find((l) => l.targetKey === targetKey);
                    const isMapped = !!link;
                    const isExpandable = target.isArray || target.isObject;
                    const isCollapsed = collapsedTarget.has(target.field);
                    const canMap = !target.isArray && !target.isObject;
                    const fieldName = target.field.split(".").pop() ?? target.field;

                    return (
                      <div key={targetKey} className="mb-0.5">
                        <div
                          ref={(el) => { targetRefs.current[targetKey] = el; }}
                          className={`flex items-center gap-1 px-2 py-1 rounded transition-all ${canMap || isExpandable ? "cursor-pointer hover:opacity-90" : ""}`}
                          style={{
                            marginLeft: target.depth * 10,
                            backgroundColor: isMapped
                              ? "color-mix(in srgb, var(--accent-green) 12%, transparent)"
                              : selectedSource && canMap
                              ? "color-mix(in srgb, var(--accent-blue) 8%, transparent)"
                              : "color-mix(in srgb, var(--accent-blue) 5%, transparent)",
                            border: selectedSource && canMap && !isMapped ? "1px dashed color-mix(in srgb, var(--accent-blue) 40%, transparent)" : "1px solid transparent",
                          }}
                          onClick={() => handleTargetClick(target)}
                        >
                          {isExpandable && (
                            <span className="text-[9px] shrink-0" style={{ color: "var(--accent-yellow)" }}>{isCollapsed ? "▶" : "▼"}</span>
                          )}
                          {target.depth > 0 && !isExpandable && (
                            <span className="text-[9px] shrink-0" style={{ color: "var(--text-secondary)", opacity: 0.5 }}>↳</span>
                          )}
                          <span className="text-[11px] truncate flex-1" style={{ color: isMapped ? "var(--accent-green)" : selectedSource && canMap ? "var(--accent-blue)" : "var(--text-primary)" }}>
                            {fieldName}
                            {target.arrayItemPrefix && <span className="text-[9px] ml-1" style={{ color: "var(--text-secondary)" }}>#{target.field.split(".").pop()}</span>}
                          </span>
                          <span className="text-[9px] shrink-0" style={{ color: "var(--text-secondary)", opacity: 0.6 }}>
                            {target.isArray ? "[ ]" : target.isObject ? "{ }" : target.schemaType}
                          </span>
                          {target.required && <span className="text-[9px] shrink-0" style={{ color: "var(--accent-red)" }}>*</span>}
                          {/* Add/remove array item buttons */}
                          {target.isArray && (
                            <span className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={(e) => { e.stopPropagation(); addArrayItem(target.field); }}
                                className="text-[10px] cursor-pointer hover:opacity-80 px-1 rounded"
                                style={{ color: "var(--accent-green)", backgroundColor: "color-mix(in srgb, var(--accent-green) 10%, transparent)" }}
                                title="Add item"
                              >+</button>
                              {(arrayItemCounts[target.field] ?? 1) > 1 && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); removeArrayItem(target.field); }}
                                  className="text-[10px] cursor-pointer hover:opacity-80 px-1 rounded"
                                  style={{ color: "var(--accent-red)", backgroundColor: "color-mix(in srgb, var(--accent-red) 10%, transparent)" }}
                                  title="Remove last item"
                                >−</button>
                              )}
                            </span>
                          )}
                          {isMapped && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleRemoveLink(targetKey); }}
                              className="text-[9px] shrink-0 cursor-pointer hover:opacity-80"
                              style={{ color: "var(--accent-red)" }}
                            >✕</button>
                          )}
                        </div>
                        {/* Mapped source indicator */}
                        {isMapped && (
                          <div className="px-2 mt-0.5" style={{ marginLeft: target.depth * 10 }}>
                            <span className="text-[9px]" style={{ color: "var(--accent-green)" }}>← {link.sourceName}</span>
                          </div>
                        )}
                        {/* In design mode, only mapping — no static value inputs */}
                        {!isMapped && canMap && !selectedSource && (
                          <div className="px-2 mt-0.5" style={{ marginLeft: target.depth * 10 }}>
                            <span className="text-[9px]" style={{ color: "var(--text-secondary)" }}>
                              select a source field to map
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between p-3 border-t shrink-0" style={{ borderColor: "var(--border)" }}>
        <span className="text-[10px]" style={{ color: "var(--text-secondary)" }}>{links.length} mapped</span>
        <button onClick={handleSave} className="px-4 py-1.5 text-[11px] rounded cursor-pointer font-bold" style={{ backgroundColor: "var(--accent-green)", color: "var(--bg-primary)" }}>
          Save
        </button>
      </div>
    </div>
  );
}
