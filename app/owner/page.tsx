"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { attentionQueue } from "@/lib/ops";
import { addDays, BUSINESS, capacityFor, fmtDate, fmtTime, lagosParts, naira, payment, STAGE_LABEL, STAGE_TONE, weekday } from "@/lib/rules";
import { Avatar, Badge } from "@/components/ui";
import { Icon } from "@/components/icons";

const PRIORITY: Record<string, { label: string; tone: "risk" | "hold" | "review" }> = {
  risk: { label: "Urgent", tone: "risk" },
  hold: { label: "Soon", tone: "hold" },
  review: { label: "Decide", tone: "review" },
  ok: { label: "Soon", tone: "hold" },
  done: { label: "Later", tone: "review" },
  neutral: { label: "Later", tone: "review" },
};

export default function Today() {
  const { state } = useStore();
  const router = useRouter();
  const { orders, now } = state;
  const today = lagosParts(now).date;
  const queue = attentionQueue(orders, now);
  const due = orders
    .filter((o) => o.fulfilment.date === today && !["cancelled", "expired", "declined"].includes(o.stage))
    .sort((a, b) => (a.fulfilment.window ?? "").localeCompare(b.fulfilment.window ?? ""));
  const claims = orders.filter((o) => payment(o).pending.length > 0);
  const claimed = claims.reduce((s, o) => s + payment(o).pendingAmount, 0);
  const toConfirm = orders.filter((o) => o.stage === "ready_to_confirm");
  const week = Array.from({ length: 7 }, (_, i) => addDays(today, i));
  const open = week.filter((d) => weekday(d) !== BUSINESS.closedWeekday);
  const weekFree = open.reduce((s, d) => s + capacityFor(orders, d, now).free, 0);
  const deliveries = due.filter((o) => o.fulfilment.method === "delivery").length;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Today</h1>
          <p>{fmtDate(today, "long")}. Updated {lagosParts(now).time}, Lagos time.</p>
        </div>
        <div className="page-actions">
          <Link href="/owner/production" className="btn btn-secondary"><Icon name="print" size={18} />Production sheets</Link>
          <Link href="/owner/capture" className="btn btn-primary"><Icon name="plus" size={18} />Capture order</Link>
        </div>
      </div>

      <div className="kpis">
        <Link className="kpi" href="/owner/orders?f=today">
          <span className="kpi-label">Handoffs today</span>
          <span className="kpi-value">{due.length}</span>
          <span className="kpi-foot">{deliveries} deliver{deliveries === 1 ? "y" : "ies"}, {due.length - deliveries} pickup{due.length - deliveries === 1 ? "" : "s"}</span>
          <span className="kpi-icon ic-blue"><Icon name="truck" /></span>
        </Link>
        <Link className="kpi" href="/owner/orders?f=payments">
          <span className="kpi-label">Payments to check</span>
          <span className="kpi-value">{claims.length}</span>
          <span className="kpi-foot">{claims.length ? `${naira(claimed)} claimed, not yet verified` : "No claims waiting"}</span>
          <span className="kpi-icon ic-amber"><Icon name="wallet" /></span>
        </Link>
        <Link className="kpi" href="/owner/orders?f=confirm">
          <span className="kpi-label">Ready to confirm</span>
          <span className="kpi-value">{toConfirm.length}</span>
          <span className="kpi-foot">Deposit verified, waiting on you</span>
          <span className="kpi-icon ic-green"><Icon name="confirm" /></span>
        </Link>
        <Link className="kpi" href="/owner/production">
          <span className="kpi-label">Free capacity</span>
          <span className="kpi-value">{weekFree}<small>units</small></span>
          <span className="kpi-foot">Next 7 days, of {open.length * BUSINESS.dailyUnitLimit}</span>
          <span className="kpi-icon ic-violet"><Icon name="calendar" /></span>
        </Link>
      </div>

      <div className="today-grid">
        <section className="panel" aria-labelledby="q-h">
          <div className="panel-head">
            <h2 id="q-h">Needs attention <span className="muted" style={{ fontWeight: 500 }}>{queue.length}</span></h2>
            <span className="small muted">Most urgent first</span>
          </div>
          {queue.length === 0 ? (
            <p className="panel-body muted">You’re clear. New requests and payment claims will appear here.</p>
          ) : (
            <>
              <div className="table-wrap attn-table">
                <table className="attn">
                  <thead>
                    <tr>
                      <th scope="col">Priority</th>
                      <th scope="col">What to do</th>
                      <th scope="col">Order</th>
                      <th scope="col">Owner</th>
                    </tr>
                  </thead>
                  <tbody>
                    {queue.map(({ order: o, step }) => {
                      const pr = PRIORITY[step.tone];
                      return (
                        <tr key={o.id} onClick={() => router.push(`/owner/orders/${o.id}`)}>
                          <td><Badge tone={pr.tone}>{pr.label}</Badge></td>
                          <td style={{ maxWidth: 420 }}>
                            <span className="task">
                              <Link href={`/owner/orders/${o.id}`}>{step.title}</Link>
                              <span>{step.reason}</span>
                            </span>
                          </td>
                          <td style={{ whiteSpace: "nowrap" }}>
                            <span className="oid">{o.id}</span>
                            <span className="sub">{o.buyer.name}</span>
                          </td>
                          <td><span className="person"><Avatar name={o.assignee} size={28} />{o.assignee.split(" ")[0]}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <ul className="attn-cards">
                {queue.map(({ order: o, step }) => {
                  const pr = PRIORITY[step.tone];
                  return (
                    <li key={o.id}>
                      <span className="row" style={{ "--gap": "8px" } as React.CSSProperties}><Badge tone={pr.tone}>{pr.label}</Badge><span className="small muted">{o.id}, {o.buyer.name}</span></span>
                      <span className="task"><Link href={`/owner/orders/${o.id}`}>{step.title}</Link><span>{step.reason}</span></span>
                      <span className="person small muted"><Avatar name={o.assignee} size={22} />{o.assignee}</span>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </section>

        <div className="stack" style={{ "--gap": "20px" } as React.CSSProperties}>
          <section className="panel" aria-labelledby="d-h">
            <div className="panel-head">
              <h2 id="d-h">Handoffs today</h2>
              <Link href="/owner/orders?f=today" className="small">View all</Link>
            </div>
            {due.length === 0 ? (
              <p className="panel-body muted">No pickups or deliveries today.</p>
            ) : (
              <ul className="due-list">
                {due.map((o) => (
                  <li key={o.id}>
                    <span className="due-time">{o.fulfilment.window?.split(" ")[0]}</span>
                    <span className="stack" style={{ "--gap": "4px" } as React.CSSProperties}>
                      <Link href={`/owner/orders/${o.id}`} className="order-link">{o.id}, {o.buyer.name}</Link>
                      <span className="small muted">{o.fulfilment.method === "pickup" ? "Pickup" : `Delivery to ${o.fulfilment.area}`}, until {o.fulfilment.window?.split(" to ")[1]}</span>
                      <span><Badge tone={STAGE_TONE[o.stage]}>{STAGE_LABEL[o.stage]}</Badge></span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="panel" aria-labelledby="c-h">
            <div className="panel-head">
              <h2 id="c-h">Capacity</h2>
              <span className="small muted">{BUSINESS.dailyUnitLimit} units a day</span>
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
                      <span>{closed ? "Closed" : `${c.free} free`}</span>
                    </div>
                  );
                })}
              </div>
              <div className="legend-row">
                <span><span className="swatch" style={{ background: "var(--blueberry)" }} />Committed</span>
                <span><span className="swatch" style={{ background: "repeating-linear-gradient(135deg, #8ea9f5 0 2px, #dde6fd 2px 4px)" }} />Held by a quote</span>
                <span><span className="swatch" style={{ background: "var(--sunk)", border: "1px solid var(--line-strong)" }} />Free</span>
              </div>
              <p className="small muted" style={{ marginTop: 10 }}>Held units free up if the deposit isn’t verified before the quote expires. Checked at {fmtTime(now)}.</p>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
