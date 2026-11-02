"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useStore } from "@/lib/store";
import { fmtDate, lagosParts, payment, STAGE_LABEL, STAGE_TONE } from "@/lib/rules";
import { nextStep } from "@/lib/ops";
import { Badge } from "@/components/ui";
import type { Order } from "@/lib/types";

const CLOSED = ["completed", "cancelled", "expired", "declined", "delivered"];
const FILTERS: { id: string; label: string; test: (o: Order, today: string) => boolean }[] = [
  { id: "active", label: "Active", test: (o) => !CLOSED.includes(o.stage) || o.issues.some((i) => i.status === "open") },
  { id: "today", label: "Due today", test: (o, t) => o.fulfilment.date === t && !["cancelled", "expired"].includes(o.stage) },
  { id: "new", label: "New and unclear", test: (o) => ["submitted", "needs_clarification"].includes(o.stage) },
  { id: "payments", label: "Payments to check", test: (o) => payment(o).pending.length > 0 },
  { id: "confirm", label: "Ready to confirm", test: (o) => o.stage === "ready_to_confirm" },
  { id: "closed", label: "Closed", test: (o) => CLOSED.includes(o.stage) },
];

function cake(o: Order) {
  const i = o.items[0];
  return `${i.qty > 1 ? i.qty + " × " : ""}${i.size ? i.size + "-inch" : "Size ?"} ${i.flavour?.toLowerCase() ?? "flavour ?"}`;
}

function OrdersInner() {
  const { state } = useStore();
  const router = useRouter();
  const params = useSearchParams();
  const f = params.get("f") ?? "active";
  const [q, setQ] = useState("");
  const today = lagosParts(state.now).date;
  const filter = FILTERS.find((x) => x.id === f) ?? FILTERS[0];

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return state.orders
      .filter((o) => filter.test(o, today))
      .filter((o) => !term || o.id.toLowerCase().includes(term) || o.buyer.name.toLowerCase().includes(term))
      .sort((a, b) => (a.fulfilment.date ?? "9999").localeCompare(b.fulfilment.date ?? "9999"));
  }, [state.orders, filter, q, today]);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Orders</h1>
          <p className="muted">Sorted by fulfilment date, earliest first. Orders without a date sit at the end.</p>
        </div>
        <Link href="/owner/capture" className="btn btn-primary">Capture an order</Link>
      </div>

      <div className="spread" style={{ marginBottom: 4 }}>
        <div className="filters" role="group" aria-label="Filter orders">
          {FILTERS.map((x) => (
            <button key={x.id} type="button" className="filter" aria-pressed={x.id === filter.id} onClick={() => router.replace(`/owner/orders?f=${x.id}`, { scroll: false })}>
              {x.label} <span className="muted" style={{ color: "inherit", opacity: 0.75 }}>{state.orders.filter((o) => x.test(o, today)).length}</span>
            </button>
          ))}
        </div>
        <div className="field" style={{ width: "min(280px, 100%)" }}>
          <label htmlFor="search" className="sr-only">Search by order number or buyer name</label>
          <input id="search" className="input" type="search" placeholder="Search order or buyer" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      <p className="sr-only" aria-live="polite">{rows.length} orders shown</p>

      {rows.length === 0 ? (
        <div className="panel panel-body">
          <h2>No matching orders</h2>
          <p className="muted">
            {q ? `Nothing in “${filter.label}” matches “${q}”. ` : `There are no orders in “${filter.label}” right now. `}
            <button type="button" className="btn btn-quiet btn-sm" onClick={() => { setQ(""); router.replace("/owner/orders"); }}>Show all active orders</button>
          </p>
        </div>
      ) : (
        <>
          <div className="panel table-wrap collapse" tabIndex={0} aria-label="Orders table">
            <table>
              <thead>
                <tr>
                  <th scope="col">Order</th>
                  <th scope="col">Cake</th>
                  <th scope="col">Handoff</th>
                  <th scope="col">Stage</th>
                  <th scope="col">Payment</th>
                  <th scope="col">Next step</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((o) => {
                  const p = payment(o);
                  const n = nextStep(o, state.orders, state.now);
                  return (
                    <tr key={o.id}>
                      <td>
                        <Link className="order-link" href={`/owner/orders/${o.id}`}>{o.id}</Link>
                        <div className="small muted">{o.buyer.name}</div>
                      </td>
                      <td>{cake(o)}</td>
                      <td>
                        {o.fulfilment.date ? fmtDate(o.fulfilment.date) : <span style={{ color: "var(--hold)" }}>Date unclear</span>}
                        <div className="small muted">{o.fulfilment.method === "pickup" ? "Pickup" : o.fulfilment.method === "delivery" ? o.fulfilment.area : "Method unclear"}</div>
                      </td>
                      <td><Badge tone={STAGE_TONE[o.stage]}>{STAGE_LABEL[o.stage]}</Badge></td>
                      <td>
                        <Badge tone={p.tone}>{p.label}</Badge>
                      </td>
                      <td className="small">{n ? n.title : <span className="muted">None</span>}</td>
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
                <li key={o.id} className="panel panel-body stack" style={{ "--gap": "8px" } as React.CSSProperties}>
                  <div className="spread">
                    <Link className="order-link" href={`/owner/orders/${o.id}`}>{o.id}, {o.buyer.name}</Link>
                    <Badge tone={STAGE_TONE[o.stage]}>{STAGE_LABEL[o.stage]}</Badge>
                  </div>
                  <span className="small">{cake(o)}, {o.fulfilment.date ? fmtDate(o.fulfilment.date) : "date unclear"}, {o.fulfilment.method ?? "method unclear"}</span>
                  <span className="row small" style={{ "--gap": "8px" } as React.CSSProperties}><Badge tone={p.tone}>{p.label}</Badge>{n && <span>Next: {n.title}</span>}</span>
                </li>
              );
            })}
          </ul>
        </>
      )}
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
