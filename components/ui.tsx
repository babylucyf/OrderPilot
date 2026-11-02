"use client";

import { useEffect, useRef } from "react";
import type { Tone } from "@/lib/rules";
import { charCount } from "@/lib/rules";
import type { Writing } from "@/lib/types";
import { STAFF } from "@/lib/seed";

export function Glyph({ tone, size = 12 }: { tone: Tone; size?: number }) {
  const s = { width: size, height: size, viewBox: "0 0 12 12", "aria-hidden": true as const };
  switch (tone) {
    case "ok":
      return <svg {...s}><path d="M2 6.5 5 9l5-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
    case "risk":
      return <svg {...s}><path d="M6 1 11.2 10.5H.8z" fill="currentColor" /><path d="M6 4.6v2.6M6 8.6v.1" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" /></svg>;
    case "hold":
      return <svg {...s}><circle cx="6" cy="6" r="4.8" fill="none" stroke="currentColor" strokeWidth="1.4" /><path d="M6 1.2a4.8 4.8 0 0 1 0 9.6z" fill="currentColor" /></svg>;
    case "review":
      return <svg {...s}><circle cx="6" cy="6" r="4.6" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>;
    case "done":
      return <svg {...s}><circle cx="6" cy="6" r="5" fill="currentColor" /></svg>;
    default:
      return <svg {...s}><path d="M2.5 6h7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>;
  }
}

export function Badge({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span className={`badge t-${tone}`}>
      <Glyph tone={tone} />
      {children}
    </span>
  );
}

export function WritingText({ writing, className = "" }: { writing: Writing; className?: string }) {
  if (writing === null) return <span className={`writing-none ${className}`} style={{ color: "var(--hold)" }}>Not answered yet</span>;
  if (writing.kind === "none") return <span className={`writing-none ${className}`}>No writing (confirmed)</span>;
  return <span className={`writing ${className}`}>“{writing.text}”</span>;
}

/** The cake seen from above, with the customer's exact writing. PRD INT-06 writing fidelity. */
export function CakeTop({ text, size = 220, flavour }: { text: string; size?: number; flavour?: string | null }) {
  const sponge: Record<string, string> = { "Red velvet": "#f6dde2", Chocolate: "#efe2da", Lemon: "#fbf3d2", Vanilla: "#fbf8f1" };
  const fill = (flavour && sponge[flavour]) || "#fbf8f1";
  const n = charCount(text);
  const fs = n > 30 ? 15 : n > 22 ? 17 : n > 14 ? 20 : 24;
  const words = text.split(" ");
  // split into at most two balanced lines
  let l1 = text, l2 = "";
  if (n > 14 && words.length > 1) {
    let best = 1, diff = Infinity;
    for (let i = 1; i < words.length; i++) {
      const a = words.slice(0, i).join(" ").length, b = words.slice(i).join(" ").length;
      if (Math.abs(a - b) < diff) { diff = Math.abs(a - b); best = i; }
    }
    l1 = words.slice(0, best).join(" ");
    l2 = words.slice(best).join(" ");
  }
  return (
    <svg viewBox="0 0 240 240" width={size} height={size} role="img" aria-label={text ? `Cake top preview with the writing: ${text}` : "Cake top preview with no writing"} style={{ maxWidth: "100%", height: "auto" }}>
      <circle cx="120" cy="120" r="112" fill="#e9ebe6" />
      <circle cx="120" cy="120" r="100" fill={fill} stroke="#d5d8d0" />
      {Array.from({ length: 24 }).map((_, i) => {
        const a = (i / 24) * Math.PI * 2;
        return <circle key={i} cx={120 + Math.cos(a) * 92} cy={120 + Math.sin(a) * 92} r="5" fill="#fff" stroke="#d5d8d0" strokeWidth="0.8" />;
      })}
      {text ? (
        <text x="120" textAnchor="middle" style={{ fontFamily: "var(--writing)", fontStyle: "italic", fontWeight: 500, fill: "var(--glaze)", fontVariationSettings: '"SOFT" 100, "WONK" 1' }} fontSize={fs}>
          {l2 ? (
            <>
              <tspan x="120" y={120 - fs * 0.25}>{l1}</tspan>
              <tspan x="120" y={120 + fs * 1.05}>{l2}</tspan>
            </>
          ) : (
            <tspan x="120" y={120 + fs * 0.35}>{l1}</tspan>
          )}
        </text>
      ) : (
        <text x="120" y="125" textAnchor="middle" fontSize="13" fill="#636978" fontFamily="var(--sans)">No writing</text>
      )}
    </svg>
  );
}

export function Avatar({ name, size = 28 }: { name: string; size?: number }) {
  const s = STAFF.find((x) => x.name === name);
  const initials = name.split(" ").map((p) => p[0]).slice(0, 2).join("");
  if (s?.photo) return <img src={s.photo} alt="" width={size} height={size} style={{ borderRadius: "50%", objectFit: "cover" }} />;
  return (
    <span aria-hidden style={{ width: size, height: size, borderRadius: "50%", background: "var(--blueberry-tint)", color: "var(--blueberry)", display: "inline-grid", placeItems: "center", fontSize: size * 0.4, fontWeight: 700, flex: "none" }}>
      {initials}
    </span>
  );
}

export function Sheet({ open, onClose, title, children, labelledBy }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; labelledBy?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const returnTo = useRef<Element | null>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      returnTo.current = document.activeElement;
      d.showModal();
    } else if (!open && d.open) {
      d.close();
      (returnTo.current as HTMLElement | null)?.focus?.();
    }
  }, [open]);
  const id = labelledBy ?? `sheet-${title.replace(/\W+/g, "-").toLowerCase()}`;
  return (
    <dialog ref={ref} className="sheet" aria-labelledby={id} onClose={onClose} onCancel={onClose}>
      {open && (
        <div className="sheet-inner">
          <h2 id={id}>{title}</h2>
          {children}
        </div>
      )}
    </dialog>
  );
}
