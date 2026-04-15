"use client";

import { useState } from "react";
import type { StepResult } from "@/types";
import { JsonViewer } from "./json-viewer";

interface ResponseTabProps {
  result: StepResult;
  stepName: string;
}

export function ResponseTab({ result, stepName }: ResponseTabProps) {
  const [copied, setCopied] = useState(false);

  const statusColor =
    result.status >= 200 && result.status < 300
      ? "var(--accent-green)"
      : result.status >= 400
      ? "var(--accent-red)"
      : "var(--accent-yellow)";

  const handleCopy = () => {
    const text = typeof result.response === "string"
      ? result.response
      : JSON.stringify(result.response, null, 2);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span
          className="text-xs font-bold px-2 py-0.5 rounded-full"
          style={{
            color: statusColor,
            backgroundColor: `color-mix(in srgb, ${statusColor} 12%, transparent)`,
          }}
        >
          {result.status > 0 ? result.status : "ERR"} {result.statusText}
        </span>
        <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
          {result.duration}ms
        </span>
        {result.url && (
          <span className="text-[11px] truncate ml-auto" style={{ color: "var(--text-secondary)", maxWidth: 200 }}>
            {result.url}
          </span>
        )}
      </div>

      {result.error && (
        <div
          className="p-2 rounded text-[12px] space-y-1"
          style={{
            color: "var(--accent-red)",
            backgroundColor: "color-mix(in srgb, var(--accent-red) 10%, transparent)",
          }}
        >
          <div>{result.error}</div>
          {result.url && (
            <div className="text-[11px] break-all" style={{ color: "var(--text-secondary)" }}>
              URL: {result.url}
            </div>
          )}
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-1">
          <p className="text-[10px] font-bold" style={{ color: "var(--text-secondary)" }}>
            RESPONSE BODY
          </p>
          <button
            onClick={handleCopy}
            className="text-[10px] px-1.5 py-0.5 rounded cursor-pointer transition-colors duration-150"
            style={{
              color: copied ? "var(--accent-green)" : "var(--text-secondary)",
              backgroundColor: "var(--bg-tertiary)",
              border: "1px solid var(--border)",
            }}
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <div
          className="p-2 rounded text-[12px] overflow-auto max-h-64"
          style={{
            backgroundColor: "var(--bg-primary)",
            border: "1px solid var(--border)",
            fontFamily: "monospace",
          }}
        >
          <JsonViewer data={result.response} />
        </div>
      </div>

      <div>
        <p className="text-[10px] font-bold mb-1" style={{ color: "var(--text-secondary)" }}>
          RESPONSE HEADERS
        </p>
        <div
          className="p-2 rounded text-[11px] overflow-auto max-h-32"
          style={{
            backgroundColor: "var(--bg-primary)",
            border: "1px solid var(--border)",
            fontFamily: "monospace",
          }}
        >
          {Object.entries(result.headers).map(([key, value]) => (
            <div key={key}>
              <span style={{ color: "var(--accent-blue)" }}>{key}</span>
              <span style={{ color: "var(--text-secondary)" }}>: {value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
