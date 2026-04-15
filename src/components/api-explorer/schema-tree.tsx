"use client";

import { useState } from "react";

interface SchemaTreeProps {
  schema: Record<string, any>;
  depth?: number;
}

export function SchemaTree({ schema, depth = 0 }: SchemaTreeProps) {
  const [expanded, setExpanded] = useState(depth < 2);

  if (!schema || typeof schema !== "object" || Object.keys(schema).length === 0) {
    return (
      <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
        (empty)
      </span>
    );
  }

  if (schema.type === "object" && schema.properties) {
    return (
      <div style={{ paddingLeft: depth > 0 ? 12 : 0 }}>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-[11px] cursor-pointer hover:opacity-80"
          style={{ color: "var(--accent-purple)" }}
        >
          {expanded ? "▾" : "▸"} object
        </button>
        {expanded &&
          Object.entries(schema.properties).map(([key, value]) => (
            <div key={key} className="flex items-start gap-1 ml-3 mt-0.5">
              <span className="text-[11px]" style={{ color: "var(--accent-blue)" }}>
                {key}
              </span>
              <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
                :
              </span>
              {typeof value === "object" &&
              value !== null &&
              ((value as any).type === "object" || (value as any).type === "array") ? (
                <SchemaTree schema={value as Record<string, any>} depth={depth + 1} />
              ) : (
                <span className="text-[11px]" style={{ color: "var(--accent-yellow)" }}>
                  {(value as any)?.type ?? "any"}
                </span>
              )}
            </div>
          ))}
      </div>
    );
  }

  if (schema.type === "array" && schema.items) {
    return (
      <div style={{ paddingLeft: depth > 0 ? 12 : 0 }}>
        <span className="text-[11px]" style={{ color: "var(--accent-purple)" }}>
          array[
        </span>
        <SchemaTree schema={schema.items} depth={depth + 1} />
        <span className="text-[11px]" style={{ color: "var(--accent-purple)" }}>
          ]
        </span>
      </div>
    );
  }

  return (
    <span className="text-[11px]" style={{ color: "var(--accent-yellow)" }}>
      {schema.type ?? "any"}
    </span>
  );
}
