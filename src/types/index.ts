export interface APIEndpoint {
  id: string;
  path: string;
  method: string;
  summary: string;
  requestSchema: Record<string, any>;
  responseSchema: Record<string, any>;
  parameters: any[];
  tags: string[];
  baseUrl: string;
  sourceSpec: string;
}

export interface ConnectionMapping {
  targetField: string;
  targetLocation: "header" | "query" | "body";
  value: string;
  sourceField?: string;
}

export interface NodeConnection {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  fieldMappings: ConnectionMapping[];
}

export interface Section {
  id: string;
  name: string;
  order: number;
  bounds: { x: number; y: number; width: number; height: number };
  color: string;
}

export interface WorkflowNode {
  id: string;
  name: string;
  endpointId: string;
  urlOverride: string;
  headers: Record<string, string>;
  queryParams: Record<string, string>;
  body: string;
  uiAssistance: boolean;
  position: { x: number; y: number };
  stage: number;
  sectionId?: string;
}

export interface Workflow {
  id: string;
  name: string;
  nodes: WorkflowNode[];
  connections: NodeConnection[];
  sections: Section[];
  swaggerSource: string;
  baseUrl: string;
}

export interface StepResult {
  stepId: string;
  status: number;
  statusText: string;
  response: any;
  headers: Record<string, string>;
  duration: number;
  error?: string;
  url?: string;
}

export type StageStatus = 'pending' | 'running' | 'pass' | 'fail';

export interface ExecutionContext {
  results: Record<string, StepResult>;
  variables: Record<string, any>;
  stepConfigs: Record<string, {
    headers: Record<string, string>;
    queryParams: Record<string, string>;
    body: string;
  }>;
  stageStatuses: Record<string, StageStatus>;
  userSelections: Record<string, unknown>;
  userOverrides: Record<string, Record<string, unknown>>;
}

export interface StepSelections {
  headers: Record<string, string>;
  queryParams: Record<string, string>;
  body: string;
}
