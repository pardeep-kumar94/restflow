import type { WorkflowNode, NodeConnection, ConnectionMapping, ExecutionContext } from "@/types";
import { getValueAtPath } from "./schema-utils";

/** Search for a key anywhere in a nested object/array. Returns first match. */
function deepFind(obj: unknown, key: string): unknown {
  if (obj == null || typeof obj !== "object") return undefined;
  if (!Array.isArray(obj) && key in (obj as Record<string, unknown>)) {
    return (obj as Record<string, unknown>)[key];
  }
  const items = Array.isArray(obj) ? obj : Object.values(obj);
  for (const item of items) {
    const found = deepFind(item, key);
    if (found !== undefined) return found;
  }
  return undefined;
}

/**
 * Returns execution waves — groups of nodes that can run in each round.
 * Wave 0: nodes with no incoming connections.
 * Wave N: nodes whose all source nodes are in waves 0..N-1.
 * Throws if a cycle is detected.
 */
export function getExecutionOrder(
  nodes: WorkflowNode[],
  connections: NodeConnection[]
): WorkflowNode[][] {
  const cycle = detectCycle(nodes, connections);
  if (cycle) {
    throw new Error(`Cycle detected involving node: ${cycle}`);
  }

  const incomingMap = new Map<string, Set<string>>();
  for (const n of nodes) incomingMap.set(n.id, new Set());
  for (const c of connections) {
    incomingMap.get(c.targetNodeId)?.add(c.sourceNodeId);
  }

  const waves: WorkflowNode[][] = [];
  const placed = new Set<string>();

  while (placed.size < nodes.length) {
    const wave: WorkflowNode[] = [];
    for (const n of nodes) {
      if (placed.has(n.id)) continue;
      const deps = incomingMap.get(n.id)!;
      if ([...deps].every((d) => placed.has(d))) {
        wave.push(n);
      }
    }
    if (wave.length === 0) break;
    for (const n of wave) placed.add(n.id);
    waves.push(wave);
  }

  return waves;
}

/**
 * Returns the ID of a node involved in a cycle, or null if no cycle exists.
 */
export function detectCycle(
  nodes: WorkflowNode[],
  connections: NodeConnection[]
): string | null {
  const adjacency = new Map<string, string[]>();
  for (const n of nodes) adjacency.set(n.id, []);
  for (const c of connections) {
    adjacency.get(c.sourceNodeId)?.push(c.targetNodeId);
  }

  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map<string, number>();
  for (const n of nodes) color.set(n.id, WHITE);

  for (const n of nodes) {
    if (color.get(n.id) === WHITE) {
      const cycleNode = dfs(n.id, adjacency, color);
      if (cycleNode) return cycleNode;
    }
  }
  return null;
}

function dfs(
  nodeId: string,
  adjacency: Map<string, string[]>,
  color: Map<string, number>
): string | null {
  const GRAY = 1, BLACK = 2;
  color.set(nodeId, GRAY);
  for (const neighbor of adjacency.get(nodeId) ?? []) {
    if (color.get(neighbor) === GRAY) return neighbor;
    if (color.get(neighbor) === 0) {
      const result = dfs(neighbor, adjacency, color);
      if (result) return result;
    }
  }
  color.set(nodeId, BLACK);
  return null;
}

/**
 * Resolve connection mappings for a target node.
 * Reads source node results from context and returns merged headers, queryParams, body.
 */
export function resolveConnectionMappings(
  targetNodeId: string,
  connections: NodeConnection[],
  context: ExecutionContext
): { headers: Record<string, string>; queryParams: Record<string, string>; bodyOverrides: Record<string, unknown> } {
  const headers: Record<string, string> = {};
  const queryParams: Record<string, string> = {};
  const bodyOverrides: Record<string, unknown> = {};

  const incoming = connections.filter((c) => c.targetNodeId === targetNodeId);

  for (const conn of incoming) {
    const sourceResult = context.results[conn.sourceNodeId];
    if (!sourceResult) continue;

    for (const mapping of conn.fieldMappings) {
      let resolvedValue = mapping.value;
      let rawValue: unknown = undefined;

      // Match {{nodeId.category.path}} where category can be response, queryParams, headers
      const varMatch = mapping.value.match(/^\{\{([^.]+)\.(\w+)\.(.+)\}\}$/);
      if (varMatch) {
        const [, sourceId, category, path] = varMatch;
        if (category === "response") {
          // Check user selections first (from visual array picker)
          // Direct key match: "sourceId.response.path"
          const selectionKey = `${sourceId}.response.${path}`;
          if (context.userSelections && context.userSelections[selectionKey] !== undefined) {
            rawValue = context.userSelections[selectionKey];
          }
          // Also check "sourceField->targetField" format selections
          if (rawValue === undefined && context.userSelections) {
            const prefix = `${sourceId}.response.`;
            const targetField = mapping.targetField;
            for (const [selKey, selVal] of Object.entries(context.userSelections)) {
              if (!selKey.startsWith(prefix)) continue;
              const rest = selKey.slice(prefix.length);
              const arrowIdx = rest.indexOf("->");
              if (arrowIdx !== -1) {
                const mappedTarget = rest.slice(arrowIdx + 2);
                if (mappedTarget === targetField) {
                  rawValue = selVal;
                  break;
                }
              }
            }
          }
          if (rawValue === undefined) {
            const sourceData = context.variables[sourceId];
            rawValue = getValueAtPath(sourceData, path);
            // Fallback: deep search if direct path fails
            if (rawValue === undefined) {
              rawValue = deepFind(sourceData, path);
            }
          }
        } else if (category === "queryParams" || category === "headers") {
          const config = context.stepConfigs[sourceId];
          if (config) {
            const obj = category === "queryParams" ? config.queryParams : config.headers;
            rawValue = obj?.[path];
          }
        }
        resolvedValue = rawValue != null ? String(rawValue) : mapping.value;
      }

      if (mapping.targetLocation === "header") {
        headers[mapping.targetField] = resolvedValue;
      } else if (mapping.targetLocation === "query") {
        queryParams[mapping.targetField] = resolvedValue;
      } else if (mapping.targetLocation === "body") {
        bodyOverrides[mapping.targetField] = rawValue ?? resolvedValue;
      }
    }
  }

  return { headers, queryParams, bodyOverrides };
}
