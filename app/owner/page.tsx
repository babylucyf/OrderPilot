"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { attentionQueue } from "@/lib/ops";
import { addDays, BUSINESS, capacityFor, fmtDate, lagosParts, payment, STAGE_LABEL, STAGE_TONE, weekday } from "@/lib/rules";
import { Avatar, Badge } from "@/components/ui";

const TONE_COLOR = { risk: "var(--risk)", review: "var(--review)", hold: "var(--hold)", ok: "var(--ok)", done: "var(--done)", neutral: "var(--line-strong)" };

export default function Today() {
  const { state } = useStore();
  const { orders, now } = state;
  const today = lagosParts(now).date;
  const queue = attentionQueue(orders, now);
  const due = orders
    .filter((o) => o.fulfilment.date === today && !["cancelled", "expired", "declined"].includes(o.stage))
    .sort((a, b) => (a.fulfilment.window ?? "").localeCompare(b.fulfilment.window ?? ""));
  const claims = orders.filter((o) => payment(o).pending.length > 0);
  const toConfirm = orders.filter((o) => o.stage === "ready_to_confirm");
  const week = Array.from({ length: 7 }, (_, i) => addDays(today, i));
  const weekFree = week.filter((d) => weekday(d) !== BUSINESS.closedWeekday).reduce((s, d) => s + capacityFor(orders, d, now).free, 0);
  const newCount = orders.filter((o) => o.stage === "submitted").length;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Today, {fmtDate(today, "long")}</h1>
          <p className="muted">
            {queue.length ? `${queue.length} things need a decision. Most urgent first.` : "Nothing needs a decision right now."}
            {newCount > 0 && ` ${newCount} new request${newCount > 1 ? "s" : ""} arrived.`}
          </p>
        </div>
        <p className="small muted">Updated {lagosParts(now).time}, Lagos time (WAT)</p>
      </div>

      <div className="snap">
        <Link href="/owner/orders?f=today"><b>{due.length}</b><span>Handoffs due today</span></Link>
        <Link href="/owner/orders?f=payments"><b>{claims.length}</b><span>Payments to check</span></Link>
        <Link href="/owner/orders?f=confirm"><b>{toConfirm.length}</b><span>Ready to confirm</span></Link>
        <Link href="/owner/production"><b>{weekFree}</b><span>Units free, next 7 days</span></Link>
      </div>

      <div className="today-grid">
        <section className="panel" aria-labelledby="q-h">
          <div className="panel-head">
            <h2 id="q-h">Needs attention</h2>
            <span className="small muted">Ranked by risk to a promise, then due time</span>
          </div>
          {queue.length === 0 ? (
            <p className="panel-body muted">You are clear. New requests and payment claims will appear here.</p>
          ) : (
            <ul className="queue" style={{ marginTop: 12 }}>
              {queue.map(({ order: o, step }) => (
                <li key={o.id}>
                  <span className="bar" style={{ background: TONE_COLOR[step.tone] }} aria-hidden />
                  <div className="what">
                    <b>
                      <Link href={`/owner/orders/${o.id}`}>{step.title}</Link>
                    </b>
                    <span className="small">{step.reason}</span>
                    <span className="meta">
                      <span>{o.id}, {o.buyer.name}</span>
                      <Badge tone={STAGE_TONE[o.stage]}>{STAGE_LABEL[o.stage]}</Badge>
                      {o.isNew && <Badge tone="review">New</Badge>}
                      <span className="row" style={{ "--gap": "6px" } as React.CSSProperties}>
                        <Avatar name={o.assignee} size={20} /> {o.assignee.split(" ")[0]}
                      </span>
                    </span>
                  </div>
                  <Link className="btn btn-secondary btn-sm" href={`/owner/orders/${o.id}`} aria-label={`Open ${o.id}: ${step.title}`}>
                    Open
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="stack" style={{ "--gap": "20px" } as React.CSSProperties}>
          <section className="panel" aria-labelledby="d-h">
            <div className="panel-head">
              <h2 id="d-h">Handoffs today</h2>
              <Link href="/owner/production" className="small">Production sheet</Link>
            </div>
            <div className="panel-body">
              {due.length === 0 ? (
                <p className="muted">No pickups or deliveries today.</p>
              ) : (
                <ul className="due-list">
                  {due.map((o) => (
                    <li key={o.id}>
                      <span className="due-time">{o.fulfilment.window?.split(" ")[0]}</span>
                      <span className="stack" style={{ "--gap": "2px" } as React.CSSProperties}>
                        <Link href={`/owner/orders/${o.id}`} className="order-link">{o.id}, {o.buyer.name}</Link>
                        <span className="small muted">
                          {o.fulfilment.method === "pickup" ? "Pickup" : `Delivery to ${o.fulfilment.area}`}, {o.fulfilment.window}
                        </span>
                        <span><Badge tone={STAGE_TONE[o.stage]}>{STAGE_LABEL[o.stage]}</Badge></span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section className="panel" aria-labelledby="c-h">
            <div className="panel-head">
              <h2 id="c-h">Capacity, next 7 days</h2>
              <span className="small muted">Limit {BUSINESS.dailyUnitLimit} units a day</span>
            </div>
            <div className="panel-body">
              <div className="cap-week">
                {week.map((d) => {
                  const closed = weekday(d) === BUSINESS.closedWeekday;
                  const c = capacityFor(orders, d, now);
                  const label = closed ? "Closed" : `${c.committed} committed, ${c.held} held, ${c.free} free`;
                  return (
                    <div key={d} className={`cap-day${d === today ? " today" : ""}${closed ? " closed" : ""}`}>
                      <div className="cap-col" role="img" aria-label={`${fmtDate(d)}: ${label}`}>
                        {!closed && (
                          <>
                            <span className="c" style={{ height: `${(c.committed / c.limit) * 100}%` }} />
                            <span className="h" style={{ height: `${(c.held / c.limit) * 100}%` }} />
                          </>
                        )}
                      </div>
                      <b>{fmtDate(d).split(" ")[0]}</b>
                      <span className="muted">{closed ? "Closed" : `${c.free} free`}</span>
                    </div>
                  );
                })}
              </div>
              <div className="legend-row">
                <span><span className="swatch" style={{ background: "var(--ink)" }} />Committed or paid</span>
                <span><span className="swatch" style={{ background: "repeating-linear-gradient(135deg, var(--hold) 0 3px, var(--hold-tint) 3px 7px)" }} />Held by a quote</span>
                <span><span className="swatch" />Free</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
