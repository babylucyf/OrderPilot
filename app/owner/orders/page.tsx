"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useStore } from "@/lib/store";
import { fmtDate, fmtDateTime, lagosParts, payment, STAGE_LABEL, STAGE_TONE } from "@/lib/rules";
import { nextStep } from "@/lib/ops";
import { STAFF } from "@/lib/seed";
import { Badge, WritingText } from "@/components/ui";
import { Icon } from "@/components/icons";
import { Steps } from "@/components/Steps";
import type { Order } from "@/lib/types";

const CLOSED = ["completed", "cancelled", "expired", "declined", "delivered"];
const FILTERS: { id: string; label: string; test: (o: Order, today: string) => boolean }[] = [
  { id: "active", label: "Active", test: (o) => !CLOSED.includes(o.stage) || o.issues.some((i) => i.status === "open") },
  { id: "today", label: "Due today", test: (o, t) => o.fulfilment.date === t && !["cancelled", "expired"].includes(o.stage) },
  { id: "new", label: "New", test: (o) => ["submitted", "needs_clarification"].includes(o.stage) },
  { id: "payments", label: "Payments", test: (o) => payment(o).pending.length > 0 },
  { id: "confirm", label: "To confirm", test: (o) => o.stage === "ready_to_confirm" },
  { id: "closed", label: "Closed", test: (o) => CLOSED.includes(o.stage) },
];

function cake(o: Order) {
  const i = o.items[0];
  return `${i.qty > 1 ? i.qty + " × " : ""}${i.size ? i.size + "-inch" : "Size ?"} ${i.flavour?.toLowerCase() ?? "flavour ?"}`;
}

function OrdersInner() {
  const { state, dispatch } = useStore();
  const router = useRouter();
  const params = useSearchParams();
  const f = params.get("f") ?? "active";
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const today = lagosParts(state.now).date;
  const filter = FILTERS.find((x) => x.id === f) ?? FILTERS[0];

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return state.orders
      .filter((o) => filter.test(o, today))
      .filter((o) => !term || o.id.toLowerCase().includes(term) || o.buyer.name.toLowerCase().includes(term))
      .sort((a, b) => (a.fulfilment.date ?? "9999").localeCompare(b.fulfilment.date ?? "9999"));
  }, [state.orders, filter, q, today]);

  const visibleSel = sel.filter((id) => rows.some((r) => r.id === id));
  const allOn = rows.length > 0 && visibleSel.length === rows.length;
  const toggle = (id: string) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const selected = state.orders.filter((o) => visibleSel.includes(o.id));

  return (
    <>
      <div className="print-hide">
        <nav className="crumbs" aria-label="Breadcrumb"><Link href="/owner">Today</Link><Icon name="chevron" size={14} /><span aria-current="page">Orders</span></nav>
        <div className="page-head">
          <div>
            <h1>Orders</h1>
            <p>Earliest handoff first. Orders without an agreed date sit at the end.</p>
          </div>
          <div className="page-actions">
            <Link href="/owner/capture" className="btn btn-primary"><Icon name="plus" size={18} />Capture order</Link>
          </div>
        </div>

        <section className="panel" aria-label="Orders">
          <div className="toolbar">
            <div className="seg" role="group" aria-label="Filter orders">
              {FILTERS.map((x) => (
                <button key={x.id} type="button" aria-pressed={x.id === filter.id} onClick={() => { setSel([]); router.replace(`/owner/orders?f=${x.id}`, { scroll: false }); }}>
                  {x.label} <span className="n">{state.orders.filter((o) => x.test(o, today)).length}</span>
                </button>
              ))}
            </div>
            <label className="mini-search">
              <Icon name="search" size={18} />
              <span className="sr-only">Search by order number or buyer name</span>
              <input type="search" placeholder="Search order or buyer" value={q} onChange={(e) => setQ(e.target.value)} />
            </label>
          </div>
          <p className="sr-only" aria-live="polite">{rows.length} orders shown{notice ? `. ${notice}` : ""}</p>

          {rows.length === 0 ? (
            <div className="panel-body stack" style={{ "--gap": "6px", padding: 32, textAlign: "center", alignItems: "center" } as React.CSSProperties}>
              <h2>No matching orders</h2>
              <p className="muted">{q ? `Nothing in “${filter.label}” matches “${q}”.` : `There are no orders in “${filter.label}” right now.`}</p>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setQ(""); router.replace("/owner/orders"); }}>Show all active orders</button>
            </div>
          ) : (
            <>
              <div className="table-wrap collapse">
                <table className="orders-table">
                  <thead>
                    <tr>
                      <th scope="col"><input type="checkbox" className="check" aria-label="Select all shown orders" checked={allOn} onChange={() => setSel(allOn ? [] : rows.map((r) => r.id))} /></th>
                      <th scope="col">Order</th>
                      <th scope="col">Customer and cake</th>
                      <th scope="col">Handoff</th>
                      <th scope="col">Progress</th>
                      <th scope="col">Payment</th>
                      <th scope="col">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((o) => {
                      const p = payment(o);
                      const on = visibleSel.includes(o.id);
                      return (
                        <tr key={o.id} aria-selected={on} onClick={(e) => { if ((e.target as HTMLElement).closest("input,a")) return; router.push(`/owner/orders/${o.id}`); }}>
                          <td><input type="checkbox" className="check" aria-label={`Select ${o.id}`} checked={on} onChange={() => toggle(o.id)} /></td>
                          <td style={{ whiteSpace: "nowrap" }}><Link className="order-link" href={`/owner/orders/${o.id}`}>{o.id}</Link>{o.isNew && <span className="sub" style={{ color: "var(--blueberry)" }}>New</span>}</td>
                          <td style={{ whiteSpace: "nowrap" }}>{o.buyer.name}<span className="sub">{cake(o)}</span></td>
                          <td style={{ whiteSpace: "nowrap" }}>
                            {o.fulfilment.date ? fmtDate(o.fulfilment.date) : <span style={{ color: "var(--hold)" }}>Date unclear</span>}
                            <span className="sub">{o.fulfilment.method === "pickup" ? "Pickup" : o.fulfilment.method === "delivery" ? o.fulfilment.area : "Method unclear"}</span>
                          </td>
                          <td><Steps order={o} /></td>
                          <td><Badge tone={p.tone}>{p.label}</Badge></td>
                          <td><Badge tone={STAGE_TONE[o.stage]}>{STAGE_LABEL[o.stage]}</Badge></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <ul className="cards" style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {rows.map((o) => {
                  const p = payment(o);
                  const n = nextStep(o, state.orders, state.now);
                  return (
                    <li key={o.id} className="stack" style={{ "--gap": "10px", padding: "16px", borderTop: "1px solid var(--line)" } as React.CSSProperties}>
                      <div className="spread" style={{ alignItems: "center" }}>
                        <Link className="order-link" href={`/owner/orders/${o.id}`}>{o.id}, {o.buyer.name}</Link>
                        <Badge tone={STAGE_TONE[o.stage]}>{STAGE_LABEL[o.stage]}</Badge>
                      </div>
                      <span className="small muted">{cake(o)}, {o.fulfilment.date ? fmtDate(o.fulfilment.date) : "date unclear"}, {o.fulfilment.method ?? "method unclear"}</span>
                      <Steps order={o} />
                      <span className="row small" style={{ "--gap": "8px" } as React.CSSProperties}><Badge tone={p.tone}>{p.label}</Badge>{n && <span className="muted">Next: {n.title}</span>}</span>
                    </li>
                  );
                })}
              </ul>
              <div className="table-foot"><span>{rows.length} order{rows.length === 1 ? "" : "s"}</span><span>Synthetic data</span></div>
            </>
          )}
        </section>
      </div>

      {visibleSel.length > 0 && (
        <div className="bulk print-hide" role="region" aria-label="Bulk actions">
          <button type="button" onClick={() => setSel([])} aria-label="Clear selection"><Icon name="close" size={18} /></button>
          <span className="sel"><b>{visibleSel.length}</b>&nbsp;of {rows.length} selected</span>
          <span>
            <label htmlFor="assign" className="hide-sm">Assign to</label>
            <select
              id="assign"
              value=""
              onChange={(e) => {
                if (!e.target.value) return;
                dispatch({ type: "assign", ids: visibleSel, to: e.target.value });
                setNotice(`${visibleSel.length} orders assigned to ${e.target.value}`);
                setSel([]);
              }}
            >
              <option value="">Choose</option>
              {STAFF.map((s) => <option key={s.id} value={s.name}>{s.name}, {s.role}</option>)}
            </select>
          </span>
          <button type="button" onClick={() => window.print()}><Icon name="print" size={18} />Print sheets</button>
        </div>
      )}

      {/* Printed production sheets for the selected orders (PRD DASH-05, FUL-02) */}
      <div className="print-only">
        {selected.map((o) => (
          <article key={o.id} className="docket" style={{ marginBottom: 16 }}>
            <h2>{o.id}, rev {o.revision}</h2>
            <p>{o.items[0].qty} × {o.items[0].size}-inch {o.items[0].flavour?.toLowerCase()}, {o.items[0].finish}</p>
            <p>Writing, exactly as agreed: <WritingText writing={o.items[0].writing} /></p>
            <p>{o.fulfilment.method === "pickup" ? "Pickup" : `Delivery, ${o.fulfilment.area}`}, {fmtDate(o.fulfilment.date, "long")}, {o.fulfilment.window}</p>
            <p className="small">Assigned to {o.assignee}. Generated {fmtDateTime(state.now)}. Check the current revision before production.</p>
          </article>
        ))}
      </div>
    </>
  );
}

export default function OrdersPage() {
  return (
    <Suspense>
      <OrdersInner />
    </Suspense>
  );
}
