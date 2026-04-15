"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";

/* ─────────────────────── Intersection Observer Hook ─────────────────────── */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("revealed");
          observer.unobserve(el);
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return ref;
}

function Reveal({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useReveal();
  return (
    <div
      ref={ref}
      className={`reveal-on-scroll ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* ─────────────────────── Icons ─────────────────────── */
function IconGrid() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect x="2" y="2" width="6" height="6" rx="1.5" fill="var(--accent-purple)" />
      <rect x="12" y="2" width="6" height="6" rx="1.5" fill="var(--accent-purple)" opacity="0.5" />
      <rect x="2" y="12" width="6" height="6" rx="1.5" fill="var(--accent-purple)" opacity="0.5" />
      <rect x="12" y="12" width="6" height="6" rx="1.5" fill="var(--accent-purple)" />
    </svg>
  );
}

function IconLink() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="var(--accent-green)" strokeWidth="1.8" strokeLinecap="round">
      <path d="M8 12l4-4" />
      <path d="M6.5 9.5l-1.8 1.8a3 3 0 004.2 4.2l1.8-1.8" />
      <path d="M13.5 10.5l1.8-1.8a3 3 0 00-4.2-4.2L9.3 6.3" />
    </svg>
  );
}

function IconPlay() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect width="20" height="20" rx="5" fill="var(--accent-red)" opacity="0.15" />
      <path d="M8 6.5l5.5 3.5L8 13.5V6.5z" fill="var(--accent-red)" />
    </svg>
  );
}

function IconUpload() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M10 13V4m0 0l-3 3m3-3l3 3" />
      <path d="M3 14v2a2 2 0 002 2h10a2 2 0 002-2v-2" />
    </svg>
  );
}

function IconLayers() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 2l8 4-8 4-8-4z" />
      <path d="M2 10l8 4 8-4" />
      <path d="M2 14l8 4 8-4" />
    </svg>
  );
}

function IconShield() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M10 2l7 3v5c0 4-3 6.5-7 8-4-1.5-7-4-7-8V5l7-3z" />
      <path d="M7.5 10l2 2 3.5-4" />
    </svg>
  );
}

function IconZap() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 2L4 11h5l-1 7 7-9h-5l1-7z" />
    </svg>
  );
}

function IconCode() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M6 6L2 10l4 4" />
      <path d="M14 6l4 4-4 4" />
      <path d="M12 3L8 17" />
    </svg>
  );
}

function IconStar() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <path d="M14 2l2 6h6l-5 4 2 6-5-3-5 3 2-6-5-4h6z" fill="var(--accent-purple)" />
      <path d="M14 8l1 3h3l-2.5 2 1 3-2.5-1.5L11.5 16l1-3L10 11h3z" fill="var(--accent-blue)" opacity="0.8" />
    </svg>
  );
}

function IconGithub() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

/* ─────────────────────── Mini UI Illustrations ─────────────────────── */
function HeroNodes() {
  return (
    <div className="relative w-full h-full" style={{ minHeight: 280 }}>
      {/* POST /users card */}
      <div
        className="absolute rounded-lg px-4 py-3 hero-node"
        style={{
          top: "8%", left: "5%",
          backgroundColor: "var(--bg-tertiary)",
          border: "1px solid var(--border)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
        }}
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded font-mono" style={{ color: "var(--accent-blue)", backgroundColor: "color-mix(in srgb, var(--accent-blue) 15%, transparent)" }}>POST</span>
          <span className="text-[11px] font-mono" style={{ color: "var(--text-primary)" }}>/users</span>
        </div>
        <div className="text-[9px] font-mono" style={{ color: "var(--text-secondary)" }}>
          <span style={{ color: "var(--accent-blue)" }}>email</span>: "user@example.com"
        </div>
      </div>

      {/* GET /profile card */}
      <div
        className="absolute rounded-lg px-4 py-3 hero-node"
        style={{
          top: "32%", right: "0%",
          backgroundColor: "var(--bg-tertiary)",
          border: "1px solid var(--border)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
          animationDelay: "200ms",
        }}
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded font-mono" style={{ color: "var(--accent-green)", backgroundColor: "color-mix(in srgb, var(--accent-green) 15%, transparent)" }}>GET</span>
          <span className="text-[11px] font-mono" style={{ color: "var(--text-primary)" }}>/profile</span>
        </div>
        <div className="text-[9px] font-mono" style={{ color: "var(--text-secondary)" }}>
          <span style={{ color: "var(--accent-blue)" }}>id</span>: "usr_3k2j"
        </div>
      </div>

      {/* PUT /settings card */}
      <div
        className="absolute rounded-lg px-4 py-3 hero-node"
        style={{
          bottom: "5%", left: "20%",
          backgroundColor: "var(--bg-tertiary)",
          border: "1px solid var(--border)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
          animationDelay: "400ms",
        }}
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded font-mono" style={{ color: "var(--accent-yellow)", backgroundColor: "color-mix(in srgb, var(--accent-yellow) 15%, transparent)" }}>PUT</span>
          <span className="text-[11px] font-mono" style={{ color: "var(--text-primary)" }}>/settings</span>
        </div>
        <div className="text-[9px] font-mono" style={{ color: "var(--text-secondary)" }}>
          <span style={{ color: "var(--accent-blue)" }}>status</span>: "success"
        </div>
      </div>

      {/* Connection lines SVG */}
      <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: "none" }}>
        <defs>
          <linearGradient id="line-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--accent-purple)" stopOpacity="0.6" />
            <stop offset="100%" stopColor="var(--accent-blue)" stopOpacity="0.6" />
          </linearGradient>
        </defs>
        <path d="M180 60 Q 280 60, 340 110" stroke="url(#line-grad)" strokeWidth="2" fill="none" strokeDasharray="6 4" className="hero-line" />
        <path d="M340 140 Q 300 200, 260 220" stroke="url(#line-grad)" strokeWidth="2" fill="none" strokeDasharray="6 4" className="hero-line" style={{ animationDelay: "1s" }} />
      </svg>
    </div>
  );
}

function CanvasIllustration() {
  return (
    <div className="flex items-center justify-center gap-6 py-8">
      <div className="w-16 h-10 rounded-lg" style={{ backgroundColor: "var(--accent-blue)", opacity: 0.8, border: "2px solid var(--accent-blue)" }} />
      <div className="flex items-center">
        <div className="w-8 border-t-2 border-dashed" style={{ borderColor: "var(--text-secondary)" }} />
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "var(--accent-green)" }} />
        <div className="w-8 border-t-2 border-dashed" style={{ borderColor: "var(--text-secondary)" }} />
      </div>
      <div className="w-16 h-10 rounded-lg" style={{ backgroundColor: "var(--accent-red)", opacity: 0.8, border: "2px solid var(--accent-red)" }} />
    </div>
  );
}

function ExecutionIllustration() {
  return (
    <div className="space-y-2 py-4">
      <div className="flex items-center gap-3 rounded-lg px-4 py-2.5" style={{ backgroundColor: "var(--bg-primary)", border: "1px solid var(--border)" }}>
        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "var(--accent-green)" }} />
        <span className="text-[11px] font-mono flex-1" style={{ color: "var(--text-primary)" }}>Stage 1: Auth</span>
        <span className="text-[10px] font-mono" style={{ color: "var(--accent-green)" }}>124ns</span>
      </div>
      <div className="flex items-center gap-3 rounded-lg px-4 py-2.5" style={{ backgroundColor: "var(--bg-primary)", border: "1px solid var(--border)" }}>
        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "var(--accent-green)" }} />
        <span className="text-[11px] font-mono flex-1" style={{ color: "var(--text-primary)" }}>Stage 2: Fetch</span>
        <span className="text-[10px] font-mono" style={{ color: "var(--accent-green)" }}>89ms</span>
      </div>
    </div>
  );
}

function ImportIllustration() {
  return (
    <div className="space-y-2 py-4">
      {["POST /auth/login", "GET /users", "PUT /profile"].map((ep, i) => (
        <div key={i} className="flex items-center gap-2 rounded-lg px-4 py-2" style={{ backgroundColor: "var(--bg-primary)", border: "1px solid var(--border)" }}>
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded font-mono" style={{
            color: i === 0 ? "var(--accent-blue)" : i === 1 ? "var(--accent-green)" : "var(--accent-yellow)",
            backgroundColor: `color-mix(in srgb, ${i === 0 ? "var(--accent-blue)" : i === 1 ? "var(--accent-green)" : "var(--accent-yellow)"} 12%, transparent)`,
          }}>{ep.split(" ")[0]}</span>
          <span className="text-[11px] font-mono" style={{ color: "var(--text-primary)" }}>{ep.split(" ")[1]}</span>
        </div>
      ))}
    </div>
  );
}

function ExecuteIllustration() {
  return (
    <div className="space-y-2 py-4">
      <div className="flex items-center gap-3 rounded-lg px-4 py-2.5" style={{ backgroundColor: "var(--bg-primary)", border: "1px solid color-mix(in srgb, var(--accent-green) 30%, var(--border))" }}>
        <span className="text-[9px]">✓</span>
        <span className="text-[10px] font-bold font-mono" style={{ color: "var(--accent-blue)" }}>POST</span>
        <span className="text-[11px] font-mono flex-1" style={{ color: "var(--text-primary)" }}>/auth/login</span>
        <span className="text-[10px] font-mono" style={{ color: "var(--accent-green)" }}>124ms</span>
      </div>
      <div className="flex items-center gap-3 rounded-lg px-4 py-2.5" style={{ backgroundColor: "var(--bg-primary)", border: "1px solid color-mix(in srgb, var(--accent-green) 30%, var(--border))" }}>
        <span className="text-[9px]">✓</span>
        <span className="text-[10px] font-bold font-mono" style={{ color: "var(--accent-green)" }}>GET</span>
        <span className="text-[11px] font-mono flex-1" style={{ color: "var(--text-primary)" }}>/profile</span>
        <span className="text-[10px] font-mono" style={{ color: "var(--accent-green)" }}>89ms</span>
      </div>
    </div>
  );
}

/* ─────────────────────── Tech Badge ─────────────────────── */
function TechBadge({ name }: { name: string }) {
  return (
    <div
      className="flex items-center gap-2 px-4 py-2.5 rounded-full text-[12px] font-mono"
      style={{
        border: "1px solid var(--border)",
        color: "var(--text-secondary)",
        backgroundColor: "var(--bg-secondary)",
      }}
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="var(--accent-purple)" strokeWidth="1.2">
        <rect x="2" y="2" width="10" height="10" rx="2" />
        <path d="M5 5l2 2-2 2" />
      </svg>
      {name}
    </div>
  );
}

/* ─────────────────────── Main Page ─────────────────────── */
export default function LandingPage() {
  return (
    <div
      className="min-h-screen overflow-x-hidden"
      style={{
        backgroundColor: "var(--bg-primary)",
        color: "var(--text-primary)",
        fontFamily: "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace",
      }}
    >
      {/* ─── JSON-LD Structured Data ─── */}
      <Script
        id="json-ld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "Restflow",
            applicationCategory: "DeveloperApplication",
            operatingSystem: "Web Browser",
            description:
              "Visual API workflow builder. Import OpenAPI specs, drag endpoints onto a canvas, connect them, map data between responses and requests, and execute multi-step API workflows — all in your browser.",
            offers: {
              "@type": "Offer",
              price: "0",
              priceCurrency: "USD",
            },
            featureList: [
              "Visual drag-and-drop API workflow canvas",
              "OpenAPI and Swagger spec import",
              "Smart response-to-request data mapping",
              "Stage-based step-by-step execution",
              "Section grouping for API organization",
              "Real-time request and response monitoring",
              "Zero infrastructure — runs in browser",
              "No sign-up required",
            ],
          }),
        }}
      />

      {/* ─── Inline Styles ─── */}
      <style>{`
        .reveal-on-scroll {
          opacity: 0;
          transform: translateY(24px);
          transition: opacity 0.6s ease, transform 0.6s ease;
        }
        .reveal-on-scroll.revealed {
          opacity: 1;
          transform: translateY(0);
        }
        .hero-glow {
          background: radial-gradient(ellipse 60% 50% at 50% 0%, color-mix(in srgb, var(--accent-purple) 15%, transparent) 0%, transparent 70%);
        }
        .bottom-glow {
          background: radial-gradient(ellipse 80% 40% at 50% 100%, color-mix(in srgb, var(--accent-purple) 10%, transparent) 0%, transparent 70%);
        }
        .mid-glow {
          background: radial-gradient(ellipse 60% 30% at 50% 50%, color-mix(in srgb, var(--accent-red) 6%, transparent) 0%, transparent 70%);
        }
        @keyframes float-node {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        .hero-node {
          animation: float-node 4s ease-in-out infinite;
        }
        @keyframes dash-flow {
          to { stroke-dashoffset: -20; }
        }
        .hero-line {
          animation: dash-flow 2s linear infinite;
        }
        .gradient-text {
          background: linear-gradient(135deg, var(--accent-purple) 0%, var(--accent-pink) 50%, var(--accent-blue) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .cta-btn {
          background: linear-gradient(135deg, var(--accent-purple) 0%, color-mix(in srgb, var(--accent-purple) 80%, var(--accent-blue)) 100%);
          transition: transform 0.15s ease, box-shadow 0.15s ease, filter 0.15s ease;
        }
        .cta-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 8px 24px color-mix(in srgb, var(--accent-purple) 30%, transparent);
          filter: brightness(1.1);
        }
        .cta-btn:active { transform: scale(0.98); }
        .feature-card {
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .feature-card:hover {
          border-color: color-mix(in srgb, var(--accent-purple) 30%, var(--border));
          box-shadow: 0 8px 32px rgba(0,0,0,0.2);
        }
        .step-number {
          background: linear-gradient(135deg, var(--accent-purple), var(--accent-pink));
          box-shadow: 0 0 20px color-mix(in srgb, var(--accent-purple) 30%, transparent);
        }
        .final-cta-card {
          background: linear-gradient(180deg, var(--bg-secondary) 0%, color-mix(in srgb, var(--accent-purple) 5%, var(--bg-secondary)) 100%);
          border: 1px solid var(--border);
        }
      `}</style>

      {/* ═══════════════════════ NAV ═══════════════════════ */}
      <nav
        className="fixed top-0 left-0 right-0 z-50"
        style={{
          backgroundColor: "color-mix(in srgb, var(--bg-primary) 85%, transparent)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid color-mix(in srgb, var(--border) 50%, transparent)",
        }}
      >
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="4" r="2.5" fill="var(--accent-blue)" />
              <circle cx="4" cy="20" r="2.5" fill="var(--accent-purple)" />
              <circle cx="20" cy="20" r="2.5" fill="var(--accent-purple)" />
              <line x1="12" y1="6.5" x2="4" y2="17.5" stroke="var(--accent-blue)" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="12" y1="6.5" x2="20" y2="17.5" stroke="var(--accent-blue)" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="6.5" y1="20" x2="17.5" y2="20" stroke="var(--accent-purple)" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span className="text-base font-bold">
              <span style={{ color: "var(--text-primary)" }}>Rest</span>
              <span style={{ color: "var(--accent-purple)" }}>flow</span>
            </span>
            <span
              className="text-[9px] font-bold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
            >
              Beta
            </span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-[13px] transition-colors" style={{ color: "var(--text-secondary)" }} onMouseEnter={e => e.currentTarget.style.color = "var(--text-primary)"} onMouseLeave={e => e.currentTarget.style.color = "var(--text-secondary)"}>Features</a>
            <a href="#how-it-works" className="text-[13px] transition-colors" style={{ color: "var(--text-secondary)" }} onMouseEnter={e => e.currentTarget.style.color = "var(--text-primary)"} onMouseLeave={e => e.currentTarget.style.color = "var(--text-secondary)"}>Workflow</a>
            <a href="#tech" className="text-[13px] transition-colors" style={{ color: "var(--text-secondary)" }} onMouseEnter={e => e.currentTarget.style.color = "var(--text-primary)"} onMouseLeave={e => e.currentTarget.style.color = "var(--text-secondary)"}>Tech</a>
          </div>

          <a
            href="/app"
            className="cta-btn text-[13px] font-bold px-5 py-2.5 rounded-full"
            style={{ color: "#fff" }}
          >
            Get Started →
          </a>
        </div>
      </nav>

      {/* ═══════════════════════ HERO ═══════════════════════ */}
      <section className="hero-glow pt-32 pb-20 px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div>
            <Reveal>
              <div
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] mb-8"
                style={{ backgroundColor: "var(--bg-tertiary)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
              >
                <span>✨</span> Introducing Restflow 2.0
              </div>
            </Reveal>

            <Reveal delay={100}>
              <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-6" style={{ letterSpacing: "-0.03em" }}>
                API workflows that<br />
                <span className="gradient-text">feel like magic</span>
              </h1>
            </Reveal>

            <Reveal delay={200}>
              <p className="text-base leading-relaxed mb-8 max-w-md" style={{ color: "var(--text-secondary)" }}>
                Visual workflow builder for modern APIs. Chain requests, map data flows, and execute multi-step operations with an intuitive drag-and-drop interface.
              </p>
            </Reveal>

            <Reveal delay={300}>
              <div className="flex items-center gap-4">
                <a
                  href="/app"
                  className="cta-btn text-[13px] font-bold px-6 py-3 rounded-full inline-flex items-center gap-2"
                  style={{ color: "#fff" }}
                >
                  ⚡ Start Building
                </a>
                <a
                  href="#features"
                  className="text-[13px] font-bold px-6 py-3 rounded-full inline-flex items-center gap-2 transition-colors"
                  style={{ color: "var(--text-primary)", border: "1px solid var(--border)", backgroundColor: "var(--bg-secondary)" }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = "var(--text-secondary)"}
                  onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}
                >
                  Learn More
                </a>
              </div>
            </Reveal>
          </div>

          <Reveal delay={400}>
            <HeroNodes />
          </Reveal>
        </div>
      </section>

      {/* ═══════════════════════ FEATURES ═══════════════════════ */}
      <section id="features" className="bottom-glow px-6 py-24">
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ letterSpacing: "-0.03em" }}>
                Everything you need to build<br />
                <span className="gradient-text">powerful workflows</span>
              </h2>
              <p className="text-[14px]" style={{ color: "var(--text-secondary)" }}>
                Professional tools for modern API development
              </p>
            </div>
          </Reveal>

          {/* Top row: 3 feature cards */}
          <div className="grid md:grid-cols-3 gap-5 mb-5">
            {/* Infinite Visual Canvas */}
            <Reveal delay={0}>
              <div className="feature-card rounded-xl p-6 md:col-span-1" style={{ minHeight: 280 }}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4" style={{ backgroundColor: "color-mix(in srgb, var(--accent-purple) 15%, transparent)" }}>
                  <IconGrid />
                </div>
                <h3 className="text-base font-bold mb-2">Infinite Visual Canvas</h3>
                <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  Design complex API workflows on an unlimited canvas. Pan, zoom, and organize with intuitive drag-and-drop controls.
                </p>
                <CanvasIllustration />
              </div>
            </Reveal>

            {/* Smart Data Mapping */}
            <Reveal delay={100}>
              <div className="feature-card rounded-xl p-6">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4" style={{ backgroundColor: "color-mix(in srgb, var(--accent-green) 15%, transparent)" }}>
                  <IconLink />
                </div>
                <h3 className="text-base font-bold mb-2">Smart Data Mapping</h3>
                <p className="text-[13px] leading-relaxed mb-4" style={{ color: "var(--text-secondary)" }}>
                  Connect response fields to request inputs with intelligent auto-suggestions and type validation.
                </p>
                <div className="flex flex-wrap gap-2">
                  {["JSON Path", "Auto-complete", "Type Safe"].map((tag) => (
                    <span key={tag} className="text-[10px] px-3 py-1.5 rounded-full font-mono" style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </Reveal>

            {/* Live Execution */}
            <Reveal delay={200}>
              <div className="feature-card rounded-xl p-6">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4" style={{ backgroundColor: "color-mix(in srgb, var(--accent-red) 15%, transparent)" }}>
                  <IconPlay />
                </div>
                <h3 className="text-base font-bold mb-2">Live Execution</h3>
                <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  Execute workflows in real-time with detailed logging, timing metrics, and response previews.
                </p>
                <ExecutionIllustration />
              </div>
            </Reveal>
          </div>

          {/* Bottom row: 4 smaller feature cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {[
              { icon: <IconUpload />, title: "OpenAPI Import", desc: "Import Swagger & OpenAPI specs instantly" },
              { icon: <IconLayers />, title: "Section Grouping", desc: "Organize APIs into logical stages" },
              { icon: <IconShield />, title: "100% Private", desc: "All data stays in your browser" },
              { icon: <IconZap />, title: "Lightning Fast", desc: "Zero latency, instant feedback" },
            ].map((f, i) => (
              <Reveal key={i} delay={i * 80}>
                <div className="feature-card rounded-xl p-5" style={{ minHeight: 160 }}>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-secondary)" }}>
                    {f.icon}
                  </div>
                  <h4 className="text-[13px] font-bold mb-1">{f.title}</h4>
                  <p className="text-[12px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>{f.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════ HOW IT WORKS ═══════════════════════ */}
      <section id="how-it-works" className="mid-glow px-6 py-24">
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ letterSpacing: "-0.03em" }}>How it works</h2>
              <p className="text-[14px]" style={{ color: "var(--text-secondary)" }}>From spec to execution in three simple steps</p>
            </div>
          </Reveal>

          <div className="space-y-8">
            {/* Step 1 */}
            <Reveal>
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div className="feature-card rounded-xl p-6">
                  <ImportIllustration />
                </div>
                <div className="relative pl-12 md:pl-16">
                  <div className="step-number absolute left-0 top-0 w-10 h-10 rounded-full flex items-center justify-center text-[14px] font-bold" style={{ color: "#fff" }}>
                    01
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <IconCode />
                    <h3 className="text-xl font-bold">Import OpenAPI Spec</h3>
                  </div>
                  <p className="text-[13px] leading-relaxed mb-4" style={{ color: "var(--text-secondary)" }}>
                    Paste your OpenAPI or Swagger URL. We&apos;ll parse all endpoints, resolve $refs, and organize everything by tags for easy access.
                  </p>
                  <ul className="space-y-2">
                    {["OpenAPI 2.0 & 3.0 support", "Automatic reference resolution", "Tag-based organization"].map((item) => (
                      <li key={item} className="flex items-center gap-2 text-[12px]" style={{ color: "var(--text-secondary)" }}>
                        <span style={{ color: "var(--accent-green)" }}>✓</span> {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Reveal>

            {/* Step 2 */}
            <Reveal>
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div className="md:order-2 feature-card rounded-xl p-6">
                  <CanvasIllustration />
                </div>
                <div className="relative pl-12 md:pl-16 md:order-1">
                  <div className="step-number absolute left-0 top-0 w-10 h-10 rounded-full flex items-center justify-center text-[14px] font-bold" style={{ color: "#fff" }}>
                    02
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <IconGrid />
                    <h3 className="text-xl font-bold">Design Your Workflow</h3>
                  </div>
                  <p className="text-[13px] leading-relaxed mb-4" style={{ color: "var(--text-secondary)" }}>
                    Drag endpoints onto an infinite canvas, connect them with visual links, and map data flows between API calls.
                  </p>
                  <ul className="space-y-2">
                    {["Drag-and-drop interface", "Visual data mapping", "Section grouping"].map((item) => (
                      <li key={item} className="flex items-center gap-2 text-[12px]" style={{ color: "var(--text-secondary)" }}>
                        <span style={{ color: "var(--accent-green)" }}>✓</span> {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Reveal>

            {/* Step 3 */}
            <Reveal>
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div className="feature-card rounded-xl p-6">
                  <ExecuteIllustration />
                </div>
                <div className="relative pl-12 md:pl-16">
                  <div className="step-number absolute left-0 top-0 w-10 h-10 rounded-full flex items-center justify-center text-[14px] font-bold" style={{ color: "#fff" }}>
                    03
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <IconPlay />
                    <h3 className="text-xl font-bold">Execute & Monitor</h3>
                  </div>
                  <p className="text-[13px] leading-relaxed mb-4" style={{ color: "var(--text-secondary)" }}>
                    Run workflows stage by stage with complete visibility into requests, responses, timing, and data flow.
                  </p>
                  <ul className="space-y-2">
                    {["Real-time execution", "Performance metrics"].map((item) => (
                      <li key={item} className="flex items-center gap-2 text-[12px]" style={{ color: "var(--text-secondary)" }}>
                        <span style={{ color: "var(--accent-green)" }}>✓</span> {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ═══════════════════════ TECH STACK ═══════════════════════ */}
      <section id="tech" className="px-6 py-20">
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <p className="text-center text-[10px] font-bold tracking-[0.2em] mb-8" style={{ color: "var(--text-secondary)" }}>
              POWERED BY CUTTING-EDGE TECHNOLOGIES
            </p>
          </Reveal>
          <Reveal delay={100}>
            <div className="flex flex-wrap justify-center gap-3">
              {["React 19", "TypeScript", "Zustand", "Tailwind CSS", "Monaco Editor", "Next.js"].map((t) => (
                <TechBadge key={t} name={t} />
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══════════════════════ FINAL CTA ═══════════════════════ */}
      <section className="px-6 py-20">
        <div className="max-w-2xl mx-auto">
          <Reveal>
            <div className="final-cta-card rounded-2xl p-10 md:p-14 text-center">
              <IconStar />
              <h2 className="text-2xl md:text-3xl font-bold mt-4 mb-3" style={{ letterSpacing: "-0.03em" }}>
                Ready to transform your API workflow?
              </h2>
              <p className="text-[14px] mb-8" style={{ color: "var(--text-secondary)" }}>
                Open source and free forever. Start building API workflows in seconds.
              </p>
              <a
                href="/app"
                className="cta-btn text-[14px] font-bold px-8 py-3.5 rounded-full inline-flex items-center gap-2"
                style={{ color: "#fff" }}
              >
                Start Building Free →
              </a>
              <p className="text-[11px] mt-4" style={{ color: "var(--text-secondary)" }}>
                Open source · MIT licensed · No sign-up required
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══════════════════════ FOOTER ═══════════════════════ */}
      <footer className="px-6 py-12" style={{ borderTop: "1px solid var(--border)" }}>
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="4" r="2.5" fill="var(--accent-blue)" />
                <circle cx="4" cy="20" r="2.5" fill="var(--accent-purple)" />
                <circle cx="20" cy="20" r="2.5" fill="var(--accent-purple)" />
                <line x1="12" y1="6.5" x2="4" y2="17.5" stroke="var(--accent-blue)" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="12" y1="6.5" x2="20" y2="17.5" stroke="var(--accent-blue)" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="6.5" y1="20" x2="17.5" y2="20" stroke="var(--accent-purple)" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <span className="text-sm font-bold">
                <span style={{ color: "var(--text-primary)" }}>Rest</span>
                <span style={{ color: "var(--accent-purple)" }}>flow</span>
              </span>
            </div>
            <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
              Visual workflow builder for modern APIs
            </p>
          </div>
          <div>
            <p className="text-[12px] font-bold mb-3" style={{ color: "var(--text-primary)" }}>Product</p>
            <ul className="space-y-2">
              <li><a href="#features" className="text-[12px] transition-colors" style={{ color: "var(--text-secondary)" }} onMouseEnter={e => e.currentTarget.style.color = "var(--text-primary)"} onMouseLeave={e => e.currentTarget.style.color = "var(--text-secondary)"}>Features</a></li>
              <li><a href="/app" className="text-[12px] transition-colors" style={{ color: "var(--text-secondary)" }} onMouseEnter={e => e.currentTarget.style.color = "var(--text-primary)"} onMouseLeave={e => e.currentTarget.style.color = "var(--text-secondary)"}>Get Started</a></li>
            </ul>
          </div>
          <div>
            <p className="text-[12px] font-bold mb-3" style={{ color: "var(--text-primary)" }}>Community</p>
            <ul className="space-y-2">
              <li><a href="https://github.com" className="text-[12px] transition-colors" style={{ color: "var(--text-secondary)" }} onMouseEnter={e => e.currentTarget.style.color = "var(--text-primary)"} onMouseLeave={e => e.currentTarget.style.color = "var(--text-secondary)"}>GitHub</a></li>
              <li><a href="https://github.com" className="text-[12px] transition-colors" style={{ color: "var(--text-secondary)" }} onMouseEnter={e => e.currentTarget.style.color = "var(--text-primary)"} onMouseLeave={e => e.currentTarget.style.color = "var(--text-secondary)"}>Issues</a></li>
            </ul>
          </div>
          <div>
            <p className="text-[12px] font-bold mb-3" style={{ color: "var(--text-primary)" }}>Legal</p>
            <ul className="space-y-2">
              <li><a href="https://github.com" className="text-[12px] transition-colors" style={{ color: "var(--text-secondary)" }} onMouseEnter={e => e.currentTarget.style.color = "var(--text-primary)"} onMouseLeave={e => e.currentTarget.style.color = "var(--text-secondary)"}>MIT License</a></li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
}
