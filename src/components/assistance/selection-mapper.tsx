"use client";

import { useState, useMemo, useCallback } from "react";
import type { SelectedValue } from "./data-selector";
import type { APIEndpoint, StepSelections } from "@/types";
import { flattenSchema, extractPathParams, suggestMappings, type FlatField } from "@/lib/schema-utils";

interface SelectionMapperProps {
  selections: SelectedValue[];
  nextStepName: string;
  nextEndpoint: APIEndpoint | undefined;
  nextStepUrl: string;
  onConfirm: (result: StepSelections) => void;
  onBack: () => void;
  onCancel: () => void;
}

interface TargetField {
  field: string;
  location: "header" | "query" | "body";
  label: string;
  section: string;
  schemaType: string;
  enum?: string[];
  minimum?: number;
  maximum?: number;
  required?: boolean;
}

export function SelectionMapper({
  selections,
  nextStepName,
  nextEndpoint,
  nextStepUrl,
  onConfirm,
  onBack,
  onCancel,
}: SelectionMapperProps) {
  // Target field values — keyed by "location::field"
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  // Which source is currently selected for click-to-map
  const [pendingValue, setPendingValue] = useState<SelectedValue | null>(null);
  // Track which fields have been mapped (source key for display)
  const [mappedSources, setMappedSources] = useState<Record<string, string>>({});
  // Track dismissed suggestions
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set());

  // Build target fields with schema metadata
  const targetFields = useMemo(() => {
    const fields: TargetField[] = [];

    const pathParams = extractPathParams(nextStepUrl);
    for (const param of pathParams) {
      fields.push({ field: param, location: "query", label: param, section: "Path Parameters", schemaType: "string" });
    }

    if (nextEndpoint) {
      for (const param of nextEndpoint.parameters) {
        if (param.in === "header") {
          fields.push({ field: param.name, location: "header", label: param.name, section: "Headers", schemaType: param.schema?.type ?? "string", enum: param.schema?.enum });
        }
        if (param.in === "query" && !pathParams.includes(param.name)) {
          fields.push({ field: param.name, location: "query", label: param.name, section: "Query Parameters", schemaType: param.schema?.type ?? "string", enum: param.schema?.enum });
        }
      }
      if (nextEndpoint.requestSchema) {
        const bodyFields = flattenSchema(nextEndpoint.requestSchema);
        for (const f of bodyFields) {
          fields.push({
            field: f.path,
            location: "body",
            label: f.path,
            section: "Body Fields",
            schemaType: f.type,
            enum: f.enum,
            minimum: f.minimum,
            maximum: f.maximum,
            required: f.required,
          });
        }
      }
    }

    if (!fields.some((t) => t.field === "Authorization" && t.location === "header")) {
      fields.push({ field: "Authorization", location: "header", label: "Authorization", section: "Headers", schemaType: "string" });
    }

    return fields;
  }, [nextEndpoint, nextStepUrl]);

  // Auto-suggest mappings
  const suggestions = useMemo(() => {
    return suggestMappings(
      selections,
      targetFields.map((t) => ({ field: t.field, location: t.location, type: t.schemaType }))
    );
  }, [selections, targetFields]);

  // Apply suggestions on first render
  const [suggestionsApplied, setSuggestionsApplied] = useState(false);
  if (!suggestionsApplied && suggestions.length > 0) {
    setSuggestionsApplied(true);
    const initialValues: Record<string, string> = {};
    const initialSources: Record<string, string> = {};
    for (const s of suggestions) {
      const key = `${s.targetLocation}::${s.targetField}`;
      initialValues[key] = String(s.sourceValue ?? "");
      initialSources[key] = s.sourceKey;
    }
    setFieldValues(initialValues);
    setMappedSources(initialSources);
  }

  const fieldKey = (location: string, field: string) => `${location}::${field}`;

  // Find context hints: show related numeric values from selections for a target field
  const getContextHints = useCallback((target: TargetField) => {
    if (target.schemaType !== "integer" && target.schemaType !== "number") return [];
    // Look for selections with names like min_*, max_*, *_min, *_max related to this field
    const hints: { label: string; value: unknown }[] = [];
    for (const s of selections) {
      const k = s.key.toLowerCase();
      if (k.includes("min") || k.includes("max") || k.includes("limit") || k.includes("balance") || k.includes("total") || k.includes("count")) {
        if (typeof s.value === "number") {
          hints.push({ label: s.key, value: s.value });
        }
      }
    }
    return hints;
  }, [selections]);

  const handleValueClick = (value: SelectedValue) => {
    setPendingValue(value);
  };

  const handleTargetClick = (target: TargetField) => {
    if (!pendingValue) return;
    const key = fieldKey(target.location, target.field);
    setFieldValues((prev) => ({ ...prev, [key]: String(pendingValue.value ?? "") }));
    setMappedSources((prev) => ({ ...prev, [key]: pendingValue.key }));
    setPendingValue(null);
  };

  const handleFieldChange = (target: TargetField, value: string) => {
    const key = fieldKey(target.location, target.field);
    setFieldValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleClearField = (target: TargetField) => {
    const key = fieldKey(target.location, target.field);
    setFieldValues((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setMappedSources((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleDismissSuggestion = (target: TargetField) => {
    const key = fieldKey(target.location, target.field);
    setDismissedSuggestions((prev) => new Set(prev).add(key));
    handleClearField(target);
  };

  const handleConfirm = () => {
    const result: StepSelections = { headers: {}, queryParams: {}, body: "" };
    const bodyObj: Record<string, unknown> = {};
    let hasBody = false;

    for (const [key, value] of Object.entries(fieldValues)) {
      if (!value && value !== "0") continue;
      const [location, ...fieldParts] = key.split("::");
      const field = fieldParts.join("::");
      if (location === "header") {
        result.headers[field] = value;
      } else if (location === "query") {
        result.queryParams[field] = value;
      } else if (location === "body") {
        // Try to parse numbers/booleans for body
        const target = targetFields.find((t) => t.field === field && t.location === "body");
        if (target?.schemaType === "integer") bodyObj[field] = parseInt(value, 10);
        else if (target?.schemaType === "number") bodyObj[field] = parseFloat(value);
        else if (target?.schemaType === "boolean") bodyObj[field] = value === "true";
        else bodyObj[field] = value;
        hasBody = true;
      }
    }

    if (hasBody) {
      result.body = JSON.stringify(bodyObj, null, 2);
    }

    onConfirm(result);
  };

  // Group targets by section
  const sections = useMemo(() => {
    const groups: Record<string, TargetField[]> = {};
    for (const f of targetFields) {
      if (!groups[f.section]) groups[f.section] = [];
      groups[f.section].push(f);
    }
    return groups;
  }, [targetFields]);

  const filledCount = Object.values(fieldValues).filter((v) => v !== "").length;

  return (
    <div className="flex flex-col h-full">
      <p className="text-[12px] mb-3" style={{ color: "var(--text-secondary)" }}>
        Map values to <strong style={{ color: "var(--accent-purple)" }}>{nextStepName}</strong>.
        {pendingValue
          ? <span style={{ color: "var(--accent-purple)" }}> Click a target field to map "{pendingValue.key}" →</span>
          : " Click a value on the left, then a target on the right — or type directly."
        }
      </p>

      {/* Auto-suggest banner */}
      {suggestions.length > 0 && !dismissedSuggestions.has("__all__") && (
        <div className="mb-3 px-3 py-2 rounded flex items-center justify-between" style={{ backgroundColor: "color-mix(in srgb, var(--accent-yellow) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--accent-yellow) 30%, transparent)" }}>
          <span className="text-[11px]" style={{ color: "var(--accent-yellow)" }}>
            {suggestions.length} auto-suggested mapping{suggestions.length > 1 ? "s" : ""} applied — review below
          </span>
        </div>
      )}

      <div className="flex flex-1 gap-3 min-h-0 mb-3">
        {/* Left: Selected Values */}
        <div className="w-[35%] shrink-0 overflow-auto rounded p-2" style={{ backgroundColor: "var(--bg-primary)", border: "1px solid var(--border)" }}>
          <p className="text-[10px] font-bold uppercase mb-2" style={{ color: "var(--text-secondary)" }}>
            Selected Values
          </p>
          {selections.map((s) => {
            const isActive = pendingValue?.path === s.path;
            const isMapped = Object.values(mappedSources).includes(s.key);
            return (
              <div
                key={s.path}
                className="flex items-center gap-1 px-2 py-1 rounded cursor-pointer text-[11px] mb-0.5"
                style={{
                  backgroundColor: isActive ? "color-mix(in srgb, var(--accent-purple) 20%, transparent)" : "transparent",
                  color: isMapped ? "var(--accent-green)" : "var(--text-primary)",
                }}
                onClick={() => handleValueClick(s)}
              >
                <span className="flex-1 truncate">
                  {s.key}
                  <span style={{ color: "var(--text-secondary)" }}>
                    {" = "}
                    {typeof s.value === "string" ? `"${String(s.value).slice(0, 20)}"` : String(s.value)}
                  </span>
                </span>
                {isMapped && <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: "var(--accent-green)" }} />}
              </div>
            );
          })}
        </div>

        {/* Right: Target Fields with editable inputs */}
        <div className="flex-1 overflow-auto rounded p-2" style={{ backgroundColor: "var(--bg-primary)", border: "1px solid var(--border)" }}>
          <p className="text-[10px] font-bold uppercase mb-2" style={{ color: "var(--text-secondary)" }}>
            Target Fields <span style={{ color: "var(--accent-green)" }}>(editable)</span>
          </p>
          {Object.entries(sections).map(([section, fields]) => (
            <div key={section} className="mb-3">
              <p className="text-[9px] uppercase mb-1 font-bold" style={{ color: section === "Path Parameters" ? "var(--accent-yellow)" : "var(--text-secondary)" }}>
                {section}
              </p>
              {fields.map((target) => {
                const key = fieldKey(target.location, target.field);
                const value = fieldValues[key] ?? "";
                const sourceKey = mappedSources[key];
                const suggestion = suggestions.find((s) => s.targetField === target.field && s.targetLocation === target.location);
                const isSuggested = suggestion && !dismissedSuggestions.has(key);
                const contextHints = getContextHints(target);

                return (
                  <div
                    key={key}
                    className="px-2 py-1.5 rounded mb-1"
                    style={{
                      backgroundColor: isSuggested
                        ? "color-mix(in srgb, var(--accent-green) 6%, transparent)"
                        : value
                        ? "color-mix(in srgb, var(--accent-blue) 6%, transparent)"
                        : pendingValue
                        ? "color-mix(in srgb, var(--accent-green) 4%, transparent)"
                        : "transparent",
                      border: `1px solid ${isSuggested ? "color-mix(in srgb, var(--accent-green) 25%, transparent)" : value ? "color-mix(in srgb, var(--accent-blue) 20%, transparent)" : pendingValue ? "color-mix(in srgb, var(--accent-green) 15%, transparent)" : "var(--border)"}`,
                      cursor: pendingValue ? "pointer" : "default",
                    }}
                    onClick={() => pendingValue && handleTargetClick(target)}
                  >
                    {/* Field label row */}
                    <div className="flex items-center gap-1 mb-1">
                      <span className="text-[11px]" style={{ color: value ? "var(--accent-green)" : "var(--text-primary)" }}>
                        {target.label}
                      </span>
                      <span className="text-[9px]" style={{ color: "var(--text-secondary)" }}>
                        {target.schemaType}
                        {target.required && <span style={{ color: "var(--accent-red)" }}> *</span>}
                      </span>
                      {isSuggested && (
                        <>
                          <span className="text-[9px] ml-auto" style={{ color: "var(--accent-green)" }}>
                            ← {sourceKey} (suggested)
                          </span>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDismissSuggestion(target); }}
                            className="text-[9px] cursor-pointer hover:opacity-80 ml-1"
                            style={{ color: "var(--text-secondary)" }}
                          >
                            ✕
                          </button>
                        </>
                      )}
                      {!isSuggested && sourceKey && (
                        <>
                          <span className="text-[9px] ml-auto" style={{ color: "var(--accent-green)" }}>← {sourceKey}</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleClearField(target); }}
                            className="text-[9px] cursor-pointer hover:opacity-80 ml-1"
                            style={{ color: "var(--accent-red)" }}
                          >
                            ✕
                          </button>
                        </>
                      )}
                    </div>

                    {/* Context hints */}
                    {contextHints.length > 0 && !value && (
                      <div className="text-[9px] mb-1" style={{ color: "var(--accent-purple)" }}>
                        context: {contextHints.map((h) => `${h.label}=${h.value}`).join(", ")}
                      </div>
                    )}

                    {/* Schema-driven input */}
                    <FieldInput
                      target={target}
                      value={value}
                      onChange={(v) => handleFieldChange(target, v)}
                    />
                  </div>
                );
              })}
            </div>
          ))}
          {targetFields.length === 0 && (
            <p className="text-[10px]" style={{ color: "var(--text-secondary)" }}>No target fields detected.</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 justify-between">
        <span className="text-[10px]" style={{ color: "var(--text-secondary)" }}>
          {filledCount} of {targetFields.length} fields filled
        </span>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-[11px] rounded cursor-pointer"
            style={{ color: "var(--text-secondary)", border: "1px solid var(--border)" }}
          >
            Cancel
          </button>
          <button
            onClick={onBack}
            className="px-3 py-1.5 text-[11px] rounded cursor-pointer"
            style={{ color: "var(--text-primary)", border: "1px solid var(--border)", backgroundColor: "var(--bg-tertiary)" }}
          >
            ← Back
          </button>
          <button
            onClick={handleConfirm}
            disabled={filledCount === 0}
            className="px-3 py-1.5 text-[11px] rounded cursor-pointer font-bold"
            style={{
              backgroundColor: filledCount > 0 ? "var(--accent-blue)" : "var(--bg-tertiary)",
              color: filledCount > 0 ? "var(--bg-primary)" : "var(--text-secondary)",
            }}
          >
            Continue Execution →
          </button>
        </div>
      </div>
    </div>
  );
}

/** Renders the appropriate input control based on target schema type. */
function FieldInput({
  target,
  value,
  onChange,
}: {
  target: TargetField;
  value: string;
  onChange: (value: string) => void;
}) {
  // Enum → dropdown
  if (target.enum && target.enum.length > 0) {
    return (
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onClick={(e) => e.stopPropagation()}
        className="w-full text-[11px] rounded px-2 py-1"
        style={{
          backgroundColor: "rgba(0,0,0,0.3)",
          border: "1px solid color-mix(in srgb, var(--accent-blue) 40%, var(--border))",
          color: value ? "var(--text-primary)" : "var(--text-secondary)",
        }}
      >
        <option value="">-- select --</option>
        {target.enum.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    );
  }

  // Boolean → toggle buttons
  if (target.schemaType === "boolean") {
    return (
      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
        {["true", "false"].map((v) => (
          <button
            key={v}
            onClick={() => onChange(v)}
            className="px-3 py-0.5 text-[10px] rounded cursor-pointer"
            style={{
              backgroundColor: value === v ? "var(--accent-blue)" : "rgba(0,0,0,0.2)",
              color: value === v ? "var(--bg-primary)" : "var(--text-secondary)",
              border: `1px solid ${value === v ? "var(--accent-blue)" : "var(--border)"}`,
            }}
          >
            {v}
          </button>
        ))}
      </div>
    );
  }

  // Integer / Number → number input with optional min/max
  if (target.schemaType === "integer" || target.schemaType === "number") {
    return (
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onClick={(e) => e.stopPropagation()}
        min={target.minimum}
        max={target.maximum}
        step={target.schemaType === "integer" ? 1 : "any"}
        placeholder={
          target.minimum != null && target.maximum != null
            ? `${target.minimum} - ${target.maximum}`
            : "enter value..."
        }
        className="w-full text-[11px] rounded px-2 py-1"
        style={{
          backgroundColor: "rgba(0,0,0,0.3)",
          border: `1px solid ${value ? "color-mix(in srgb, var(--accent-green) 40%, var(--border))" : "var(--border)"}`,
          color: value ? "var(--text-primary)" : "var(--text-secondary)",
        }}
      />
    );
  }

  // Default → text input
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      placeholder="click a value or type..."
      className="w-full text-[11px] rounded px-2 py-1"
      style={{
        backgroundColor: "rgba(0,0,0,0.3)",
        border: `1px solid ${value ? "color-mix(in srgb, var(--accent-green) 40%, var(--border))" : "var(--border)"}`,
        color: value ? "var(--text-primary)" : "var(--text-secondary)",
      }}
    />
  );
}
