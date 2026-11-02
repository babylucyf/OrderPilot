/* Two-tone spot illustrations for the customer status hero. Colour comes from the parent tone. */
export type SpotKind = "request" | "question" | "quote" | "wallet" | "checking" | "cake" | "scooter" | "bag" | "done" | "alert";

export function Spot({ kind, tone }: { kind: SpotKind; tone: string }) {
  return (
    <span className={`spot ${tone}`} aria-hidden>
      <svg viewBox="0 0 64 64">{ART[kind]}</svg>
    </span>
  );
}

const soft = { fill: "currentColor", opacity: 0.22 } as const;
const solid = { fill: "currentColor" } as const;
const line = { fill: "none", stroke: "currentColor", strokeWidth: 3, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

const ART: Record<SpotKind, React.ReactNode> = {
  request: (
    <>
      <path d="M16 8h24l10 10v38a2 2 0 0 1-2 2H16a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2z" {...soft} />
      <path d="M16 8h24l10 10v38a2 2 0 0 1-2 2H16a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2z" {...line} />
      <path d="M40 8v10h10M22 30h20M22 38h20M22 46h12" {...line} />
    </>
  ),
  question: (
    <>
      <path d="M10 14a4 4 0 0 1 4-4h36a4 4 0 0 1 4 4v26a4 4 0 0 1-4 4H28l-12 10V44h-2a4 4 0 0 1-4-4z" {...soft} />
      <path d="M10 14a4 4 0 0 1 4-4h36a4 4 0 0 1 4 4v26a4 4 0 0 1-4 4H28l-12 10V44h-2a4 4 0 0 1-4-4z" {...line} />
      <path d="M27 22a5 5 0 1 1 7 4.6c-1.3.6-2 1.6-2 3v1M32 36v.1" {...line} />
    </>
  ),
  quote: (
    <>
      <rect x="10" y="12" width="44" height="40" rx="5" {...soft} />
      <rect x="10" y="12" width="44" height="40" rx="5" {...line} />
      <path d="M10 22h44M18 32h16M18 41h10M42 41h4" {...line} />
    </>
  ),
  wallet: (
    <>
      <path d="M10 20h42a3 3 0 0 1 3 3v26a3 3 0 0 1-3 3H13a3 3 0 0 1-3-3z" {...soft} />
      <path d="M10 20h42a3 3 0 0 1 3 3v26a3 3 0 0 1-3 3H13a3 3 0 0 1-3-3zM10 20l30-10v10" {...line} />
      <circle cx="44" cy="36" r="3" {...solid} />
    </>
  ),
  checking: (
    <>
      <circle cx="28" cy="28" r="16" {...soft} />
      <circle cx="28" cy="28" r="16" {...line} />
      <path d="M40 40l12 12M22 28h12M28 22v12" {...line} />
    </>
  ),
  cake: (
    <>
      <path d="M12 34h40v18a2 2 0 0 1-2 2H14a2 2 0 0 1-2-2z" {...soft} />
      <path d="M12 34h40v18a2 2 0 0 1-2 2H14a2 2 0 0 1-2-2zM16 34v-6a2 2 0 0 1 2-2h28a2 2 0 0 1 2 2v6M32 26v-8" {...line} />
      <path d="M32 9c3 3.5 3 6 0 7.5-3-1.5-3-4 0-7.5z" {...solid} />
      <path d="M12 42c3.3 0 3.3 3 6.7 3s3.3-3 6.6-3 3.4 3 6.7 3 3.3-3 6.7-3 3.3 3 6.6 3 3.4-3 6.7-3" {...line} />
    </>
  ),
  scooter: (
    <>
      <rect x="34" y="14" width="18" height="16" rx="3" {...soft} />
      <rect x="34" y="14" width="18" height="16" rx="3" {...line} />
      <path d="M14 44h22l8-14h4M22 44l-4-14h-6M48 30l4 14" {...line} />
      <circle cx="16" cy="48" r="6" {...line} />
      <circle cx="50" cy="48" r="6" {...line} />
    </>
  ),
  bag: (
    <>
      <path d="M14 22h36l-3 32H17z" {...soft} />
      <path d="M14 22h36l-3 32H17zM24 22v-4a8 8 0 0 1 16 0v4" {...line} />
      <path d="M26 38l5 5 8-9" {...line} />
    </>
  ),
  done: (
    <>
      <circle cx="32" cy="32" r="22" {...soft} />
      <circle cx="32" cy="32" r="22" {...line} />
      <path d="M22 33l7 7 13-15" {...line} />
    </>
  ),
  alert: (
    <>
      <path d="M32 8l26 46H6z" {...soft} />
      <path d="M32 8l26 46H6z" {...line} />
      <path d="M32 26v12M32 46v.1" {...line} />
    </>
  ),
};
