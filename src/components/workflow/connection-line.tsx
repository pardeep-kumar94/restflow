"use client";

import { useState } from "react";
import type { NodeConnection, WorkflowNode } from "@/types";

interface ConnectionLineProps {
  connection: NodeConnection;
  sourceNode: WorkflowNode;
  targetNode: WorkflowNode;
  isSelected?: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

export function getPortPositions(source: WorkflowNode, target: WorkflowNode) {
  const sx = source.position.x + 160;
  const sy = source.position.y + 40;
  const tx = target.position.x;
  const ty = target.position.y + 40;
  return { sx, sy, tx, ty };
}

function bezierPath(sx: number, sy: number, tx: number, ty: number) {
  const dx = Math.abs(tx - sx) * 0.5;
  return `M ${sx} ${sy} C ${sx + dx} ${sy}, ${tx - dx} ${ty}, ${tx} ${ty}`;
}

export function ConnectionLine({
  connection,
  sourceNode,
  targetNode,
  isSelected,
  onSelect,
  onDelete,
}: ConnectionLineProps) {
  const [hovered, setHovered] = useState(false);
  const { sx, sy, tx, ty } = getPortPositions(sourceNode, targetNode);
  const path = bezierPath(sx, sy, tx, ty);

  const midX = (sx + tx) / 2;
  const midY = (sy + ty) / 2;

  const mappingCount = connection.fieldMappings.length;
  const showControls = hovered || isSelected;

  const lineId = `conn-${connection.sourceNodeId}-${connection.targetNodeId}`;

  return (
    <g>
      {/* Glow filter for selected state */}
      <defs>
        <filter id={`glow-${lineId}`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id={`pill-shadow-${lineId}`} x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="rgba(0,0,0,0.3)" floodOpacity="0.5" />
        </filter>
      </defs>

      {/* Glow layer for selected state */}
      {isSelected && (
        <path
          d={path}
          stroke="var(--accent-blue)"
          strokeWidth={6}
          fill="none"
          opacity={0.2}
          filter={`url(#glow-${lineId})`}
        />
      )}

      {/* Visible line */}
      <path
        d={path}
        stroke={isSelected ? "var(--accent-blue)" : "var(--accent-green)"}
        strokeWidth={showControls ? 3 : 2}
        fill="none"
        opacity={showControls ? 0.9 : 0.6}
        strokeDasharray={hovered && !isSelected ? "6 4" : "none"}
        style={{
          transition: "opacity 0.2s ease, stroke-width 0.2s ease, stroke-dasharray 0.3s ease",
          ...(hovered && !isSelected ? { animation: "dashFlow 0.6s linear infinite" } : {}),
        }}
      />

      {/* Invisible hit area for clicking */}
      <path
        d={path}
        stroke="transparent"
        strokeWidth={14}
        fill="none"
        style={{ cursor: "pointer" }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
      />

      {/* Inline keyframes for dash animation */}
      <style>{`
        @keyframes dashFlow {
          to { stroke-dashoffset: -10; }
        }
        @keyframes deletePopIn {
          from { transform: scale(0); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>


      {/* Delete button on hover */}
      {showControls && (
        <g
          style={{
            cursor: "pointer",
            transformOrigin: `${midX + 28}px ${midY}px`,
            animation: "deletePopIn 0.15s ease-out forwards",
          }}
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <circle
            cx={midX + 28}
            cy={midY}
            r={9}
            fill="var(--bg-primary)"
            stroke="var(--accent-red)"
            strokeWidth={1.5}
          />
          <circle
            cx={midX + 28}
            cy={midY}
            r={9}
            fill="var(--accent-red)"
            opacity={hovered ? 0.9 : 0.75}
            style={{ transition: "opacity 0.15s ease" }}
          />
          <text
            x={midX + 28}
            y={midY + 3}
            textAnchor="middle"
            fill="var(--bg-primary)"
            fontSize={8}
            fontWeight="bold"
          >
            ✕
          </text>
        </g>
      )}
    </g>
  );
}

export function DragConnectionLine({
  startX,
  startY,
  endX,
  endY,
}: {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}) {
  const path = bezierPath(startX, startY, endX, endY);
  return (
    <path
      d={path}
      stroke="var(--accent-green)"
      strokeWidth={2}
      fill="none"
      opacity={0.4}
      strokeDasharray="6 4"
    />
  );
}
