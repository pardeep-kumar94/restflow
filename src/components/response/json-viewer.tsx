"use client";

import { useState } from "react";

interface JsonViewerProps {
  data: any;
  depth?: number;
}

export function JsonViewer({ data, depth = 0 }: JsonViewerProps) {
  const [collapsed, setCollapsed] = useState(depth > 3);

  if (data === null) return <span style={{ color: "var(--accent-red)" }}>null</span>;
  if (data === undefined) return <span style={{ color: "var(--text-secondary)" }}>undefined</span>;
  if (typeof data === "boolean")
    return <span style={{ color: "var(--accent-yellow)" }}>{String(data)}</span>;
  if (typeof data === "number")
    return <span style={{ color: "var(--accent-green)" }}>{data}</span>;
  if (typeof data === "string")
    return <span style={{ color: "var(--accent-yellow)" }}>&quot;{data}&quot;</span>;

  if (Array.isArray(data)) {
    if (data.length === 0) return <span style={{ color: "var(--text-secondary)" }}>[]</span>;
    return (
      <span>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="cursor-pointer hover:opacity-80"
          style={{ color: "var(--accent-purple)" }}
        >
          {collapsed ? "▸" : "▾"}
        </button>
        <span style={{ color: "var(--text-secondary)" }}> [{data.length}]</span>
        {!collapsed && (
          <div style={{ paddingLeft: 16 }}>
            {data.map((item, i) => (
              <div key={i}>
                <span style={{ color: "var(--text-secondary)" }}>{i}: </span>
                <JsonViewer data={item} depth={depth + 1} />
              </div>
            ))}
          </div>
        )}
      </span>
    );
  }

  if (typeof data === "object") {
    const entries = Object.entries(data);
    if (entries.length === 0)
      return <span style={{ color: "var(--text-secondary)" }}>{"{}"}</span>;
    return (
      <span>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="cursor-pointer hover:opacity-80"
          style={{ color: "var(--accent-purple)" }}
        >
          {collapsed ? "▸" : "▾"}
        </button>
        <span style={{ color: "var(--text-secondary)" }}>
          {" "}
          {collapsed ? `{${entries.length} keys}` : "{"}
        </span>
        {!collapsed && (
          <div style={{ paddingLeft: 16 }}>
            {entries.map(([key, value]) => (
              <div key={key}>
                <span style={{ color: "var(--accent-blue)" }}>{key}</span>
                <span style={{ color: "var(--text-secondary)" }}>: </span>
                <JsonViewer data={value} depth={depth + 1} />
              </div>
            ))}
          </div>
        )}
        {!collapsed && <span style={{ color: "var(--text-secondary)" }}>{"}"}</span>}
      </span>
    );
  }

  return <span>{String(data)}</span>;
}
