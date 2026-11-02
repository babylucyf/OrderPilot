"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStore } from "@/lib/store";
import { BUSINESS } from "@/lib/rules";
import { attentionQueue } from "@/lib/ops";
import { Avatar } from "@/components/ui";
import "./owner.css";

const NAV = [
  { href: "/owner", label: "Today", icon: "M3 10h14M3 5h14M3 15h8" },
  { href: "/owner/orders", label: "Orders", icon: "M4 3h12v14H4zM7 7h6M7 10h6M7 13h4" },
  { href: "/owner/capture", label: "Capture order", icon: "M10 4v12M4 10h12" },
  { href: "/owner/production", label: "Production", icon: "M3 16V8l7-4 7 4v8M7 16v-5h6v5" },
];

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { state, me } = useStore();
  const urgent = attentionQueue(state.orders, state.now).length;
  return (
    <div className="owner">
      <nav className="side no-print" aria-label="Workspace">
        <div className="brand">
          <span className="brand-mark" aria-hidden>
            <svg viewBox="0 0 24 24" width="22" height="22"><rect x="3" y="5" width="18" height="15" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" /><path d="M7 10h10M7 14h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><path d="M8 5V3M16 5V3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
          </span>
          <span>
            <b>OrderPilot</b>
            <span className="small muted">{BUSINESS.name}</span>
          </span>
        </div>
        <ul>
          {NAV.map((n) => {
            const active = n.href === "/owner" ? path === "/owner" : path.startsWith(n.href);
            return (
              <li key={n.href}>
                <Link href={n.href} aria-current={active ? "page" : undefined}>
                  <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden><path d={n.icon} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  <span>{n.label}</span>
                  {n.href === "/owner" && urgent > 0 && <span className="count" aria-label={`${urgent} need attention`}>{urgent}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="side-foot">
          <Link href="/b/butterleaf" className="small">Open customer order page</Link>
          <div className="me">
            <Avatar name={me} size={32} />
            <span className="small">
              <b>{me}</b>
              <br />
              <span className="muted">Owner</span>
            </span>
          </div>
        </div>
      </nav>
      <main id="main" className="owner-main">{children}</main>
    </div>
  );
}
