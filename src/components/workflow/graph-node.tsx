"use client";

import { useState, useRef, useCallback } from "react";
import { MethodBadge } from "@/components/common/method-badge";
import type { WorkflowNode, APIEndpoint, StepResult, Section } from "@/types";

interface GraphNodeProps {
  node: WorkflowNode;
  endpoint: APIEndpoint | undefined;
  isSelected: boolean;
  result?: StepResult;
  sections: Section[];
  onSelect: () => void;
  onDelete: () => void;
  onToggleAssistance: () => void;
  onPositionChange: (position: { x: number; y: number }) => void;
  onPortDragStart: (nodeId: string, portType: "output") => void;
  onPortDragEnd: (nodeId: string, portType: "input") => void;
  onStageChange: (stage: number) => void;
  onSectionChange: (sectionId: string) => void;
}

export function GraphNode({
  node,
  endpoint,
  isSelected,
  result,
  onSelect,
  onDelete,
  onToggleAssistance,
  onPositionChange,
  onPortDragStart,
  onPortDragEnd,
  onStageChange,
  onSectionChange,
  sections,
}: GraphNodeProps) {
  const currentSection = sections.find((s) => s.id === node.sectionId);
  const dragStartRef = useRef<{ x: number; y: number; nodeX: number; nodeY: number } | null>(null);

  const borderColor = isSelected
    ? "var(--accent-blue)"
    : result?.error
    ? "var(--accent-red)"
    : result
    ? "var(--accent-green)"
    : "var(--border)";

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Ignore if clicking on a port or button
    if ((e.target as HTMLElement).dataset.port || (e.target as HTMLElement).closest("button")) return;
    e.stopPropagation();
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      nodeX: node.position.x,
      nodeY: node.position.y,
    };

    const handleMouseMove = (ev: MouseEvent) => {
      if (!dragStartRef.current) return;
      const dx = ev.clientX - dragStartRef.current.x;
      const dy = ev.clientY - dragStartRef.current.y;
      onPositionChange({
        x: dragStartRef.current.nodeX + dx,
        y: dragStartRef.current.nodeY + dy,
      });
    };

    const handleMouseUp = () => {
      dragStartRef.current = null;
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  }, [node.position.x, node.position.y, onPositionChange]);

  return (
    <div
      className={`absolute rounded-lg p-3 cursor-grab min-w-[160px] group select-none ${
        !result && isSelected ? "executing-step" : ""
      }`}
      style={{
        left: node.position.x,
        top: node.position.y,
        backgroundImage: "linear-gradient(to bottom, color-mix(in srgb, var(--text-primary) 4%, var(--bg-tertiary)) 0%, var(--bg-tertiary) 40%)",
        border: `1px solid ${borderColor}`,
        boxShadow: "inset 0 1px 3px rgba(0,0,0,0.12)",
        zIndex: isSelected ? 10 : 1,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Section indicator */}
      {currentSection && (
        <div
          className="absolute -top-3 left-0 right-0 flex justify-center"
          style={{ pointerEvents: "none" }}
        >
          <span
            className="px-2 py-0.5 rounded-full text-[9px] font-bold truncate max-w-[120px]"
            style={{
              backgroundColor: currentSection ? "var(--accent-purple)" : "var(--bg-tertiary)",
              color: "var(--bg-primary)",
              border: "2px solid var(--bg-primary)",
            }}
          >
            {currentSection.name}
          </span>
        </div>
      )}

      {/* Input port (blue, left) */}
      <div
        data-port="input"
        className="absolute w-3 h-3 rounded-full cursor-crosshair transition-shadow duration-200 hover:shadow-[0_0_0_4px_rgba(59,130,246,0.25)]"
        style={{
          left: -6,
          top: "50%",
          transform: "translateY(-50%)",
          backgroundColor: "var(--accent-blue)",
          border: "2px solid var(--bg-primary)",
        }}
        onMouseUp={(e) => {
          e.stopPropagation();
          onPortDragEnd(node.id, "input");
        }}
        title="Input port"
      />

      {/* Output port (green, right) */}
      <div
        data-port="output"
        className="absolute w-3 h-3 rounded-full cursor-crosshair transition-shadow duration-200 hover:shadow-[0_0_0_4px_rgba(34,197,94,0.25)]"
        style={{
          right: -6,
          top: "50%",
          transform: "translateY(-50%)",
          backgroundColor: "var(--accent-green)",
          border: "2px solid var(--bg-primary)",
        }}
        onMouseDown={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onPortDragStart(node.id, "output");
        }}
        title="Drag to connect output"
      />


      {/* Delete button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="absolute -top-2 -right-2 w-4 h-4 rounded-full text-[9px] items-center justify-center cursor-pointer flex opacity-0 group-hover:opacity-100 transition-opacity duration-150"
        style={{
          backgroundColor: "var(--accent-red)",
          color: "var(--bg-primary)",
        }}
      >
        ✕
      </button>


      <div className="flex items-center gap-2 mb-1">
        <MethodBadge method={endpoint?.method ?? "GET"} />
        {result && (
          <span
            className="text-[10px] font-bold ml-auto px-1.5 py-0.5 rounded-full"
            style={{
              color: result.error ? "var(--accent-red)" : "var(--accent-green)",
              backgroundColor: result.error
                ? "color-mix(in srgb, var(--accent-red) 12%, transparent)"
                : "color-mix(in srgb, var(--accent-green) 12%, transparent)",
            }}
          >
            {result.status > 0 ? result.status : "ERR"}
          </span>
        )}
      </div>
      <p className="text-[11px] truncate" style={{ color: "var(--text-primary)" }}>
        {node.name}
      </p>
      <p className="text-[10px] truncate" style={{ color: "var(--text-secondary)" }}>
        {endpoint?.path ?? "unknown"}
      </p>
      {result && (
        <p className="text-[9px] mt-1" style={{ color: "var(--text-secondary)" }}>
          {result.duration}ms
        </p>
      )}
    </div>
  );
}
