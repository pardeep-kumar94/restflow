export interface FlatField {
  name: string;
  path: string;
  type: string;
  enum?: string[];
  minimum?: number;
  maximum?: number;
  required?: boolean;
  description?: string;
}

export function flattenSchema(schema: Record<string, any>, prefix = ""): FlatField[] {
  const fields: FlatField[] = [];
  if (!schema || typeof schema !== "object") return fields;

  if (schema.type === "object" && schema.properties) {
    for (const [key, value] of Object.entries(schema.properties)) {
      const path = prefix ? `${prefix}.${key}` : key;
      const val = value as Record<string, any>;
      fields.push({
        name: key,
        path,
        type: val?.type ?? "any",
        enum: val?.enum,
        minimum: val?.minimum,
        maximum: val?.maximum,
        required: schema.required?.includes(key),
        description: val?.description,
      });
      if (val?.type === "object" && val?.properties) {
        fields.push(...flattenSchema(val, path));
      }
      // Recurse into array items
      if (val?.type === "array" && val?.items) {
        const itemSchema = val.items as Record<string, any>;
        if (itemSchema.type === "object" && itemSchema.properties) {
          fields.push(...flattenSchema(itemSchema, `${path}.[]`));
        }
      }
    }
  }

  // Handle top-level array schema
  if (schema.type === "array" && schema.items) {
    const itemSchema = schema.items as Record<string, any>;
    const arrayPrefix = prefix ? `${prefix}.[]` : "[]";
    fields.push({
      name: prefix || "items",
      path: prefix || "items",
      type: "array",
      description: "Array — expand to see item fields",
    });
    if (itemSchema.type === "object" && itemSchema.properties) {
      fields.push(...flattenSchema(itemSchema, arrayPrefix));
    }
  }

  return fields;
}

export function getValueAtPath(obj: any, dotPath: string): any {
  const parts = dotPath.split(".");
  let current = obj;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined;
    // Treat [] as [0] — pick first array element when schema path is used
    if (part === "[]") {
      current = Array.isArray(current) ? current[0] : current[part];
    } else {
      current = current[part];
    }
  }
  return current;
}

export interface TreeNode {
  key: string;
  path: string;
  type: "object" | "array" | "value";
  value?: unknown;
  children?: TreeNode[];
}

export function buildDataTree(data: unknown, parentPath = "", seen = new WeakSet<object>()): TreeNode[] {
  if (data == null || typeof data !== "object") return [];
  if (seen.has(data as object)) return [];
  seen.add(data as object);

  if (Array.isArray(data)) {
    return data.slice(0, 20).map((item, i) => {
      const path = parentPath ? `${parentPath}.${i}` : `${i}`;
      const isLeaf = item == null || typeof item !== "object";
      return {
        key: `[${i}]`,
        path,
        type: isLeaf ? "value" as const : (Array.isArray(item) ? "array" as const : "object" as const),
        value: isLeaf ? item : undefined,
        children: isLeaf ? undefined : buildDataTree(item, path, seen),
      };
    });
  }

  return Object.entries(data as object).map(([key, val]) => {
    const path = parentPath ? `${parentPath}.${key}` : key;
    const isLeaf = val == null || typeof val !== "object";
    return {
      key,
      path,
      type: isLeaf ? "value" as const : (Array.isArray(val) ? "array" as const : "object" as const),
      value: isLeaf ? val : undefined,
      children: isLeaf ? undefined : buildDataTree(val, path, seen),
    };
  });
}

export function extractPathParams(url: string): string[] {
  const matches = url.match(/\{(\w+)\}/g);
  if (!matches) return [];
  return matches.map((m) => m.slice(1, -1));
}

/** Score how well a source field name matches a target field name (0-1). */
function nameSimilarity(source: string, target: string): number {
  const s = source.toLowerCase().replace(/[_-]/g, "");
  const t = target.toLowerCase().replace(/[_-]/g, "");
  if (s === t) return 1;
  if (t.includes(s) || s.includes(t)) return 0.7;
  // Check if last segment matches (e.g. "uid" matches "item_uid")
  const sLast = source.toLowerCase().split(/[_-]/).pop() ?? "";
  const tLast = target.toLowerCase().split(/[_-]/).pop() ?? "";
  if (sLast.length > 2 && sLast === tLast) return 0.6;
  return 0;
}

interface SuggestedMapping {
  sourceKey: string;
  sourcePath: string;
  sourceValue: unknown;
  targetField: string;
  targetLocation: "header" | "query" | "body";
  score: number;
}

/** Auto-suggest mappings by comparing selected value names to target field names. */
export function suggestMappings(
  selections: { key: string; path: string; value: unknown }[],
  targets: { field: string; location: "header" | "query" | "body"; type?: string }[]
): SuggestedMapping[] {
  const suggestions: SuggestedMapping[] = [];
  const usedTargets = new Set<string>();

  // Sort by score descending to assign best matches first
  const candidates: { sel: typeof selections[0]; target: typeof targets[0]; score: number }[] = [];
  for (const sel of selections) {
    for (const target of targets) {
      const score = nameSimilarity(sel.key, target.field);
      if (score >= 0.5) {
        candidates.push({ sel, target, score });
      }
    }
  }
  candidates.sort((a, b) => b.score - a.score);

  for (const { sel, target, score } of candidates) {
    const targetKey = `${target.location}::${target.field}`;
    if (usedTargets.has(targetKey)) continue;
    // Don't double-assign a source
    if (suggestions.some((s) => s.sourcePath === sel.path)) continue;
    usedTargets.add(targetKey);
    suggestions.push({
      sourceKey: sel.key,
      sourcePath: sel.path,
      sourceValue: sel.value,
      targetField: target.field,
      targetLocation: target.location,
      score,
    });
  }

  return suggestions;
}
