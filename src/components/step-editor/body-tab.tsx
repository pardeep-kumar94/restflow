"use client";

import dynamic from "next/dynamic";
import { VariablePicker } from "./variable-picker";
import { useRef } from "react";

const Editor = dynamic(() => import("@monaco-editor/react").then((m) => m.default), {
  ssr: false,
  loading: () => (
    <div
      className="h-full flex items-center justify-center text-[12px]"
      style={{ color: "var(--text-secondary)" }}
    >
      Loading editor...
    </div>
  ),
});

interface BodyTabProps {
  body: string;
  onChange: (body: string) => void;
  stepId: string;
}

export function BodyTab({ body, onChange, stepId }: BodyTabProps) {
  const editorRef = useRef<any>(null);

  const handleInsertVariable = (variable: string) => {
    const editor = editorRef.current;
    if (editor) {
      const selection = editor.getSelection();
      const op = { range: selection, text: variable, forceMoveMarkers: true };
      editor.executeEdits("variable-picker", [op]);
    } else {
      onChange(body + variable);
    }
  };

  return (
    <div className="h-64 flex flex-col">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px]" style={{ color: "var(--text-secondary)" }}>
          Request Body (JSON)
        </span>
        <VariablePicker stepId={stepId} onSelect={handleInsertVariable} />
      </div>
      <div className="flex-1">
        <Editor
          height="100%"
          defaultLanguage="json"
          value={body}
          onChange={(value) => onChange(value ?? "")}
          onMount={(editor) => { editorRef.current = editor; }}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 11,
            lineNumbers: "off",
            scrollBeyondLastLine: false,
            wordWrap: "on",
            padding: { top: 8 },
            renderLineHighlight: "none",
            overviewRulerBorder: false,
            hideCursorInOverviewRuler: true,
            scrollbar: {
              verticalScrollbarSize: 6,
              horizontalScrollbarSize: 6,
            },
          }}
        />
      </div>
    </div>
  );
}
