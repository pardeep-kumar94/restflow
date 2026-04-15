import type { ExecutionContext } from "@/types";

const VARIABLE_REGEX = /\{\{([^}]+)\}\}/g;

export function resolveVariables(
  template: string,
  context: ExecutionContext
): string {
  return template.replace(VARIABLE_REGEX, (match, path: string) => {
    const trimmed = path.trim();
    // Resolve dynamic built-in variables
    const dynamic = resolveDynamic(trimmed);
    if (dynamic !== undefined) return dynamic;

    const resolved = resolvePath(trimmed, context);
    if (resolved === undefined) return match;
    return typeof resolved === "string" ? resolved : JSON.stringify(resolved);
  });
}

function resolveDynamic(name: string): string | undefined {
  const now = new Date();
  switch (name) {
    case "$timestamp": return String(Math.floor(now.getTime() / 1000));
    case "$timestampMs": return String(now.getTime());
    case "$isoDate": return now.toISOString();
    case "$date": return now.toISOString().slice(0, 10);
    case "$uuid": return crypto.randomUUID();
    case "$randomInt": return String(Math.floor(Math.random() * 10000));
    default: return undefined;
  }
}

export function resolveObjectVariables(
  obj: Record<string, string>,
  context: ExecutionContext
): Record<string, string> {
  const resolved: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    resolved[key] = resolveVariables(value, context);
  }
  return resolved;
}

function resolvePath(path: string, context: ExecutionContext): unknown {
  const parts = path.split(".");
  if (parts.length < 2) return undefined;

  const stepId = parts[0];
  const category = parts[1]; // "response", "headers", "queryParams", "body"
  const rest = parts.slice(2);

  // Custom variables: {{vars.myVar}}
  if (stepId === "vars") {
    const varName = parts.slice(1).join(".");
    const customVars = (context as any).customVariables;
    if (customVars && varName in customVars) {
      return customVars[varName];
    }
    return undefined;
  }

  // Check step config for headers/queryParams
  if (category === "headers" || category === "queryParams") {
    const config = context.stepConfigs?.[stepId];
    if (!config) return undefined;
    const obj = category === "headers" ? config.headers : config.queryParams;
    if (rest.length === 0) return obj;
    return obj[rest[0]];
  }

  // For response and other paths, use existing StepResult traversal
  const stepResult = context.results[stepId];
  if (!stepResult) return undefined;

  let current: any = stepResult;
  for (const part of [category, ...rest]) {
    if (current == null || typeof current !== "object") return undefined;
    if (part === "[]") {
      current = Array.isArray(current) ? current[0] : current[part];
    } else {
      current = current[part];
    }
  }

  // If direct path didn't resolve, try deep search in the response for the last key
  if (current === undefined && category === "response" && rest.length > 0) {
    const found = deepFind(stepResult.response, rest[rest.length - 1]);
    if (found !== undefined) return found;
  }

  return current;
}

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

export function extractVariableNames(template: string): string[] {
  const matches: string[] = [];
  let match: RegExpExecArray | null;
  const regex = new RegExp(VARIABLE_REGEX.source, "g");
  while ((match = regex.exec(template)) !== null) {
    matches.push(match[1].trim());
  }
  return matches;
}

export function getAvailableVariables(
  stepIndex: number,
  steps: { id: string; name: string }[],
  endpoints: { id: string; responseSchema: Record<string, any> }[],
  stepsData: { endpointId: string }[]
): string[] {
  const variables: string[] = [];
  for (let i = 0; i < stepIndex; i++) {
    const step = steps[i];
    const stepData = stepsData[i];
    const endpoint = endpoints.find((e) => e.id === stepData.endpointId);
    if (!endpoint) continue;

    const paths = flattenSchema(endpoint.responseSchema, `${step.id}.response`);
    variables.push(...paths);
  }
  return variables;
}

function flattenSchema(schema: Record<string, any>, prefix: string): string[] {
  const paths: string[] = [];
  if (!schema || typeof schema !== "object") return paths;

  if (schema.type === "object" && schema.properties) {
    for (const [key, value] of Object.entries(schema.properties)) {
      const fullPath = `${prefix}.${key}`;
      paths.push(fullPath);
      if (typeof value === "object" && value !== null) {
        paths.push(...flattenSchema(value as Record<string, any>, fullPath));
      }
    }
  } else if (schema.type === "array" && schema.items) {
    paths.push(`${prefix}[0]`);
    if (typeof schema.items === "object") {
      paths.push(...flattenSchema(schema.items as Record<string, any>, `${prefix}[0]`));
    }
  }

  return paths;
}

export function formatVariable(
  variable: string,
  steps: { id: string; name: string }[]
): string {
  // Match {{stepId.category.path}} where category can be response, headers, queryParams
  const match = variable.match(/^\{\{([^.]+)\.(\w+)\.(.+)\}\}$/);
  if (!match) return variable;

  const [, stepId, category, fieldPath] = match;
  const step = steps.find((s) => s.id === stepId);
  const stepName = step?.name ?? stepId.slice(0, 8);

  // Convert "menus.0.uid" to "menus[0].uid"
  const displayPath = fieldPath.replace(/\.(\d+)/g, "[$1]");
  const prefix = category === "response" ? "" : `${category}.`;

  return `${stepName} → ${prefix}${displayPath}`;
}
