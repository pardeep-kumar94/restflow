"use client";

import { useState } from "react";
import { Modal } from "@/components/common/modal";
import { Button } from "@/components/common/button";
import { parseSwagger } from "@/lib/parser";
import { useWorkflowStore } from "@/stores/workflow-store";
import type { APIEndpoint } from "@/types";

interface ImportModalProps {
  open: boolean;
  onClose: () => void;
}

type ImportStep = "input" | "mode" | "confirm";
type ImportMode = "replace" | "append";

export function ImportModal({ open, onClose }: ImportModalProps) {
  const [url, setUrl] = useState("");
  const [baseUrlOverride, setBaseUrlOverride] = useState("");
  const [detectedBaseUrl, setDetectedBaseUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<ImportStep>("input");
  const [importMode, setImportMode] = useState<ImportMode>("replace");
  const { endpoints, setEndpoints, appendEndpoints, setSwaggerSource, setBaseUrl } = useWorkflowStore();

  const [pendingEndpoints, setPendingEndpoints] = useState<APIEndpoint[]>([]);
  const [pendingSource, setPendingSource] = useState("");

  const handleParse = async (input: string | object, source: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await parseSwagger(input, source);
      setPendingEndpoints(result.endpoints);
      setPendingSource(source);
      setDetectedBaseUrl(result.baseUrl || null);
      setBaseUrlOverride(result.baseUrl || "");
      if (endpoints.length > 0) {
        setStep("mode");
      } else {
        setStep("confirm");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse API spec");
    } finally {
      setLoading(false);
    }
  };

  const handleModeSelect = () => {
    setStep("confirm");
  };

  const handleConfirm = () => {
    if (!baseUrlOverride.trim()) return;
    const stamped = pendingEndpoints.map((ep) => ({
      ...ep,
      baseUrl: baseUrlOverride.trim().replace(/\/+$/, ""),
      sourceSpec: pendingSource,
    }));
    if (importMode === "replace") {
      setEndpoints(stamped);
      setBaseUrl(baseUrlOverride.trim());
    } else {
      appendEndpoints(stamped);
    }
    setSwaggerSource(pendingSource);
    resetAndClose();
  };

  const resetAndClose = () => {
    setUrl("");
    setBaseUrlOverride("");
    setDetectedBaseUrl(null);
    setError(null);
    setStep("input");
    setImportMode("replace");
    setPendingEndpoints([]);
    setPendingSource("");
    onClose();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      await handleParse(parsed, file.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse file");
    }
  };

  return (
    <Modal open={open} onClose={resetAndClose} title="Import API Specification">
      {step === "input" && (
        <div className="space-y-4">
          <div>
            <label className="text-[11px] block mb-1" style={{ color: "var(--text-secondary)" }}>
              Swagger / OpenAPI URL
            </label>
            <div className="flex gap-2">
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://petstore.swagger.io/v2/swagger.json"
                className="flex-1 px-3 py-2 text-xs rounded outline-none"
                style={{
                  backgroundColor: "var(--bg-tertiary)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border)",
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleParse(url.trim(), url.trim());
                }}
              />
              <Button onClick={() => handleParse(url.trim(), url.trim())} disabled={loading || !url.trim()}>
                {loading ? "Parsing..." : "Import"}
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px" style={{ backgroundColor: "var(--border)" }} />
            <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>OR</span>
            <div className="flex-1 h-px" style={{ backgroundColor: "var(--border)" }} />
          </div>
          <div>
            <label className="text-[11px] block mb-1" style={{ color: "var(--text-secondary)" }}>
              Upload JSON File
            </label>
            <input
              type="file"
              accept=".json,.yaml,.yml"
              onChange={handleFileUpload}
              className="text-xs"
              style={{ color: "var(--text-secondary)" }}
            />
          </div>
          {error && (
            <p className="text-[12px] p-2 rounded" style={{
              color: "var(--accent-red)",
              backgroundColor: "color-mix(in srgb, var(--accent-red) 10%, transparent)",
            }}>
              {error}
            </p>
          )}
        </div>
      )}

      {step === "mode" && (
        <div className="space-y-4">
          <div
            className="p-3 rounded text-[12px]"
            style={{ backgroundColor: "var(--bg-tertiary)", border: "1px solid var(--border)" }}
          >
            <span style={{ color: "var(--accent-green)" }}>✓</span>{" "}
            <span style={{ color: "var(--text-primary)" }}>
              Found {pendingEndpoints.length} endpoints from {pendingSource}
            </span>
          </div>
          <div>
            <p className="text-[11px] mb-2" style={{ color: "var(--text-secondary)" }}>
              You already have {endpoints.length} endpoints loaded. How do you want to import?
            </p>
            <div className="space-y-2">
              <label
                className="flex items-center gap-2 p-2 rounded cursor-pointer text-[12px]"
                style={{
                  backgroundColor: importMode === "replace" ? "color-mix(in srgb, var(--accent-blue) 15%, transparent)" : "transparent",
                  border: `1px solid ${importMode === "replace" ? "var(--accent-blue)" : "var(--border)"}`,
                  color: "var(--text-primary)",
                }}
              >
                <input type="radio" name="importMode" checked={importMode === "replace"} onChange={() => setImportMode("replace")} className="accent-[var(--accent-blue)]" />
                <div>
                  <div className="font-bold">Replace all</div>
                  <div className="text-[10px]" style={{ color: "var(--text-secondary)" }}>Remove existing endpoints and import new ones</div>
                </div>
              </label>
              <label
                className="flex items-center gap-2 p-2 rounded cursor-pointer text-[12px]"
                style={{
                  backgroundColor: importMode === "append" ? "color-mix(in srgb, var(--accent-green) 15%, transparent)" : "transparent",
                  border: `1px solid ${importMode === "append" ? "var(--accent-green)" : "var(--border)"}`,
                  color: "var(--text-primary)",
                }}
              >
                <input type="radio" name="importMode" checked={importMode === "append"} onChange={() => setImportMode("append")} className="accent-[var(--accent-green)]" />
                <div>
                  <div className="font-bold">Append to existing</div>
                  <div className="text-[10px]" style={{ color: "var(--text-secondary)" }}>Keep current endpoints and add new ones alongside</div>
                </div>
              </label>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setStep("input")}>Back</Button>
            <Button variant="primary" onClick={handleModeSelect}>Next</Button>
          </div>
        </div>
      )}

      {step === "confirm" && (
        <div className="space-y-4">
          {endpoints.length === 0 && (
            <div className="p-3 rounded text-[12px]" style={{ backgroundColor: "var(--bg-tertiary)", border: "1px solid var(--border)" }}>
              <span style={{ color: "var(--accent-green)" }}>✓</span>{" "}
              <span style={{ color: "var(--text-primary)" }}>Found {pendingEndpoints.length} endpoints</span>
            </div>
          )}
          <div>
            <label className="text-[11px] block mb-1" style={{ color: "var(--text-secondary)" }}>
              Base URL {detectedBaseUrl ? "(auto-detected from spec)" : "(required)"}
            </label>
            <input
              value={baseUrlOverride}
              onChange={(e) => setBaseUrlOverride(e.target.value)}
              placeholder="https://api.example.com/v1"
              className="w-full px-3 py-2 text-xs rounded outline-none"
              style={{
                backgroundColor: "var(--bg-tertiary)",
                color: "var(--text-primary)",
                border: `1px solid ${baseUrlOverride.trim() ? "var(--border)" : "var(--accent-red)"}`,
              }}
            />
            <p className="text-[10px] mt-1" style={{ color: "var(--text-secondary)" }}>
              This is the domain your APIs will be called against. All endpoint paths will be appended to this URL.
            </p>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => endpoints.length > 0 ? setStep("mode") : setStep("input")}>Back</Button>
            <Button variant="primary" onClick={handleConfirm} disabled={!baseUrlOverride.trim()}>Confirm & Import</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
