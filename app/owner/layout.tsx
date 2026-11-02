"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { BUSINESS, fmtDate, lagosParts } from "@/lib/rules";
import { attentionQueue } from "@/lib/ops";
import { Avatar } from "@/components/ui";
import { Icon } from "@/components/icons";
import "./owner.css";

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { state, me } = useStore();
  const urgent = attentionQueue(state.orders, state.now).length;
  const newCount = state.orders.filter((o) => ["submitted", "needs_clarification"].includes(o.stage)).length;
  const NAV = [
    { href: "/owner", label: "Today", icon: "today", count: urgent },
    { href: "/owner/orders", label: "Orders", icon: "orders", count: newCount },
    { href: "/owner/capture", label: "Capture order", icon: "capture" },
    { href: "/owner/production", label: "Production", icon: "production" },
  ];
  return (
    <div className="owner">
      <nav className="side no-print" aria-label="Workspace">
        <Link href="/" className="brand" aria-label="OrderPilot, about this prototype">
          <span className="brand-mark" aria-hidden>
            <svg viewBox="0 0 24 24" width="20" height="20"><path d="M5 6.5h14v11a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 17.5z" fill="none" stroke="#fff" strokeWidth="1.8" /><path d="M9 10.5h6M9 14h4" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" /><path d="M9 6.5V4.5M15 6.5V4.5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" /></svg>
          </span>
          <span className="brand-name">OrderPilot</span>
        </Link>

        <div className="biz">
          <span className="biz-logo" aria-hidden>B</span>
          <span className="biz-text"><b>{BUSINESS.name}</b><span>{BUSINESS.area}</span></span>
        </div>

        <p className="nav-label">Workspace</p>
        <ul>
          {NAV.map((n) => {
            const active = n.href === "/owner" ? path === "/owner" : path.startsWith(n.href);
            return (
              <li key={n.href}>
                <Link href={n.href} aria-current={active ? "page" : undefined} className="nav-item">
                  <Icon name={n.icon} />
                  <span>{n.label}</span>
                  {!!n.count && <span className="count" aria-label={n.href === "/owner" ? `${n.count} need attention` : `${n.count} new or unclear`}>{n.count}</span>}
                </Link>
              </li>
            );
          })}
        </ul>

        <p className="nav-label">Customer side</p>
        <ul>
          <li>
            <Link href="/b/butterleaf" className="nav-item" target="_blank">
              <Icon name="external" />
              <span>Customer order page</span>
            </Link>
          </li>
          <li>
            <Link href="/" className="nav-item">
              <Icon name="help" />
              <span>About this prototype</span>
            </Link>
          </li>
        </ul>

        <div className="me">
          <Avatar name={me} size={36} />
          <span className="me-text"><b>{me}</b><span>Owner</span></span>
        </div>
      </nav>

      <div className="owner-col">
        <TopBar />
        <main id="main" className="owner-main">
          {children}
          <p className="switch-side no-print print-hide">
            Ordering a cake? <Link href="/b/butterleaf">See the customer flow instead</Link>
          </p>
        </main>
      </div>
    </div>
  );
}

function TopBar() {
  const { state, dispatch, afterClose, toggleClock } = useStore();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const p = lagosParts(state.now);
  const term = q.trim().toLowerCase();
  const hits = term ? state.orders.filter((o) => o.id.toLowerCase().includes(term) || o.buyer.name.toLowerCase().includes(term)).slice(0, 6) : [];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        input.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="topbar no-print">
      <form
        className="search"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          if (hits[0]) router.push(`/owner/orders/${hits[0].id}`);
          setOpen(false);
          setQ("");
        }}
      >
        <Icon name="search" size={18} />
        <label htmlFor="global-search" className="sr-only">Search orders by number or buyer</label>
        <input
          id="global-search"
          ref={input}
          value={q}
          placeholder="Search orders or buyers"
          autoComplete="off"
          role="combobox"
          aria-expanded={open && hits.length > 0}
          aria-controls="search-results"
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onFocus={() => setOpen(true)}
        />
        <kbd>Ctrl K</kbd>
        {open && hits.length > 0 && (
          <ul id="search-results" className="search-pop" role="listbox">
            {hits.map((o) => (
              <li key={o.id} role="option" aria-selected={false}>
                <Link href={`/owner/orders/${o.id}`} onClick={() => { setQ(""); setOpen(false); }}>
                  <b>{o.id}</b> <span>{o.buyer.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </form>
      <div className="top-actions">
        <span className="proto-chip">Concept prototype, synthetic data</span>
        <button type="button" className="btn btn-secondary btn-sm" onClick={toggleClock} aria-pressed={afterClose} aria-label={`Demo clock ${fmtDate(p.date)}, ${p.time}. ${afterClose ? "Switch back to 14:20" : "Jump past 17:00 closing"}`} title="Switch the demo clock to test the 17:00 closing rule">
          <Icon name="clock" size={18} />
          <span>{fmtDate(p.date)}, {p.time}</span>
        </button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => dispatch({ type: "reset" })}>
          <Icon name="reset" size={18} />
          <span className="hide-sm">Reset demo</span>
        </button>
      </div>
    </header>
  );
}
