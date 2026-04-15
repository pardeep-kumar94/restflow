import type {
  Workflow,
  WorkflowNode,
  APIEndpoint,
  StepResult,
  ExecutionContext,
  StageStatus,
} from "@/types";
import { resolveVariables, resolveObjectVariables } from "./variable";
import { resolveConnectionMappings } from "./graph-utils";
import { extractPathParams } from "./schema-utils";

interface StageExecutionCallbacks {
  onStageStart: (stageNumber: number) => void;
  onStageComplete: (stageNumber: number, status: StageStatus) => void;
  onStepStart: (stepId: string) => void;
  onStepComplete: (stepId: string, result: StepResult) => void;
  onArraySelection: (
    stepId: string,
    result: StepResult,
    downstreamNodeIds: string[]
  ) => Promise<Record<string, unknown> | null>;
  /** Called before each node executes to get the latest user overrides from the UI */
  getOverrides?: () => Record<string, Record<string, unknown>>;
}

export async function executeByStages(
  workflow: Workflow,
  endpoints: APIEndpoint[],
  callbacks: StageExecutionCallbacks,
  existingSelections?: Record<string, unknown>,
  existingOverrides?: Record<string, Record<string, unknown>>
): Promise<ExecutionContext> {
  const context: ExecutionContext = {
    results: {},
    variables: {},
    stepConfigs: {},
    stageStatuses: {},
    userSelections: { ...(existingSelections ?? {}) },
    userOverrides: { ...(existingOverrides ?? {}) },
  };

  // Group nodes by stage
  const stageMap = new Map<number, WorkflowNode[]>();
  for (const node of workflow.nodes) {
    const stage = node.stage ?? 1;
    if (!stageMap.has(stage)) stageMap.set(stage, []);
    stageMap.get(stage)!.push(node);
  }

  const stageNumbers = [...stageMap.keys()].sort((a, b) => a - b);

  for (const stageNum of stageNumbers) {
    const nodes = stageMap.get(stageNum)!;
    callbacks.onStageStart(stageNum);
    context.stageStatuses[stageNum] = "running";

    // Execute all nodes in this stage in parallel
    const results = await Promise.all(
      nodes.map(async (node) => {
        callbacks.onStepStart(node.id);
        const endpoint = endpoints.find((e) => e.id === node.endpointId);
        if (!endpoint) {
          const errorResult: StepResult = {
            stepId: node.id,
            status: 0,
            statusText: "Error",
            response: null,
            headers: {},
            duration: 0,
            error: `Endpoint not found: ${node.endpointId}`,
          };
          context.results[node.id] = errorResult;
          callbacks.onStepComplete(node.id, errorResult);
          return errorResult;
        }

        // Apply connection mappings
        const connMappings = resolveConnectionMappings(
          node.id,
          workflow.connections,
          context
        );

        // Auto-inject values from upstream nodes into this node's params
        const upstreamConns = workflow.connections.filter((c) => c.targetNodeId === node.id);
        const upstreamNodeIds = upstreamConns.map((c) => c.sourceNodeId);

        const url = node.urlOverride || endpoint.path;
        const pathParams = extractPathParams(url);
        const queryParamNames = new Set(
          (endpoint.parameters ?? [])
            .filter((p: any) => p.in === "query")
            .map((p: any) => p.name)
        );
        const bodyFieldNames = new Set(
          Object.keys(endpoint.requestSchema?.properties ?? {})
        );

        const autoQueryParams: Record<string, string> = {};
        const autoBodyOverrides: Record<string, unknown> = {};

        // 1. Propagate upstream node's resolved params (e.g. outlet_slug from API A → API B)
        for (const upId of upstreamNodeIds) {
          const upConfig = context.stepConfigs[upId];
          if (upConfig) {
            // Copy matching path/query params from upstream
            for (const [paramName, paramValue] of Object.entries(upConfig.queryParams)) {
              if (pathParams.includes(paramName) && !autoQueryParams[paramName]) {
                autoQueryParams[paramName] = String(paramValue);
              } else if (queryParamNames.has(paramName) && !autoQueryParams[paramName]) {
                autoQueryParams[paramName] = String(paramValue);
              }
            }
          }
        }

        // 2. Apply user selections from array selectors
        // These use explicit mappings: "sourceField -> targetParam" stored as
        // "sourceNodeId.response.sourceField->targetParam" or just "sourceNodeId.response.fieldName"
        for (const [selKey, selValue] of Object.entries(context.userSelections)) {
          for (const upId of upstreamNodeIds) {
            const prefix = `${upId}.response.`;
            if (!selKey.startsWith(prefix)) continue;
            const rest = selKey.slice(prefix.length);

            // Check for explicit mapping: "sourceField->targetParam"
            const arrowIdx = rest.indexOf("->");
            let targetParam: string;
            if (arrowIdx !== -1) {
              targetParam = rest.slice(arrowIdx + 2);
            } else {
              targetParam = rest;
            }

            // Place value into the right location
            if (pathParams.includes(targetParam)) {
              autoQueryParams[targetParam] = String(selValue);
            } else if (queryParamNames.has(targetParam)) {
              autoQueryParams[targetParam] = String(selValue);
            } else if (bodyFieldNames.has(targetParam)) {
              autoBodyOverrides[targetParam] = selValue;
            } else {
              // Fuzzy: try to match against path params
              const matched = pathParams.find(
                (p) => p.toLowerCase() === targetParam.toLowerCase() ||
                       p.toLowerCase().includes(targetParam.toLowerCase()) ||
                       targetParam.toLowerCase().includes(p.toLowerCase())
              );
              if (matched) {
                autoQueryParams[matched] = String(selValue);
              }
            }
          }
        }

        // Fetch latest overrides from the UI (user may have typed values during a pause)
        if (callbacks.getOverrides) {
          const freshOverrides = callbacks.getOverrides();
          Object.assign(context.userOverrides, freshOverrides);
        }
        const overrides = context.userOverrides[node.id] ?? {};
        // User selections (autoQueryParams) take priority over connection-resolved values
        // because the user explicitly picked these from the array selector
        const mergedHeaders = { ...node.headers, ...connMappings.headers };
        const mergedQueryParams = {
          ...node.queryParams,
          ...connMappings.queryParams,
          ...autoQueryParams,
        };

        for (const [key, val] of Object.entries(overrides)) {
          const [loc, ...fieldParts] = key.split(".");
          const field = fieldParts.join(".");
          if (loc === "header") mergedHeaders[field] = String(val);
          else if (loc === "query" || loc === "path") mergedQueryParams[field] = String(val);
        }

        const mergedNode: WorkflowNode = {
          ...node,
          headers: mergedHeaders,
          queryParams: mergedQueryParams,
        };

        // Body merging
        let bodyStr = node.body;
        const allBodyOverrides = { ...connMappings.bodyOverrides, ...autoBodyOverrides };
        const bodyUserOverrides: Record<string, unknown> = {};
        for (const [key, val] of Object.entries(overrides)) {
          if (key.startsWith("body.")) {
            bodyUserOverrides[key.slice(5)] = val;
          }
        }
        if (Object.keys(allBodyOverrides).length > 0 || Object.keys(bodyUserOverrides).length > 0) {
          let existingBody: Record<string, unknown> = {};
          if (node.body) {
            try { existingBody = JSON.parse(node.body); } catch { /* keep empty */ }
          }
          const merged = { ...existingBody, ...allBodyOverrides, ...bodyUserOverrides };
          bodyStr = JSON.stringify(merged, null, 2);
        }
        mergedNode.body = bodyStr;

        const result = await executeNode(mergedNode, endpoint, context);
        context.results[node.id] = result;
        context.variables[node.id] = result.response;
        context.stepConfigs[node.id] = {
          headers: mergedNode.headers,
          queryParams: mergedNode.queryParams,
          body: mergedNode.body,
        };

        callbacks.onStepComplete(node.id, result);
        return result;
      })
    );

    const hasError = results.some((r) => r.error);
    const stageStatus: StageStatus = hasError ? "fail" : "pass";
    context.stageStatuses[stageNum] = stageStatus;
    callbacks.onStageComplete(stageNum, stageStatus);

    if (hasError) {
      for (const remaining of stageNumbers) {
        if (remaining > stageNum && !context.stageStatuses[remaining]) {
          context.stageStatuses[remaining] = "pending";
        }
      }
      break;
    }

    // Check for array responses that need user selection
    for (const node of nodes) {
      const result = context.results[node.id];
      if (!result || result.error) continue;

      const responseIsArray = Array.isArray(result.response);
      const hasArrayFields = !responseIsArray && result.response && typeof result.response === "object" &&
        Object.values(result.response).some(Array.isArray);

      if (responseIsArray || hasArrayFields) {
        const downstreamIds = workflow.connections
          .filter((c) => c.sourceNodeId === node.id)
          .map((c) => c.targetNodeId);

        if (downstreamIds.length > 0 && callbacks.onArraySelection) {
          const selections = await callbacks.onArraySelection(
            node.id,
            result,
            downstreamIds
          );
          if (selections) {
            // Prefix keys with nodeId.response. so resolveConnectionMappings can find them
            for (const [key, value] of Object.entries(selections)) {
              context.userSelections[`${node.id}.response.${key}`] = value;
            }
          }
        }
      }
    }
  }

  return context;
}

async function executeNode(
  node: WorkflowNode,
  endpoint: APIEndpoint,
  context: ExecutionContext
): Promise<StepResult> {
  const startTime = performance.now();
  let resolvedUrl = "";

  try {
    const headers = resolveObjectVariables(node.headers, context);
    const queryParams = resolveObjectVariables(node.queryParams, context);
    const body = node.body ? resolveVariables(node.body, context) : undefined;

    const base = (endpoint.baseUrl ?? "").replace(/\/+$/, "");
    let url: string;

    if (node.urlOverride) {
      url = resolveVariables(node.urlOverride, context);
    } else {
      url = endpoint.path;
      if (base && !url.startsWith("http")) {
        url = `${base}${url.startsWith("/") ? "" : "/"}${url}`;
      }
    }

    url = url.replace(/\{(\w+)\}/g, (_, paramName) => {
      return queryParams[paramName] ?? `{${paramName}}`;
    });

    const rawPath = node.urlOverride || endpoint.path;
    const queryEntries = Object.entries(queryParams).filter(
      ([key]) => !rawPath.includes(`{${key}}`)
    );
    if (queryEntries.length > 0) {
      const searchParams = new URLSearchParams(queryEntries);
      url += (url.includes("?") ? "&" : "?") + searchParams.toString();
    }

    resolvedUrl = url;

    const requestHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      ...headers,
    };

    let parsedBody: unknown = undefined;
    if (body && !["GET", "HEAD"].includes(endpoint.method)) {
      try {
        parsedBody = JSON.parse(body);
      } catch {
        parsedBody = body;
      }
    }

    const proxyResponse = await fetch("/api/proxy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        method: endpoint.method,
        url,
        headers: requestHeaders,
        body: parsedBody,
      }),
    });

    const duration = Math.round(performance.now() - startTime);
    const proxyData = await proxyResponse.json();

    if (proxyData.error && proxyData.status === 0) {
      return {
        stepId: node.id, status: 0, statusText: "Network Error",
        response: null, headers: {}, duration, url: resolvedUrl,
        error: proxyData.error,
      };
    }

    return {
      stepId: node.id,
      status: proxyData.status,
      statusText: proxyData.statusText ?? "",
      response: proxyData.body,
      headers: proxyData.headers ?? {},
      duration,
      url: resolvedUrl,
      error: proxyData.status >= 400 ? `HTTP ${proxyData.status}: ${proxyData.statusText ?? "Error"}` : undefined,
    };
  } catch (err) {
    const duration = Math.round(performance.now() - startTime);
    return {
      stepId: node.id, status: 0, statusText: "Network Error",
      response: null, headers: {}, duration, url: resolvedUrl,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
