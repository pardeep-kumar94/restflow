import { create } from "zustand";
import type {
  APIEndpoint,
  Workflow,
  WorkflowNode,
  NodeConnection,
  ConnectionMapping,
  StepResult,
  ExecutionContext,
  StageStatus,
  Section,
} from "@/types";
import { loadFromStorage, saveToStorage } from "@/lib/storage";
import { resolveConnectionMappings } from "@/lib/graph-utils";
import { resolveVariables, resolveObjectVariables } from "@/lib/variable";
import { extractPathParams } from "@/lib/schema-utils";

interface WorkflowState {
  endpoints: APIEndpoint[];
  setEndpoints: (endpoints: APIEndpoint[]) => void;
  appendEndpoints: (endpoints: APIEndpoint[]) => void;
  updateBaseUrlForSource: (sourceSpec: string, newBaseUrl: string) => void;
  workflow: Workflow;
  setWorkflowName: (name: string) => void;
  setSwaggerSource: (source: string) => void;
  setBaseUrl: (url: string) => void;
  addNode: (node: WorkflowNode) => void;
  removeNode: (nodeId: string) => void;
  updateNode: (nodeId: string, updates: Partial<WorkflowNode>) => void;
  updateNodePosition: (nodeId: string, position: { x: number; y: number }) => void;
  addConnection: (connection: NodeConnection) => void;
  removeConnection: (connectionId: string) => void;
  updateConnectionMappings: (connectionId: string, mappings: ConnectionMapping[]) => void;
  selectedNodeId: string | null;
  selectNode: (nodeId: string | null) => void;
  selectedConnectionId: string | null;
  selectConnection: (connectionId: string | null) => void;
  executionContext: ExecutionContext | null;
  isExecuting: boolean;
  setStepResult: (stepId: string, result: StepResult) => void;
  startExecution: () => void;
  stopExecution: () => void;
  loadState: () => void;
  appMode: 'design' | 'execute';
  setAppMode: (mode: 'design' | 'execute') => void;
  setStageStatus: (stage: string, status: StageStatus) => void;
  addSection: (name: string, bounds: { x: number; y: number; width: number; height: number }, color: string) => string;
  removeSection: (sectionId: string) => void;
  renameSection: (sectionId: string, name: string) => void;
  reorderSection: (sectionId: string, newOrder: number) => void;
  assignNodeToSection: (nodeId: string, sectionId: string) => void;
  updateSectionBounds: (sectionId: string, bounds: { x: number; y: number; width: number; height: number }) => void;
  sectionToolActive: boolean;
  setSectionToolActive: (active: boolean) => void;
  setUserSelection: (key: string, value: unknown) => void;
  setUserOverride: (nodeId: string, field: string, value: unknown) => void;
  runNode: (nodeId: string) => Promise<void>;
  initExecution: () => void;
  globalHeaders: Record<string, string>;
  setGlobalHeaders: (headers: Record<string, string>) => void;
  customVariables: Record<string, string>;
  setCustomVariables: (vars: Record<string, string>) => void;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const emptyWorkflow: Workflow = {
  id: generateId(),
  name: "Untitled Workflow",
  nodes: [],
  connections: [],
  sections: [],
  swaggerSource: "",
  baseUrl: "",
};

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  endpoints: [],
  setEndpoints: (endpoints) => {
    set({ endpoints });
    saveToStorage("endpoints", endpoints);
  },
  appendEndpoints: (newEndpoints) => {
    set((s) => {
      const existing = new Set(s.endpoints.map((e) => `${e.method}::${e.path}::${e.baseUrl}`));
      const toAdd = newEndpoints.filter((e) => !existing.has(`${e.method}::${e.path}::${e.baseUrl}`));
      const merged = [...s.endpoints, ...toAdd];
      saveToStorage("endpoints", merged);
      return { endpoints: merged };
    });
  },
  updateBaseUrlForSource: (sourceSpec, newBaseUrl) => {
    set((s) => {
      const cleaned = newBaseUrl.replace(/\/+$/, "");
      const endpoints = s.endpoints.map((e) =>
        e.sourceSpec === sourceSpec ? { ...e, baseUrl: cleaned } : e
      );
      saveToStorage("endpoints", endpoints);
      return { endpoints };
    });
  },

  workflow: { ...emptyWorkflow },
  setWorkflowName: (name) => {
    set((s) => {
      const workflow = { ...s.workflow, name };
      saveToStorage("workflows", [workflow]);
      return { workflow };
    });
  },
  setSwaggerSource: (source) => {
    set((s) => {
      const workflow = { ...s.workflow, swaggerSource: source };
      saveToStorage("workflows", [workflow]);
      return { workflow };
    });
  },
  setBaseUrl: (url) => {
    set((s) => {
      const workflow = { ...s.workflow, baseUrl: url.replace(/\/+$/, "") };
      saveToStorage("workflows", [workflow]);
      return { workflow };
    });
  },

  addNode: (node) => {
    set((s) => {
      const nodeWithStage = { ...node, stage: node.stage ?? 1 };
      const nodes = [...s.workflow.nodes, nodeWithStage];
      const workflow = { ...s.workflow, nodes };
      saveToStorage("workflows", [workflow]);
      return { workflow, selectedNodeId: nodeWithStage.id };
    });
  },
  removeNode: (nodeId) => {
    set((s) => {
      const nodes = s.workflow.nodes.filter((n) => n.id !== nodeId);
      const connections = s.workflow.connections.filter(
        (c) => c.sourceNodeId !== nodeId && c.targetNodeId !== nodeId
      );
      const workflow = { ...s.workflow, nodes, connections };
      saveToStorage("workflows", [workflow]);
      return {
        workflow,
        selectedNodeId: s.selectedNodeId === nodeId ? null : s.selectedNodeId,
      };
    });
  },
  updateNode: (nodeId, updates) => {
    set((s) => {
      const nodes = s.workflow.nodes.map((n) =>
        n.id === nodeId ? { ...n, ...updates } : n
      );
      const workflow = { ...s.workflow, nodes };
      saveToStorage("workflows", [workflow]);
      return { workflow };
    });
  },
  updateNodePosition: (nodeId, position) => {
    set((s) => {
      const nodes = s.workflow.nodes.map((n) =>
        n.id === nodeId ? { ...n, position } : n
      );
      const workflow = { ...s.workflow, nodes };
      saveToStorage("workflows", [workflow]);
      return { workflow };
    });
  },

  addConnection: (connection) => {
    set((s) => {
      const connections = [...s.workflow.connections, connection];
      const workflow = { ...s.workflow, connections };
      saveToStorage("workflows", [workflow]);
      return { workflow };
    });
  },
  removeConnection: (connectionId) => {
    set((s) => {
      const connections = s.workflow.connections.filter((c) => c.id !== connectionId);
      const workflow = { ...s.workflow, connections };
      saveToStorage("workflows", [workflow]);
      return { workflow };
    });
  },
  updateConnectionMappings: (connectionId, mappings) => {
    set((s) => {
      const connections = s.workflow.connections.map((c) =>
        c.id === connectionId ? { ...c, fieldMappings: mappings } : c
      );
      const workflow = { ...s.workflow, connections };
      saveToStorage("workflows", [workflow]);
      return { workflow };
    });
  },

  selectedNodeId: null,
  selectNode: (nodeId) => set({ selectedNodeId: nodeId, selectedConnectionId: null }),
  selectedConnectionId: null,
  selectConnection: (connectionId) => set({ selectedConnectionId: connectionId, selectedNodeId: null }),

  executionContext: null,
  isExecuting: false,
  setStepResult: (stepId, result) => {
    set((s) => {
      const prev = s.executionContext ?? { results: {}, variables: {}, stepConfigs: {}, stageStatuses: {}, userSelections: {}, userOverrides: {} };
      return {
        executionContext: {
          ...prev,
          results: { ...prev.results, [stepId]: result },
          variables: { ...prev.variables, [stepId]: result.response },
        },
      };
    });
  },
  startExecution: () =>
    set((s) => ({
      isExecuting: true,
      executionContext: {
        results: {},
        variables: {},
        stepConfigs: {},
        stageStatuses: {},
        userSelections: { ...(s.executionContext?.userSelections ?? {}) },
        userOverrides: { ...(s.executionContext?.userOverrides ?? {}) },
      },
    })),
  stopExecution: () => set({ isExecuting: false }),
  appMode: 'design',
  setAppMode: (mode) => set({ appMode: mode }),
  setStageStatus: (stage, status) => {
    set((s) => {
      const prev = s.executionContext ?? { results: {}, variables: {}, stepConfigs: {}, stageStatuses: {}, userSelections: {}, userOverrides: {} };
      return {
        executionContext: {
          ...prev,
          stageStatuses: { ...prev.stageStatuses, [stage]: status },
        },
      };
    });
  },
  sectionToolActive: false,
  setSectionToolActive: (active) => set({ sectionToolActive: active }),
  addSection: (name, bounds, color) => {
    const id = generateId();
    const state = get();
    const maxOrder = state.workflow.sections.reduce((max, sec) => Math.max(max, sec.order), 0);
    const section: Section = { id, name, order: maxOrder + 1, bounds, color };
    // Auto-assign nodes inside the rectangle
    const nodes = state.workflow.nodes.map((n) => {
      const cx = n.position.x + 80; // center of node (~160px wide)
      const cy = n.position.y + 35; // center of node (~70px tall)
      if (cx >= bounds.x && cx <= bounds.x + bounds.width && cy >= bounds.y && cy <= bounds.y + bounds.height) {
        return { ...n, sectionId: id };
      }
      return n;
    });
    const workflow = { ...state.workflow, sections: [...state.workflow.sections, section], nodes };
    saveToStorage("workflows", [workflow]);
    set({ workflow });
    return id;
  },
  removeSection: (sectionId) => {
    set((s) => {
      const workflow = {
        ...s.workflow,
        sections: s.workflow.sections.filter((sec) => sec.id !== sectionId),
        nodes: s.workflow.nodes.map((n) => n.sectionId === sectionId ? { ...n, sectionId: undefined } : n),
      };
      saveToStorage("workflows", [workflow]);
      return { workflow };
    });
  },
  renameSection: (sectionId, name) => {
    set((s) => {
      const workflow = {
        ...s.workflow,
        sections: s.workflow.sections.map((sec) => sec.id === sectionId ? { ...sec, name } : sec),
      };
      saveToStorage("workflows", [workflow]);
      return { workflow };
    });
  },
  reorderSection: (sectionId, newOrder) => {
    set((s) => {
      const workflow = {
        ...s.workflow,
        sections: s.workflow.sections.map((sec) => sec.id === sectionId ? { ...sec, order: newOrder } : sec),
      };
      saveToStorage("workflows", [workflow]);
      return { workflow };
    });
  },
  assignNodeToSection: (nodeId, sectionId) => {
    set((s) => {
      const workflow = {
        ...s.workflow,
        nodes: s.workflow.nodes.map((n) => n.id === nodeId ? { ...n, sectionId } : n),
      };
      saveToStorage("workflows", [workflow]);
      return { workflow };
    });
  },
  updateSectionBounds: (sectionId, bounds) => {
    set((s) => {
      const workflow = {
        ...s.workflow,
        sections: s.workflow.sections.map((sec) => sec.id === sectionId ? { ...sec, bounds } : sec),
      };
      saveToStorage("workflows", [workflow]);
      return { workflow };
    });
  },

  setUserSelection: (key, value) => {
    set((s) => {
      const prev = s.executionContext ?? { results: {}, variables: {}, stepConfigs: {}, stageStatuses: {}, userSelections: {}, userOverrides: {} };
      return {
        executionContext: {
          ...prev,
          userSelections: { ...prev.userSelections, [key]: value },
        },
      };
    });
  },
  setUserOverride: (nodeId, field, value) => {
    set((s) => {
      const prev = s.executionContext ?? { results: {}, variables: {}, stepConfigs: {}, stageStatuses: {}, userSelections: {}, userOverrides: {} };
      const nodeOverrides = prev.userOverrides[nodeId] ?? {};
      return {
        executionContext: {
          ...prev,
          userOverrides: {
            ...prev.userOverrides,
            [nodeId]: { ...nodeOverrides, [field]: value },
          },
        },
      };
    });
  },

  globalHeaders: {},
  setGlobalHeaders: (headers) => set({ globalHeaders: headers }),
  customVariables: {},
  setCustomVariables: (vars) => set({ customVariables: vars }),

  initExecution: () => {
    set((s) => ({
      appMode: "execute" as const,
      executionContext: s.executionContext ?? {
        results: {},
        variables: {},
        stepConfigs: {},
        stageStatuses: {},
        userSelections: {},
        userOverrides: {},
      },
    }));
  },

  runNode: async (nodeId: string) => {
    const state = get();
    const { workflow, endpoints } = state;
    const node = workflow.nodes.find((n) => n.id === nodeId);
    if (!node) return;
    const endpoint = endpoints.find((e) => e.id === node.endpointId);
    if (!endpoint) return;

    // Ensure execution context exists
    const prev = state.executionContext ?? {
      results: {}, variables: {}, stepConfigs: {},
      stageStatuses: {}, userSelections: {}, userOverrides: {},
    };
    set({ isExecuting: true, executionContext: prev });

    const context: ExecutionContext = { ...prev };

    // Resolve connection mappings from upstream
    const connMappings = resolveConnectionMappings(node.id, workflow.connections, context);

    // Collect upstream user selections → autoQueryParams / autoBodyOverrides
    const upstreamNodeIds = workflow.connections
      .filter((c) => c.targetNodeId === node.id)
      .map((c) => c.sourceNodeId);

    const url = node.urlOverride || endpoint.path;
    const pathParams = extractPathParams(url);
    const queryParamNames = new Set(
      (endpoint.parameters ?? []).filter((p: any) => p.in === "query").map((p: any) => p.name)
    );
    const bodyFieldNames = new Set(Object.keys(endpoint.requestSchema?.properties ?? {}));

    const autoQueryParams: Record<string, string> = {};
    const autoBodyOverrides: Record<string, unknown> = {};

    // Propagate upstream params
    for (const upId of upstreamNodeIds) {
      const upConfig = context.stepConfigs[upId];
      if (upConfig) {
        for (const [paramName, paramValue] of Object.entries(upConfig.queryParams)) {
          if (pathParams.includes(paramName) && !autoQueryParams[paramName]) {
            autoQueryParams[paramName] = String(paramValue);
          } else if (queryParamNames.has(paramName) && !autoQueryParams[paramName]) {
            autoQueryParams[paramName] = String(paramValue);
          }
        }
      }
    }

    // Apply user selections (from array pickers)
    for (const [selKey, selValue] of Object.entries(context.userSelections)) {
      for (const upId of upstreamNodeIds) {
        const prefix = `${upId}.response.`;
        if (!selKey.startsWith(prefix)) continue;
        const rest = selKey.slice(prefix.length);
        const arrowIdx = rest.indexOf("->");
        const targetParam = arrowIdx !== -1 ? rest.slice(arrowIdx + 2) : rest;

        if (pathParams.includes(targetParam)) {
          autoQueryParams[targetParam] = String(selValue);
        } else if (queryParamNames.has(targetParam)) {
          autoQueryParams[targetParam] = String(selValue);
        } else if (bodyFieldNames.has(targetParam)) {
          autoBodyOverrides[targetParam] = selValue;
        } else {
          const matched = pathParams.find(
            (p) => p.toLowerCase() === targetParam.toLowerCase() ||
                   p.toLowerCase().includes(targetParam.toLowerCase()) ||
                   targetParam.toLowerCase().includes(p.toLowerCase())
          );
          if (matched) autoQueryParams[matched] = String(selValue);
        }
      }
    }

    // Apply user overrides from InputFields
    const overrides = context.userOverrides[node.id] ?? {};
    const mergedHeaders = { ...state.globalHeaders, ...node.headers, ...connMappings.headers };
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

    // Body
    let bodyStr = node.body;
    const allBodyOverrides = { ...connMappings.bodyOverrides, ...autoBodyOverrides };
    const bodyUserOverrides: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(overrides)) {
      if (key.startsWith("body.")) bodyUserOverrides[key.slice(5)] = val;
    }
    if (Object.keys(allBodyOverrides).length > 0 || Object.keys(bodyUserOverrides).length > 0) {
      let existingBody: Record<string, unknown> = {};
      if (node.body) {
        try { existingBody = JSON.parse(node.body); } catch { /* empty */ }
      }
      bodyStr = JSON.stringify({ ...existingBody, ...allBodyOverrides, ...bodyUserOverrides }, null, 2);
    }

    const mergedNode: WorkflowNode = { ...node, headers: mergedHeaders, queryParams: mergedQueryParams, body: bodyStr };

    // Execute the actual HTTP call
    const startTime = performance.now();
    let result: StepResult;
    try {
      // Inject custom variables into context for resolution
      const ctxWithVars = { ...context, customVariables: state.customVariables } as any;
      const headers = resolveObjectVariables(mergedNode.headers, ctxWithVars);
      const queryParams = resolveObjectVariables(mergedNode.queryParams, ctxWithVars);
      const body = mergedNode.body ? resolveVariables(mergedNode.body, ctxWithVars) : undefined;

      const base = (endpoint.baseUrl ?? "").replace(/\/+$/, "");
      let fetchUrl: string;
      if (mergedNode.urlOverride) {
        fetchUrl = resolveVariables(mergedNode.urlOverride, ctxWithVars);
      } else {
        fetchUrl = endpoint.path;
        if (base && !fetchUrl.startsWith("http")) {
          fetchUrl = `${base}${fetchUrl.startsWith("/") ? "" : "/"}${fetchUrl}`;
        }
      }
      fetchUrl = fetchUrl.replace(/\{(\w+)\}/g, (_, p) => queryParams[p] ?? `{${p}}`);

      const rawPath = mergedNode.urlOverride || endpoint.path;
      const qEntries = Object.entries(queryParams).filter(([k]) => !rawPath.includes(`{${k}}`));
      if (qEntries.length > 0) {
        fetchUrl += (fetchUrl.includes("?") ? "&" : "?") + new URLSearchParams(qEntries).toString();
      }

      const reqHeaders: Record<string, string> = { "Content-Type": "application/json", ...headers };
      let parsedBody: unknown;
      if (body && !["GET", "HEAD"].includes(endpoint.method)) {
        try { parsedBody = JSON.parse(body); } catch { parsedBody = body; }
      }

      const proxyResponse = await fetch("/api/proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method: endpoint.method, url: fetchUrl, headers: reqHeaders, body: parsedBody }),
      });
      const duration = Math.round(performance.now() - startTime);
      const proxyData = await proxyResponse.json();

      if (proxyData.error && proxyData.status === 0) {
        result = { stepId: node.id, status: 0, statusText: "Network Error", response: null, headers: {}, duration, url: fetchUrl, error: proxyData.error };
      } else {
        result = {
          stepId: node.id, status: proxyData.status, statusText: proxyData.statusText ?? "",
          response: proxyData.body, headers: proxyData.headers ?? {}, duration, url: fetchUrl,
          error: proxyData.status >= 400 ? `HTTP ${proxyData.status}: ${proxyData.statusText ?? "Error"}` : undefined,
        };
      }
    } catch (err) {
      const duration = Math.round(performance.now() - startTime);
      result = { stepId: node.id, status: 0, statusText: "Network Error", response: null, headers: {}, duration, error: err instanceof Error ? err.message : "Unknown error" };
    }

    // Save result to store
    set((s) => {
      const prev2 = s.executionContext ?? { results: {}, variables: {}, stepConfigs: {}, stageStatuses: {}, userSelections: {}, userOverrides: {} };
      return {
        isExecuting: false,
        executionContext: {
          ...prev2,
          results: { ...prev2.results, [node.id]: result },
          variables: { ...prev2.variables, [node.id]: result.response },
          stepConfigs: {
            ...prev2.stepConfigs,
            [node.id]: { headers: mergedHeaders, queryParams: mergedQueryParams, body: bodyStr },
          },
        },
      };
    });
  },

  loadState: () => {
    const workflows = loadFromStorage<any[]>("workflows", []);
    const rawEndpoints = loadFromStorage<APIEndpoint[]>("endpoints", []);
    const endpoints = rawEndpoints.map((e) => ({
      ...e,
      baseUrl: e.baseUrl ?? (workflows.length > 0 ? workflows[0].baseUrl : ""),
      sourceSpec: e.sourceSpec ?? "legacy",
    }));
    if (workflows.length > 0) {
      const raw = workflows[0];
      // Migrate from old steps[] format
      if (raw.steps && !raw.nodes) {
        raw.nodes = raw.steps.map((step: any, i: number) => ({
          id: step.id,
          name: step.name,
          endpointId: step.endpointId,
          urlOverride: step.urlOverride ?? "",
          headers: step.headers ?? {},
          queryParams: step.queryParams ?? {},
          body: step.body ?? "",
          uiAssistance: step.uiAssistance ?? false,
          position: { x: i * 220, y: 100 },
        }));
        raw.connections = [];
        delete raw.steps;
        saveToStorage("workflows", [raw]);
      }
      // Migrate nodes without stage property
      if (raw.nodes) {
        let needsSave = false;
        raw.nodes = raw.nodes.map((node: any) => {
          if (node.stage == null) {
            needsSave = true;
            return { ...node, stage: 1 };
          }
          return node;
        });
        if (needsSave) {
          saveToStorage("workflows", [raw]);
        }
      }
      // Migrate: add sections array if missing
      if (!raw.sections) {
        raw.sections = [];
        saveToStorage("workflows", [raw]);
      }
      set({ workflow: raw as Workflow, endpoints });
    } else if (endpoints.length > 0) {
      set({ endpoints });
    }
  },
}));
