"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useWorkflowStore } from "@/stores/workflow-store";
import { GraphNode } from "./graph-node";
import { ConnectionLine, getPortPositions } from "./connection-line";
import type { WorkflowNode, NodeConnection } from "@/types";

const SECTION_COLORS = [
  "var(--accent-purple)",
  "var(--accent-blue)",
  "var(--accent-green)",
  "var(--accent-yellow)",
  "var(--accent-red)",
];

const MIN_ZOOM = 0.15;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.1;

export function WorkflowCanvas() {
  const {
    workflow,
    endpoints,
    selectedNodeId,
    selectNode,
    removeNode,
    addNode,
    updateNode,
    updateNodePosition,
    addConnection,
    removeConnection,
    executionContext,
    isExecuting,
    selectedConnectionId,
    selectConnection,
    assignNodeToSection,
    sectionToolActive,
    setSectionToolActive,
    addSection,
    removeSection,
    renameSection,
    updateSectionBounds,
  } = useWorkflowStore();

  const [drawingFrom, setDrawingFrom] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  // Zoom & pan state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);

  // Section drawing state
  const [sectionDrawStart, setSectionDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [sectionDrawCurrent, setSectionDrawCurrent] = useState<{ x: number; y: number } | null>(null);
  const [namingSection, setNamingSection] = useState<{ bounds: { x: number; y: number; width: number; height: number } } | null>(null);
  const [sectionNameInput, setSectionNameInput] = useState("");
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editSectionName, setEditSectionName] = useState("");

  // Section dragging state
  const sectionDragRef = useRef<{
    sectionId: string;
    startX: number;
    startY: number;
    origBounds: { x: number; y: number; width: number; height: number };
    nodeOffsets: { nodeId: string; dx: number; dy: number }[];
  } | null>(null);
  const [draggingSectionId, setDraggingSectionId] = useState<string | null>(null);

  // Convert screen coordinates to canvas (world) coordinates
  const screenToCanvas = useCallback((clientX: number, clientY: number) => {
    if (!canvasRef.current) return { x: clientX, y: clientY };
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: (clientX - rect.left - pan.x) / zoom,
      y: (clientY - rect.top - pan.y) / zoom,
    };
  }, [zoom, pan]);

  const getCanvasOffset = useCallback((e: React.MouseEvent | MouseEvent) => {
    return screenToCanvas(e.clientX, e.clientY);
  }, [screenToCanvas]);

  // Wheel handler for zoom (pinch / ctrl+scroll) and pan (two-finger scroll)
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      // Pinch-to-zoom or Ctrl+scroll → zoom
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const rect = el.getBoundingClientRect();
        const cursorX = e.clientX - rect.left;
        const cursorY = e.clientY - rect.top;

        // Point in world space before zoom
        const worldX = (cursorX - pan.x) / zoom;
        const worldY = (cursorY - pan.y) / zoom;

        const delta = -e.deltaY * 0.01;
        const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom + delta));

        // Adjust pan so the world point under cursor stays put
        const newPanX = cursorX - worldX * newZoom;
        const newPanY = cursorY - worldY * newZoom;

        setZoom(newZoom);
        setPan({ x: newPanX, y: newPanY });
      } else {
        // Regular two-finger scroll → pan
        e.preventDefault();
        setPan((p) => ({
          x: p.x - e.deltaX,
          y: p.y - e.deltaY,
        }));
      }
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [zoom, pan]);

  const zoomTo = useCallback((newZoom: number) => {
    const el = canvasRef.current;
    if (!el) { setZoom(newZoom); return; }
    const rect = el.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const worldX = (cx - pan.x) / zoom;
    const worldY = (cy - pan.y) / zoom;
    const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, newZoom));
    setPan({ x: cx - worldX * clamped, y: cy - worldY * clamped });
    setZoom(clamped);
  }, [zoom, pan]);

  const handleCanvasClick = () => {
    if (sectionToolActive) return;
    selectNode(null);
    selectConnection(null);
    setDrawingFrom(null);
  };

  const handlePortDragStart = useCallback((nodeId: string) => {
    setDrawingFrom(nodeId);
  }, []);

  const handlePortDragEnd = useCallback((nodeId: string) => {
    if (drawingFrom && drawingFrom !== nodeId) {
      const exists = workflow.connections.some(
        (c) => c.sourceNodeId === drawingFrom && c.targetNodeId === nodeId
      );
      if (!exists) {
        const conn: NodeConnection = {
          id: `conn-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          sourceNodeId: drawingFrom,
          targetNodeId: nodeId,
          fieldMappings: [],
        };
        addConnection(conn);
        selectConnection(conn.id);
      }
    }
    setDrawingFrom(null);
  }, [drawingFrom, workflow.connections, workflow.nodes, addConnection, selectConnection]);

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    if (sectionToolActive && !namingSection) {
      e.preventDefault();
      e.stopPropagation();
      const pos = getCanvasOffset(e);
      setSectionDrawStart(pos);
      setSectionDrawCurrent(pos);
      return;
    }
    // Middle-click or space+click panning
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      e.preventDefault();
      setIsPanning(true);
      panStartRef.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
    }
  }, [sectionToolActive, namingSection, getCanvasOffset, pan]);

  const handleSectionDragStart = useCallback((sectionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const sec = (workflow.sections ?? []).find((s) => s.id === sectionId);
    if (!sec) return;
    const pos = getCanvasOffset(e);
    // Gather nodes that belong to this section
    const nodesInSection = workflow.nodes.filter((n) => n.sectionId === sectionId);
    const nodeOffsets = nodesInSection.map((n) => ({
      nodeId: n.id,
      dx: n.position.x - sec.bounds.x,
      dy: n.position.y - sec.bounds.y,
    }));
    sectionDragRef.current = {
      sectionId,
      startX: pos.x,
      startY: pos.y,
      origBounds: { ...sec.bounds },
      nodeOffsets,
    };
    setDraggingSectionId(sectionId);
  }, [workflow.sections, workflow.nodes, getCanvasOffset]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    // Section dragging
    if (sectionDragRef.current) {
      const pos = getCanvasOffset(e);
      const { startX, startY, origBounds, nodeOffsets, sectionId } = sectionDragRef.current;
      const dx = pos.x - startX;
      const dy = pos.y - startY;
      const newBounds = { ...origBounds, x: origBounds.x + dx, y: origBounds.y + dy };
      updateSectionBounds(sectionId, newBounds);
      for (const { nodeId, dx: ndx, dy: ndy } of nodeOffsets) {
        updateNodePosition(nodeId, { x: newBounds.x + ndx, y: newBounds.y + ndy });
      }
      return;
    }
    if (isPanning && panStartRef.current) {
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      setPan({ x: panStartRef.current.panX + dx, y: panStartRef.current.panY + dy });
      return;
    }
    if (sectionDrawStart) {
      setSectionDrawCurrent(getCanvasOffset(e));
      return;
    }
    if (drawingFrom) {
      setMousePos(getCanvasOffset(e));
    }
  }, [drawingFrom, sectionDrawStart, getCanvasOffset, isPanning, updateSectionBounds, updateNodePosition]);

  const handleCanvasMouseUp = useCallback(() => {
    if (sectionDragRef.current) {
      sectionDragRef.current = null;
      setDraggingSectionId(null);
      return;
    }
    if (isPanning) {
      setIsPanning(false);
      panStartRef.current = null;
      return;
    }
    if (sectionDrawStart && sectionDrawCurrent) {
      const x = Math.min(sectionDrawStart.x, sectionDrawCurrent.x);
      const y = Math.min(sectionDrawStart.y, sectionDrawCurrent.y);
      const width = Math.abs(sectionDrawCurrent.x - sectionDrawStart.x);
      const height = Math.abs(sectionDrawCurrent.y - sectionDrawStart.y);
      if (width > 30 && height > 30) {
        setNamingSection({ bounds: { x, y, width, height } });
        setSectionNameInput("");
      }
      setSectionDrawStart(null);
      setSectionDrawCurrent(null);
      return;
    }
    setDrawingFrom(null);
  }, [sectionDrawStart, sectionDrawCurrent, isPanning]);

  const handleSectionNameSubmit = () => {
    if (!namingSection || !sectionNameInput.trim()) return;
    const color = SECTION_COLORS[(workflow.sections?.length ?? 0) % SECTION_COLORS.length];
    addSection(sectionNameInput.trim(), namingSection.bounds, color);
    setNamingSection(null);
    setSectionNameInput("");
    setSectionToolActive(false);
  };

  const handleDropEndpoint = (e: React.DragEvent) => {
    if (sectionToolActive) return;
    e.preventDefault();
    const endpointId = e.dataTransfer.getData("application/endpoint-id");
    if (!endpointId) return;

    const endpoint = endpoints.find((ep) => ep.id === endpointId);
    if (!endpoint) return;

    const pos = getCanvasOffset(e);
    const node: WorkflowNode = {
      id: `node-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: endpoint.summary || `${endpoint.method} ${endpoint.path}`,
      endpointId: endpoint.id,
      urlOverride: "",
      headers: {},
      queryParams: {},
      body: "",
      uiAssistance: false,
      position: { x: pos.x - 75, y: pos.y - 35 },
      stage: 1,
    };
    addNode(node);
  };

  const handleConnectionSelect = useCallback((connectionId: string) => {
    selectConnection(connectionId);
  }, [selectConnection]);

  const drawingSourceNode = drawingFrom ? workflow.nodes.find((n) => n.id === drawingFrom) : null;

  // Compute the selection rectangle while drawing
  const selectionRect = sectionDrawStart && sectionDrawCurrent
    ? {
        x: Math.min(sectionDrawStart.x, sectionDrawCurrent.x),
        y: Math.min(sectionDrawStart.y, sectionDrawCurrent.y),
        width: Math.abs(sectionDrawCurrent.x - sectionDrawStart.x),
        height: Math.abs(sectionDrawCurrent.y - sectionDrawStart.y),
      }
    : null;

  const sections = workflow.sections ?? [];
  const zoomPercent = Math.round(zoom * 100);

  return (
    <div
      ref={canvasRef}
      className="h-full overflow-hidden relative"
      style={{
        backgroundColor: "var(--bg-primary)",
        cursor: sectionToolActive ? "crosshair" : isPanning ? "grabbing" : "default",
      }}
      onClick={handleCanvasClick}
      onMouseDown={handleCanvasMouseDown}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDropEndpoint}
      onMouseMove={handleCanvasMouseMove}
      onMouseUp={handleCanvasMouseUp}
    >
      {/* Transformed layer — everything inside moves with zoom & pan */}
      <div
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: "0 0",
          position: "absolute",
          top: 0,
          left: 0,
          width: "10000px",
          height: "10000px",
          backgroundImage: "radial-gradient(circle, var(--border) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      >
        {/* Section rectangles (behind nodes) */}
        {sections.map((sec) => (
          <div
            key={sec.id}
            className="absolute rounded-lg anim-fade-in"
            style={{
              left: sec.bounds.x,
              top: sec.bounds.y,
              width: sec.bounds.width,
              height: sec.bounds.height,
              backgroundColor: `color-mix(in srgb, ${sec.color} 8%, transparent)`,
              border: `2px dashed color-mix(in srgb, ${sec.color} ${draggingSectionId === sec.id ? "70%" : "40%"}, transparent)`,
              zIndex: 0,
              cursor: sectionToolActive ? "crosshair" : "grab",
            }}
            onMouseDown={(e) => {
              if (sectionToolActive) return;
              handleSectionDragStart(sec.id, e);
            }}
          >
            {/* Section label */}
            <div
              className="absolute -top-3 left-3 flex items-center gap-1.5"
            >
              {editingSectionId === sec.id ? (
                <input
                  autoFocus
                  className="text-[11px] font-bold px-2 py-0.5 rounded outline-none"
                  style={{
                    backgroundColor: sec.color,
                    color: "var(--bg-primary)",
                    minWidth: 60,
                  }}
                  value={editSectionName}
                  onChange={(e) => setEditSectionName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      if (editSectionName.trim()) renameSection(sec.id, editSectionName.trim());
                      setEditingSectionId(null);
                    }
                    if (e.key === "Escape") setEditingSectionId(null);
                  }}
                  onBlur={() => {
                    if (editSectionName.trim()) renameSection(sec.id, editSectionName.trim());
                    setEditingSectionId(null);
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span
                  className="text-[11px] font-bold px-2 py-0.5 rounded cursor-pointer"
                  style={{
                    backgroundColor: sec.color,
                    color: "var(--bg-primary)",
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setEditingSectionId(sec.id);
                    setEditSectionName(sec.name);
                  }}
                  title="Double-click to rename"
                >
                  {sec.name}
                </span>
              )}
              <button
                className="w-4 h-4 rounded-full text-[9px] flex items-center justify-center cursor-pointer"
                style={{
                  backgroundColor: "var(--accent-red)",
                  color: "var(--bg-primary)",
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  removeSection(sec.id);
                }}
                title="Delete section"
              >
                ✕
              </button>
            </div>
          </div>
        ))}

        {/* Drawing preview rectangle */}
        {selectionRect && selectionRect.width > 5 && selectionRect.height > 5 && (
          <div
            className="absolute rounded-lg"
            style={{
              left: selectionRect.x,
              top: selectionRect.y,
              width: selectionRect.width,
              height: selectionRect.height,
              backgroundColor: "color-mix(in srgb, var(--accent-purple) 10%, transparent)",
              border: "2px dashed var(--accent-purple)",
              zIndex: 50,
              pointerEvents: "none",
            }}
          />
        )}

        {/* SVG layer for connections */}
        <svg
          className="absolute inset-0"
          style={{ pointerEvents: "none", width: "100%", height: "100%" }}
        >
          <g style={{ pointerEvents: "auto" }}>
            {workflow.connections.map((conn) => {
              const source = workflow.nodes.find((n) => n.id === conn.sourceNodeId);
              const target = workflow.nodes.find((n) => n.id === conn.targetNodeId);
              if (!source || !target) return null;
              return (
                <ConnectionLine
                  key={conn.id}
                  connection={conn}
                  sourceNode={source}
                  targetNode={target}
                  isSelected={selectedConnectionId === conn.id}
                  onSelect={() => handleConnectionSelect(conn.id)}
                  onDelete={() => {
                    removeConnection(conn.id);
                    if (selectedConnectionId === conn.id) selectConnection(null);
                  }}
                />
              );
            })}
          </g>

          {/* Temporary line while drawing a connection */}
          {drawingFrom && drawingSourceNode && (
            <path
              d={`M ${drawingSourceNode.position.x + 160} ${drawingSourceNode.position.y + 40} C ${drawingSourceNode.position.x + 210} ${drawingSourceNode.position.y + 40}, ${mousePos.x - 50} ${mousePos.y}, ${mousePos.x} ${mousePos.y}`}
              stroke="var(--accent-green)"
              strokeWidth={2}
              fill="none"
              opacity={0.4}
              strokeDasharray="6 3"
            />
          )}
        </svg>

        {/* Nodes */}
        {workflow.nodes.map((node) => (
          <GraphNode
            key={node.id}
            node={node}
            endpoint={endpoints.find((e) => e.id === node.endpointId)}
            isSelected={selectedNodeId === node.id}
            result={executionContext?.results[node.id]}
            onSelect={() => {
              selectNode(node.id);
            }}
            onDelete={() => removeNode(node.id)}
            onPositionChange={(pos) => updateNodePosition(node.id, pos)}
            onToggleAssistance={() => updateNode(node.id, { uiAssistance: !node.uiAssistance })}
            onStageChange={(stage) => updateNode(node.id, { stage })}
            sections={workflow.sections ?? []}
            onSectionChange={(sectionId) => assignNodeToSection(node.id, sectionId)}
            onPortDragStart={handlePortDragStart}
            onPortDragEnd={handlePortDragEnd}
          />
        ))}
      </div>

      {/* === HUD elements (fixed, outside transform) === */}

      {/* Section naming prompt */}
      {namingSection && (
        <div
          className="absolute z-50 anim-scale-in"
          style={{
            left: namingSection.bounds.x * zoom + pan.x + (namingSection.bounds.width * zoom) / 2,
            top: namingSection.bounds.y * zoom + pan.y - 8,
            transform: "translate(-50%, -100%)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="rounded-lg border p-3 flex items-center gap-2"
            style={{
              backgroundColor: "var(--bg-secondary)",
              borderColor: "var(--accent-purple)",
            }}
          >
            <input
              autoFocus
              className="text-xs bg-transparent outline-none px-2 py-1 rounded border"
              style={{ color: "var(--text-primary)", borderColor: "var(--border)", minWidth: 140 }}
              placeholder="Section name..."
              value={sectionNameInput}
              onChange={(e) => setSectionNameInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSectionNameSubmit();
                if (e.key === "Escape") {
                  setNamingSection(null);
                  setSectionToolActive(false);
                }
              }}
            />
            <button
              className="text-[11px] font-bold px-3 py-1 rounded cursor-pointer"
              style={{ backgroundColor: "var(--accent-purple)", color: "var(--bg-primary)" }}
              onClick={handleSectionNameSubmit}
            >
              Create
            </button>
            <button
              className="text-[11px] px-2 py-1 rounded cursor-pointer"
              style={{ color: "var(--text-secondary)" }}
              onClick={() => {
                setNamingSection(null);
                setSectionToolActive(false);
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Section tool hint */}
      {sectionToolActive && !sectionDrawStart && !namingSection && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 anim-fade-in">
          <div
            className="px-4 py-2 rounded-full text-[12px] font-medium"
            style={{
              backgroundColor: "var(--accent-purple)",
              color: "var(--bg-primary)",
            }}
          >
            Draw a rectangle around APIs to create a section
          </div>
        </div>
      )}

      {/* Zoom controls */}
      <div
        className="absolute bottom-4 right-4 z-40 flex items-center gap-1 rounded-lg border px-1 py-1 anim-fade-in"
        style={{
          backgroundColor: "var(--bg-secondary)",
          borderColor: "var(--border)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="w-7 h-7 flex items-center justify-center rounded text-sm cursor-pointer transition-colors"
          style={{ color: "var(--text-primary)" }}
          onClick={() => zoomTo(zoom - ZOOM_STEP)}
          title="Zoom out"
        >
          −
        </button>
        <button
          className="px-2 h-7 flex items-center justify-center rounded text-[11px] font-mono cursor-pointer transition-colors"
          style={{ color: "var(--text-secondary)", minWidth: 44 }}
          onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
          title="Reset zoom"
        >
          {zoomPercent}%
        </button>
        <button
          className="w-7 h-7 flex items-center justify-center rounded text-sm cursor-pointer transition-colors"
          style={{ color: "var(--text-primary)" }}
          onClick={() => zoomTo(zoom + ZOOM_STEP)}
          title="Zoom in"
        >
          +
        </button>
      </div>

      {/* Empty state */}
      {workflow.nodes.length === 0 && !sectionToolActive && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <p className="text-sm mb-2" style={{ color: "var(--text-secondary)" }}>No nodes yet</p>
            <p className="text-[12px]" style={{ color: "var(--text-secondary)" }}>
              Drag endpoints from the API Explorer onto the canvas
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
