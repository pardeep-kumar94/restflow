"use client";

import { useState } from "react";
import { useWorkflowStore } from "@/stores/workflow-store";
import { extractPathParams } from "@/lib/schema-utils";
import type { WorkflowNode, APIEndpoint, NodeConnection, ExecutionContext } from "@/types";

interface InputFieldsProps {
  node: WorkflowNode;
  endpoint: APIEndpoint | undefined;
  connections: NodeConnection[];
  executionContext: ExecutionContext | null;
}

interface FieldDef {
  name: string;
  location: "path" | "query" | "header" | "body";
  schemaType: string;   // "string" | "integer" | "array" | "object" etc.
  itemType?: string;     // for arrays: type of items
  required?: boolean;
}

/** Collect all available values from upstream responses */
function collectUpstreamValues(
  nodeId: string,
  connections: NodeConnection[],
  context: ExecutionContext | null,
  allNodes: WorkflowNode[],
): { key: string; path: string; value: unknown; sourceStep: string }[] {
  if (!context) return [];
  const values: { key: string; path: string; value: unknown; sourceStep: string }[] = [];
  const upstreamIds = connections.filter((c) => c.targetNodeId === nodeId).map((c) => c.sourceNodeId);

  for (const upId of upstreamIds) {
    const upNode = allNodes.find((n) => n.id === upId);
    const stepName = upNode?.name ?? upId.slice(0, 8);
    const response = context.variables[upId];
    if (response == null) continue;
    flattenForSuggestions(response, "", stepName, upId, values);
  }
  return values;
}

function flattenForSuggestions(
  obj: unknown,
  prefix: string,
  stepName: string,
  sourceId: string,
  out: { key: string; path: string; value: unknown; sourceStep: string }[],
  depth = 0,
) {
  if (depth > 5 || obj == null) return;
  if (Array.isArray(obj)) {
    // Add the whole array as a suggestion
    out.push({ key: prefix || "response", path: `${sourceId}.${prefix || "response"}`, value: obj, sourceStep: stepName });
    // Also add first item's fields
    if (obj.length > 0 && obj[0] && typeof obj[0] === "object" && !Array.isArray(obj[0])) {
      for (const [k, v] of Object.entries(obj[0] as Record<string, unknown>)) {
        const childPath = prefix ? `${prefix}.0.${k}` : `0.${k}`;
        if (v == null || typeof v !== "object") {
          out.push({ key: k, path: `${sourceId}.${childPath}`, value: v, sourceStep: stepName });
        }
      }
    }
    return;
  }
  if (typeof obj === "object") {
    for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
      const fullPath = prefix ? `${prefix}.${key}` : key;
      if (val == null || typeof val !== "object") {
        out.push({ key, path: `${sourceId}.${fullPath}`, value: val, sourceStep: stepName });
      } else {
        flattenForSuggestions(val, fullPath, stepName, sourceId, out, depth + 1);
      }
    }
  }
}

function buildFieldDefs(endpoint: APIEndpoint | undefined, nodeUrl: string): FieldDef[] {
  const fields: FieldDef[] = [];
  const pathParams = extractPathParams(nodeUrl || (endpoint?.path ?? ""));

  for (const param of pathParams) {
    fields.push({ name: param, location: "path", schemaType: "string", required: true });
  }

  if (endpoint?.parameters) {
    for (const param of endpoint.parameters) {
      if (param.in === "query" && !pathParams.includes(param.name)) {
        fields.push({ name: param.name, location: "query", schemaType: param.schema?.type ?? "string", required: param.required });
      }
      if (param.in === "header") {
        fields.push({ name: param.name, location: "header", schemaType: "string" });
      }
    }
  }

  if (endpoint?.requestSchema?.properties) {
    for (const [key, val] of Object.entries(endpoint.requestSchema.properties)) {
      const v = val as Record<string, any>;
      const isArray = v?.type === "array";
      fields.push({
        name: key,
        location: "body",
        schemaType: v?.type ?? "any",
        itemType: isArray ? (v?.items?.type ?? "object") : undefined,
        required: endpoint.requestSchema.required?.includes(key),
      });
    }
  }

  return fields;
}

export function InputFields({ node, endpoint, connections, executionContext }: InputFieldsProps) {
  const { setUserOverride, workflow } = useWorkflowStore();
  const url = node.urlOverride || (endpoint?.path ?? "");
  const fields = buildFieldDefs(endpoint, url);
  const overrides = executionContext?.userOverrides[node.id] ?? {};

  // Upstream values for suggestions
  const upstreamValues = collectUpstreamValues(node.id, connections, executionContext, workflow.nodes);

  // Track which field's suggestion dropdown is open
  const [openSuggestion, setOpenSuggestion] = useState<string | null>(null);

  if (fields.length === 0) {
    return (
      <p className="text-[11px] py-2" style={{ color: "var(--text-secondary)" }}>
        No input fields detected for this step.
      </p>
    );
  }

  const locationLabel: Record<string, string> = {
    path: "Path",
    query: "Query",
    header: "Header",
    body: "Body",
  };

  const locationColors: Record<string, string> = {
    path: "var(--accent-yellow)",
    query: "var(--accent-blue)",
    header: "var(--accent-purple)",
    body: "var(--accent-green)",
  };

  const hasUpstream = upstreamValues.length > 0;

  return (
    <div className="space-y-1">
      {hasUpstream && (
        <p className="text-[9px] mb-1" style={{ color: "var(--accent-blue)" }}>
          Tap a field name to pick from upstream response
        </p>
      )}
      {fields.map((field) => {
        const fieldKey = `${field.location}.${field.name}`;
        const overrideValue = overrides[fieldKey];
        const isArray = field.schemaType === "array";
        const isSuggestionOpen = openSuggestion === fieldKey;

        return (
          <div key={fieldKey}>
            {isArray ? (
              <ArrayField
                field={field}
                fieldKey={fieldKey}
                nodeId={node.id}
                overrideValue={overrideValue}
                upstreamValues={upstreamValues}
                setUserOverride={setUserOverride}
                locationLabel={locationLabel[field.location]}
                locationColor={locationColors[field.location]}
                hasUpstream={hasUpstream}
              />
            ) : (
              <div className="flex items-center gap-2">
                <span
                  className="text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0 w-12 text-center"
                  style={{ backgroundColor: "var(--bg-tertiary)", color: locationColors[field.location] }}
                >
                  {locationLabel[field.location]}
                </span>
                <span
                  className={`text-[11px] shrink-0 w-28 truncate ${hasUpstream ? "cursor-pointer hover:underline" : ""}`}
                  style={{ color: "var(--text-primary)" }}
                  onClick={hasUpstream ? () => setOpenSuggestion(isSuggestionOpen ? null : fieldKey) : undefined}
                >
                  {field.name}
                  {field.required && <span style={{ color: "var(--accent-red)" }}> *</span>}
                </span>
                <div className="flex-1 flex items-center gap-1">
                  <input
                    value={overrideValue != null ? String(overrideValue) : ""}
                    onChange={(e) => setUserOverride(node.id, fieldKey, e.target.value)}
                    placeholder={hasUpstream ? "type or pick from response..." : "enter value..."}
                    className="flex-1 text-[11px] px-2 py-1 rounded outline-none border"
                    style={{
                      backgroundColor: overrideValue != null ? "color-mix(in srgb, var(--accent-green) 8%, var(--bg-tertiary))" : "var(--bg-tertiary)",
                      color: "var(--text-primary)",
                      borderColor: overrideValue != null ? "var(--accent-green)" : "var(--border)",
                    }}
                  />
                  {overrideValue != null && (
                    <span className="text-[9px] shrink-0" style={{ color: "var(--accent-green)" }}>✓</span>
                  )}
                </div>
              </div>
            )}

            {/* Suggestion dropdown for scalar fields */}
            {isSuggestionOpen && !isArray && (
              <SuggestionDropdown
                values={upstreamValues}
                fieldName={field.name}
                onPick={(value) => {
                  setUserOverride(node.id, fieldKey, value);
                  setOpenSuggestion(null);
                }}
                onClose={() => setOpenSuggestion(null)}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Suggestion Dropdown ─── */

function SuggestionDropdown({
  values,
  fieldName,
  onPick,
  onClose,
}: {
  values: { key: string; path: string; value: unknown; sourceStep: string }[];
  fieldName: string;
  onPick: (value: unknown) => void;
  onClose: () => void;
}) {
  // Sort: exact name matches first, then partial matches, then rest
  const sorted = [...values].filter((v) => typeof v.value !== "object" || Array.isArray(v.value)).sort((a, b) => {
    const aExact = a.key.toLowerCase() === fieldName.toLowerCase() ? 0 : 1;
    const bExact = b.key.toLowerCase() === fieldName.toLowerCase() ? 0 : 1;
    if (aExact !== bExact) return aExact - bExact;
    const aPartial = a.key.toLowerCase().includes(fieldName.toLowerCase()) || fieldName.toLowerCase().includes(a.key.toLowerCase()) ? 0 : 1;
    const bPartial = b.key.toLowerCase().includes(fieldName.toLowerCase()) || fieldName.toLowerCase().includes(b.key.toLowerCase()) ? 0 : 1;
    return aPartial - bPartial;
  });

  return (
    <div
      className="ml-14 mt-0.5 mb-1 rounded border overflow-auto"
      style={{
        backgroundColor: "var(--bg-secondary)",
        borderColor: "var(--accent-blue)",
        maxHeight: 180,
      }}
    >
      <div className="flex items-center justify-between px-2 py-1 border-b" style={{ borderColor: "var(--border)" }}>
        <span className="text-[9px] font-bold" style={{ color: "var(--accent-blue)" }}>
          Pick value for "{fieldName}"
        </span>
        <button onClick={onClose} className="text-[10px] cursor-pointer" style={{ color: "var(--text-secondary)" }}>✕</button>
      </div>
      {sorted.length === 0 ? (
        <p className="text-[10px] px-2 py-2" style={{ color: "var(--text-secondary)" }}>No upstream values available</p>
      ) : (
        sorted.map((v, i) => {
          const isMatch = v.key.toLowerCase() === fieldName.toLowerCase();
          const displayVal = Array.isArray(v.value)
            ? `[${v.value.length} items]`
            : String(v.value ?? "null");
          return (
            <div
              key={`${v.path}-${i}`}
              className="flex items-center gap-2 px-2 py-1 cursor-pointer hover:opacity-80"
              style={{
                backgroundColor: isMatch ? "color-mix(in srgb, var(--accent-green) 8%, transparent)" : "transparent",
              }}
              onClick={() => onPick(v.value)}
            >
              <span className="text-[9px] shrink-0 px-1 rounded" style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--accent-purple)" }}>
                {v.sourceStep}
              </span>
              <span className="text-[10px] shrink-0" style={{ color: isMatch ? "var(--accent-green)" : "var(--text-secondary)" }}>
                {v.key}
              </span>
              <span className="text-[10px] font-mono truncate flex-1" style={{ color: "var(--text-primary)" }}>
                {displayVal.length > 50 ? displayVal.slice(0, 50) + "..." : displayVal}
              </span>
              {isMatch && (
                <span className="text-[9px] shrink-0" style={{ color: "var(--accent-green)" }}>match</span>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

/* ─── Array Field (supports add more) ─── */

function ArrayField({
  field,
  fieldKey,
  nodeId,
  overrideValue,
  upstreamValues,
  setUserOverride,
  locationLabel,
  locationColor,
  hasUpstream,
}: {
  field: FieldDef;
  fieldKey: string;
  nodeId: string;
  overrideValue: unknown;
  upstreamValues: { key: string; path: string; value: unknown; sourceStep: string }[];
  setUserOverride: (nodeId: string, field: string, value: unknown) => void;
  locationLabel: string;
  locationColor: string;
  hasUpstream: boolean;
}) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [manualInput, setManualInput] = useState("");

  // Current array value
  const currentArray: unknown[] = Array.isArray(overrideValue) ? overrideValue : (overrideValue != null ? [overrideValue] : []);

  const addItem = (item: unknown) => {
    const newArr = [...currentArray, item];
    setUserOverride(nodeId, fieldKey, newArr);
  };

  const removeItem = (index: number) => {
    const newArr = currentArray.filter((_, i) => i !== index);
    setUserOverride(nodeId, fieldKey, newArr.length > 0 ? newArr : undefined as any);
  };

  const replaceWithArray = (arr: unknown[]) => {
    setUserOverride(nodeId, fieldKey, arr);
    setShowSuggestions(false);
  };

  // Find upstream arrays that could be passed as-is
  const upstreamArrays = upstreamValues.filter((v) => Array.isArray(v.value));
  // Find upstream scalar values for adding individual items
  const upstreamScalars = upstreamValues.filter((v) => !Array.isArray(v.value) && typeof v.value !== "object");

  return (
    <div className="rounded border p-2 mb-1" style={{ borderColor: "color-mix(in srgb, var(--accent-green) 30%, var(--border))", backgroundColor: "color-mix(in srgb, var(--accent-green) 3%, transparent)" }}>
      <div className="flex items-center gap-2 mb-1">
        <span
          className="text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0 w-12 text-center"
          style={{ backgroundColor: "var(--bg-tertiary)", color: locationColor }}
        >
          {locationLabel}
        </span>
        <span className="text-[11px] font-medium flex-1" style={{ color: "var(--text-primary)" }}>
          {field.name}
          {field.required && <span style={{ color: "var(--accent-red)" }}> *</span>}
          <span className="text-[9px] ml-1" style={{ color: "var(--text-secondary)" }}>
            array{field.itemType ? `<${field.itemType}>` : ""}
          </span>
        </span>
        <span className="text-[10px]" style={{ color: "var(--accent-green)" }}>
          {currentArray.length} item{currentArray.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Current items */}
      {currentArray.length > 0 && (
        <div className="space-y-0.5 mb-1.5">
          {currentArray.map((item, i) => (
            <div key={i} className="flex items-center gap-1 px-2 py-0.5 rounded" style={{ backgroundColor: "var(--bg-tertiary)" }}>
              <span className="text-[9px] shrink-0" style={{ color: "var(--text-secondary)" }}>#{i}</span>
              <span className="text-[10px] font-mono truncate flex-1" style={{ color: "var(--text-primary)" }}>
                {typeof item === "object" && item ? JSON.stringify(item).slice(0, 60) + (JSON.stringify(item).length > 60 ? "..." : "") : String(item)}
              </span>
              <button
                onClick={() => removeItem(i)}
                className="text-[9px] shrink-0 cursor-pointer hover:opacity-80 px-1"
                style={{ color: "var(--accent-red)" }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {hasUpstream && (
          <button
            onClick={() => { setShowSuggestions(!showSuggestions); setShowManualAdd(false); }}
            className="text-[10px] px-2 py-0.5 rounded cursor-pointer"
            style={{
              backgroundColor: showSuggestions ? "var(--accent-blue)" : "color-mix(in srgb, var(--accent-blue) 12%, transparent)",
              color: showSuggestions ? "var(--bg-primary)" : "var(--accent-blue)",
              border: "1px solid color-mix(in srgb, var(--accent-blue) 30%, transparent)",
            }}
          >
            Pick from response
          </button>
        )}
        <button
          onClick={() => { setShowManualAdd(!showManualAdd); setShowSuggestions(false); }}
          className="text-[10px] px-2 py-0.5 rounded cursor-pointer"
          style={{
            backgroundColor: showManualAdd ? "var(--accent-purple)" : "color-mix(in srgb, var(--accent-purple) 12%, transparent)",
            color: showManualAdd ? "var(--bg-primary)" : "var(--accent-purple)",
            border: "1px solid color-mix(in srgb, var(--accent-purple) 30%, transparent)",
          }}
        >
          + Add manually
        </button>
        {currentArray.length > 0 && (
          <button
            onClick={() => setUserOverride(nodeId, fieldKey, undefined as any)}
            className="text-[10px] px-2 py-0.5 rounded cursor-pointer"
            style={{ color: "var(--accent-red)", border: "1px solid color-mix(in srgb, var(--accent-red) 30%, transparent)" }}
          >
            Clear all
          </button>
        )}
      </div>

      {/* Suggestions from upstream */}
      {showSuggestions && (
        <div className="mt-1.5 rounded border overflow-auto" style={{ backgroundColor: "var(--bg-secondary)", borderColor: "var(--accent-blue)", maxHeight: 200 }}>
          {/* Whole arrays — pass as-is */}
          {upstreamArrays.length > 0 && (
            <div className="border-b" style={{ borderColor: "var(--border)" }}>
              <p className="text-[9px] font-bold px-2 py-1" style={{ color: "var(--accent-yellow)" }}>Pass entire array</p>
              {upstreamArrays.map((v, i) => (
                <div
                  key={`arr-${i}`}
                  className="flex items-center gap-2 px-2 py-1 cursor-pointer hover:opacity-80"
                  onClick={() => replaceWithArray(v.value as unknown[])}
                >
                  <span className="text-[9px] shrink-0 px-1 rounded" style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--accent-purple)" }}>
                    {v.sourceStep}
                  </span>
                  <span className="text-[10px]" style={{ color: "var(--text-secondary)" }}>{v.key}</span>
                  <span className="text-[10px] font-mono" style={{ color: "var(--accent-yellow)" }}>[{(v.value as unknown[]).length} items]</span>
                </div>
              ))}
            </div>
          )}

          {/* Individual values — add one at a time */}
          {upstreamScalars.length > 0 && (
            <div>
              <p className="text-[9px] font-bold px-2 py-1" style={{ color: "var(--accent-blue)" }}>Add individual value</p>
              {upstreamScalars.map((v, i) => (
                <div
                  key={`scalar-${i}`}
                  className="flex items-center gap-2 px-2 py-1 cursor-pointer hover:opacity-80"
                  onClick={() => addItem(v.value)}
                >
                  <span className="text-[9px] shrink-0 px-1 rounded" style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--accent-purple)" }}>
                    {v.sourceStep}
                  </span>
                  <span className="text-[10px]" style={{ color: "var(--text-secondary)" }}>{v.key}</span>
                  <span className="text-[10px] font-mono truncate" style={{ color: "var(--text-primary)" }}>{String(v.value)}</span>
                </div>
              ))}
            </div>
          )}

          {upstreamArrays.length === 0 && upstreamScalars.length === 0 && (
            <p className="text-[10px] px-2 py-2" style={{ color: "var(--text-secondary)" }}>No upstream values available</p>
          )}
        </div>
      )}

      {/* Manual add input */}
      {showManualAdd && (
        <div className="flex items-center gap-1 mt-1.5">
          <input
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            placeholder={`Enter ${field.itemType ?? "value"}...`}
            className="flex-1 text-[11px] px-2 py-1 rounded outline-none border"
            style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-primary)", borderColor: "var(--border)" }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && manualInput.trim()) {
                // Try to parse as JSON for objects, otherwise use as string
                let val: unknown = manualInput.trim();
                try { val = JSON.parse(manualInput.trim()); } catch { /* keep as string */ }
                addItem(val);
                setManualInput("");
              }
            }}
          />
          <button
            onClick={() => {
              if (manualInput.trim()) {
                let val: unknown = manualInput.trim();
                try { val = JSON.parse(manualInput.trim()); } catch { /* keep as string */ }
                addItem(val);
                setManualInput("");
              }
            }}
            className="text-[10px] px-2 py-1 rounded cursor-pointer font-bold"
            style={{ backgroundColor: "var(--accent-green)", color: "var(--bg-primary)" }}
          >
            Add
          </button>
        </div>
      )}
    </div>
  );
}
