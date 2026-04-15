import type {
  Workflow,
  WorkflowNode,
  StepResult,
  ExecutionContext,
  APIEndpoint,
  StepSelections,
} from "@/types";
import { resolveVariables, resolveObjectVariables } from "./variable";
import { getExecutionOrder, resolveConnectionMappings } from "./graph-utils";

interface ExecutionCallbacks {
  onStepStart: (stepId: string) => void;
  onStepComplete: (stepId: string, result: StepResult) => void;
  onError: (stepId: string, error: string) => void;
  onPauseForAssistance?: (
    stepId: string,
    result: StepResult,
    targetNodeIds: string[]
  ) => Promise<StepSelections | null>;
}

export async function executeWorkflow(
  workflow: Workflow,
  endpoints: APIEndpoint[],
  callbacks: ExecutionCallbacks
): Promise<ExecutionContext> {
  const context: ExecutionContext = { results: {}, variables: {}, stepConfigs: {}, stageStatuses: {}, userSelections: {}, userOverrides: {} };

  let waves: WorkflowNode[][];
  try {
    waves = getExecutionOrder(workflow.nodes, workflow.connections);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Invalid graph";
    if (workflow.nodes.length > 0) {
      callbacks.onError(workflow.nodes[0].id, msg);
    }
    return context;
  }

  for (const wave of waves) {
    for (const node of wave) {
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
        callbacks.onError(node.id, errorResult.error!);
        return context;
      }

      // Apply connection mappings from incoming connections
      const connMappings = resolveConnectionMappings(
        node.id,
        workflow.connections,
        context
      );

      const mergedNode: WorkflowNode = {
        ...node,
        headers: { ...node.headers, ...connMappings.headers },
        queryParams: { ...node.queryParams, ...connMappings.queryParams },
      };

      if (Object.keys(connMappings.bodyOverrides).length > 0) {
        let existingBody: Record<string, unknown> = {};
        if (node.body) {
          try { existingBody = JSON.parse(node.body); } catch { /* keep empty */ }
        }
        const merged = { ...existingBody, ...connMappings.bodyOverrides };
        mergedNode.body = JSON.stringify(merged, null, 2);
      }

      const result = await executeNode(mergedNode, endpoint, context);
      context.results[node.id] = result;
      context.variables[node.id] = result.response;

      context.stepConfigs[node.id] = {
        headers: mergedNode.headers,
        queryParams: mergedNode.queryParams,
        body: mergedNode.body,
      };

      if (result.error) {
        callbacks.onStepComplete(node.id, result);
        callbacks.onError(node.id, result.error);
        return context;
      }

      callbacks.onStepComplete(node.id, result);

      // UI assistance pause
      if (node.uiAssistance && callbacks.onPauseForAssistance) {
        const targetNodeIds = workflow.connections
          .filter((c) => c.sourceNodeId === node.id)
          .map((c) => c.targetNodeId);

        const selections = await callbacks.onPauseForAssistance(
          node.id,
          result,
          targetNodeIds
        );

        if (selections === null) {
          return context;
        }

        // Apply selections to connected target nodes
        for (const targetId of targetNodeIds) {
          const targetNode = workflow.nodes.find((n) => n.id === targetId);
          if (!targetNode) continue;
          if (Object.keys(selections.headers).length > 0) {
            targetNode.headers = { ...targetNode.headers, ...selections.headers };
          }
          if (Object.keys(selections.queryParams).length > 0) {
            targetNode.queryParams = { ...targetNode.queryParams, ...selections.queryParams };
          }
          if (selections.body) {
            targetNode.body = selections.body;
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

    const base = endpoint.baseUrl?.replace(/\/+$/, "") ?? "";
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
        stepId: node.id,
        status: 0,
        statusText: "Network Error",
        response: null,
        headers: {},
        duration,
        url: resolvedUrl,
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
      stepId: node.id,
      status: 0,
      statusText: "Network Error",
      response: null,
      headers: {},
      duration,
      url: resolvedUrl,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
