"use client";

import Link from "next/link";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { addDays, BUSINESS, capacityFor, COMMITTED_STAGES, fmtDate, fmtDateTime, holdActive, lagosParts, orderUnits, PROTECTED_STAGES, STAGE_LABEL, STAGE_TONE, weekday } from "@/lib/rules";
import { Badge, CakeTop, WritingText } from "@/components/ui";

export default function Production() {
  const { state } = useStore();
  const today = lagosParts(state.now).date;
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i)).filter((d) => weekday(d) !== BUSINESS.closedWeekday);
  const [day, setDay] = useState(today);
  const committed = state.orders.filter((o) => o.fulfilment.date === day && ([...COMMITTED_STAGES, ...PROTECTED_STAGES, "delivered"].includes(o.stage)));
  const held = state.orders.filter((o) => o.fulfilment.date === day && holdActive(o, state.now));
  const cap = capacityFor(state.orders, day, state.now);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Production, {fmtDate(day, "long")}</h1>
          <p className="muted">{cap.committed} of {cap.limit} units committed, {cap.held} held by open quotes. Held cakes are not orders yet.</p>
        </div>
        <button className="btn btn-secondary no-print" onClick={() => window.print()}>Print sheets</button>
      </div>

      <div className="prod-days no-print" role="group" aria-label="Choose production day">
        {days.map((d) => (
          <button key={d} className="filter" aria-pressed={d === day} onClick={() => setDay(d)}>
            {d === today ? "Today" : fmtDate(d)}
          </button>
        ))}
      </div>

      {committed.length === 0 && held.length === 0 ? (
        <div className="panel panel-body"><p className="muted">No cakes planned for this day. Confirmed orders appear here by production date.</p></div>
      ) : (
        <div className="sheet-print">
          {[...committed, ...held].map((o) => {
            const isHeld = !committed.includes(o);
            const item = o.items[0];
            return (
              <article key={o.id} className={`docket${isHeld ? " held" : ""}`} aria-labelledby={`dk-${o.id}`}>
                <div className="docket-head">
                  <div>
                    <h2 id={`dk-${o.id}`}><Link href={`/owner/orders/${o.id}`} style={{ color: "inherit" }}>{o.id}</Link></h2>
                    <span className="small muted">Rev {o.revision}, {orderUnits(o)} units</span>
                  </div>
                  {isHeld ? <Badge tone="hold">Held, do not start</Badge> : <Badge tone={STAGE_TONE[o.stage]}>{STAGE_LABEL[o.stage]}</Badge>}
                </div>
                <div className="row" style={{ alignItems: "center" }}>
                  <CakeTop text={item.writing?.kind === "text" ? item.writing.text : ""} flavour={item.flavour} size={96} />
                  <div className="stack" style={{ "--gap": "2px" } as React.CSSProperties}>
                    <b>{item.qty} × {item.size}-inch {item.flavour?.toLowerCase()}, 2 layers</b>
                    <span className="small">{item.finish}</span>
                    <span className="small muted">{o.fulfilment.method === "pickup" ? "Pickup" : `Delivery, ${o.fulfilment.area}`}, {o.fulfilment.window}</span>
                  </div>
                </div>
                <div>
                  <div className="small muted">Writing, exactly as agreed</div>
                  <WritingText writing={item.writing} />
                </div>
                {o.dietaryNote && <div className="small" style={{ color: "var(--risk)", fontWeight: 600 }}>Dietary discussion on file. Read the order before starting.</div>}
                <p className="small muted" style={{ borderTop: "1px dashed var(--line-strong)", paddingTop: 8 }}>
                  Generated {fmtDateTime(state.now)}. Check the current revision before production.
                </p>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
