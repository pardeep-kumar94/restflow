import SwaggerParser from "@apidevtools/swagger-parser";
import type { APIEndpoint } from "@/types";

interface OpenAPIPathItem {
  [method: string]: {
    summary?: string;
    tags?: string[];
    parameters?: any[];
    requestBody?: {
      content?: {
        [contentType: string]: {
          schema?: Record<string, any>;
        };
      };
    };
    responses?: {
      [statusCode: string]: {
        content?: {
          [contentType: string]: {
            schema?: Record<string, any>;
          };
        };
      };
    };
  };
}

const HTTP_METHODS = ["get", "post", "put", "patch", "delete", "head", "options"];

export interface ParseResult {
  endpoints: APIEndpoint[];
  baseUrl: string;
}

export async function parseSwagger(input: string | object, sourceSpec?: string): Promise<ParseResult> {
  const api = await SwaggerParser.dereference(input as any);
  const paths = (api as any).paths as Record<string, OpenAPIPathItem> | undefined;

  // Extract base URL from servers (OpenAPI 3.x) or host+basePath (Swagger 2.x)
  let baseUrl = "";
  const apiAny = api as any;
  if (apiAny.servers?.length > 0) {
    baseUrl = apiAny.servers[0].url ?? "";
  } else if (apiAny.host) {
    const scheme = apiAny.schemes?.[0] ?? "https";
    const basePath = apiAny.basePath ?? "";
    baseUrl = `${scheme}://${apiAny.host}${basePath}`;
  }
  // Remove trailing slash
  baseUrl = baseUrl.replace(/\/+$/, "");

  if (!paths) return { endpoints: [], baseUrl };

  const endpoints: APIEndpoint[] = [];

  for (const [path, pathItem] of Object.entries(paths)) {
    for (const method of HTTP_METHODS) {
      const operation = pathItem[method];
      if (!operation) continue;

      const requestSchema = extractRequestSchema(operation);
      const responseSchema = extractResponseSchema(operation);

      endpoints.push({
        id: `${method}-${path}`,
        path,
        method: method.toUpperCase(),
        summary: operation.summary ?? "",
        requestSchema,
        responseSchema,
        parameters: operation.parameters ?? [],
        tags: operation.tags ?? ["default"],
        baseUrl: baseUrl,
        sourceSpec: sourceSpec ?? "",
      });
    }
  }

  return { endpoints, baseUrl };
}

function extractRequestSchema(operation: any): Record<string, any> {
  const content = operation.requestBody?.content;
  if (!content) return {};
  const json = content["application/json"];
  return json?.schema ?? {};
}

function extractResponseSchema(operation: any): Record<string, any> {
  const responses = operation.responses;
  if (!responses) return {};
  const successResponse = responses["200"] ?? responses["201"] ?? Object.values(responses)[0];
  if (!successResponse) return {};
  const content = (successResponse as any).content;
  if (!content) return {};
  const json = content["application/json"];
  return json?.schema ?? {};
}
