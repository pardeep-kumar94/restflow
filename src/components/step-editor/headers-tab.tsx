"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { KeyValueRow } from "./key-value-row";
import { VariablePicker } from "./variable-picker";
import { Button } from "@/components/common/button";

interface Entry {
  id: string;
  key: string;
  value: string;
}

interface HeadersTabProps {
  headers: Record<string, string>;
  onChange: (headers: Record<string, string>) => void;
  stepId: string;
}

function toEntries(obj: Record<string, string>): Entry[] {
  return Object.entries(obj).map(([key, value]) => ({
    id: crypto.randomUUID(),
    key,
    value,
  }));
}

function toRecord(entries: Entry[]): Record<string, string> {
  const record: Record<string, string> = {};
  for (const entry of entries) {
    if (entry.key.trim()) {
      record[entry.key] = entry.value;
    }
  }
  return record;
}

export function HeadersTab({ headers, onChange, stepId }: HeadersTabProps) {
  const [entries, setEntries] = useState<Entry[]>(() => toEntries(headers));
  const selfUpdate = useRef(false);

  const parentKeys = Object.keys(headers).sort().join(",");
  useEffect(() => {
    if (selfUpdate.current) {
      selfUpdate.current = false;
      return;
    }
    setEntries(toEntries(headers));
  }, [parentKeys]);

  const update = useCallback((newEntries: Entry[]) => {
    selfUpdate.current = true;
    setEntries(newEntries);
    onChange(toRecord(newEntries));
  }, [onChange]);

  return (
    <div className="space-y-2">
      {entries.map((entry, i) => (
        <KeyValueRow
          key={entry.id}
          keyName={entry.key}
          value={entry.value}
          onKeyChange={(newKey) => {
            const updated = [...entries];
            updated[i] = { ...entry, key: newKey };
            update(updated);
          }}
          onValueChange={(newValue) => {
            const updated = [...entries];
            updated[i] = { ...entry, value: newValue };
            update(updated);
          }}
          onRemove={() => update(entries.filter((_, j) => j !== i))}
          variablePicker={
            <VariablePicker
              stepId={stepId}
              onSelect={(variable) => {
                const updated = [...entries];
                updated[i] = { ...entry, value: entry.value + variable };
                update(updated);
              }}
            />
          }
        />
      ))}
      <Button variant="ghost" onClick={() => update([...entries, { id: crypto.randomUUID(), key: "", value: "" }])}>
        + Add Header
      </Button>
    </div>
  );
}
