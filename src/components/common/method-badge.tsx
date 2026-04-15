"use client";

const METHOD_COLORS: Record<string, string> = {
  GET: "var(--accent-green)",
  POST: "var(--accent-blue)",
  PUT: "var(--accent-yellow)",
  PATCH: "var(--accent-purple)",
  DELETE: "var(--accent-red)",
};

interface MethodBadgeProps {
  method: string;
}

export function MethodBadge({ method }: MethodBadgeProps) {
  const color = METHOD_COLORS[method.toUpperCase()] ?? "var(--text-secondary)";
  return (
    <span
      className="text-[11px] font-mono font-bold px-2 py-0.5 rounded"
      style={{
        color,
        backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`,
        borderLeft: `2px solid ${color}`,
      }}
    >
      {method.toUpperCase()}
    </span>
  );
}
