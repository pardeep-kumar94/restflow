"use client";

import { useEffect, useRef } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center anim-fade-in"
      style={{ backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)" }}
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div
        className="rounded-xl w-full max-w-lg anim-scale-in overflow-hidden"
        style={{
          backgroundColor: "var(--bg-secondary)",
          border: "1px solid var(--border)",
          boxShadow: "0 24px 48px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.03)",
        }}
      >
        {/* Accent line */}
        <div
          style={{
            height: 2,
            background: "linear-gradient(90deg, var(--accent-blue), var(--accent-purple), var(--accent-pink))",
          }}
        />
        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
              {title}
            </h2>
            <button
              onClick={onClose}
              className="w-6 h-6 flex items-center justify-center rounded-md text-xs cursor-pointer transition-colors"
              style={{ color: "var(--text-secondary)", backgroundColor: "transparent" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "var(--bg-tertiary)";
                e.currentTarget.style.color = "var(--text-primary)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.color = "var(--text-secondary)";
              }}
            >
              ✕
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
