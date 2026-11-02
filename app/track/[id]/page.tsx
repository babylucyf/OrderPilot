"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useOrder, useStore } from "@/lib/store";
import { BUSINESS, CUSTOMER_STAGE, fmtDate, fmtDateTime, naira, payment, type Tone } from "@/lib/rules";
import type { Order, Stage } from "@/lib/types";
import { CakeTop, Glyph, WritingText } from "@/components/ui";
import "../../customer.css";

const MILESTONES: { label: string; reached: Stage[] }[] = [
  { label: "Request received", reached: ["submitted", "needs_clarification", "ready_to_quote", "awaiting_customer", "awaiting_payment", "ready_to_confirm", "confirmed", "in_production", "ready_for_handoff", "out_for_delivery", "delivered", "completed"] },
  { label: "Quote accepted", reached: ["awaiting_payment", "ready_to_confirm", "confirmed", "in_production", "ready_for_handoff", "out_for_delivery", "delivered", "completed"] },
  { label: "Deposit verified", reached: ["ready_to_confirm", "confirmed", "in_production", "ready_for_handoff", "out_for_delivery", "delivered", "completed"] },
  { label: "Order confirmed", reached: ["confirmed", "in_production", "ready_for_handoff", "out_for_delivery", "delivered", "completed"] },
  { label: "Being made", reached: ["in_production", "ready_for_handoff", "out_for_delivery", "delivered", "completed"] },
  { label: "Ready or on its way", reached: ["ready_for_handoff", "out_for_delivery", "delivered", "completed"] },
  { label: "Delivered or collected", reached: ["delivered", "completed"] },
];

export default function Track() {
  const { id } = useParams<{ id: string }>();
  const order = useOrder(id);
  const { ready } = useStore();

  if (!order)
    return (
      <main id="main" className="cust">
        <Header />
        <div className="step">
          <h1>{ready ? "We can’t find that order" : "Loading your order"}</h1>
          {ready && <p className="muted">Check the link from your message. If the demo was reset, start a new request on the <Link href="/b/butterleaf">order page</Link>.</p>}
        </div>
      </main>
    );

  return (
    <main id="main" className="cust">
      <Header />
      <div className="step">
        <Banner order={order} />
        <Action order={order} />
        <Summary order={order} />
        <Progress order={order} />
        <Updates order={order} />
        <section className="card stack" aria-labelledby="help-h" style={{ "--gap": "8px" } as React.CSSProperties}>
          <h2 id="help-h">Need to change something?</h2>
          <p className="small">Call or message {BUSINESS.name} with your reference <b>{order.id}</b>. Your current order stays as it is until the bakery agrees a change with you. Butterleaf is a fictional bakery, so there is no number to call in this demo.</p>
        </section>
        <p className="small muted">In the real product, this page opens only after you verify the phone or email you ordered with. A reference number alone doesn’t give access.</p>
      </div>
    </main>
  );
}

function Header() {
  return (
    <header className="cust-head">
      <span className="cust-logo" aria-hidden>B</span>
      <span>
        <b>{BUSINESS.name}</b>
        <span className="small muted">Your order</span>
      </span>
    </header>
  );
}

function Banner({ order }: { order: Order }) {
  const { state } = useStore();
  const p = payment(order);
  const late = order.issues.find((i) => i.kind === "late_payment" && i.status === "open");
  const delivery = order.issues.find((i) => i.kind === "recipient_unavailable" && i.status === "open");
  let tone: Tone = "review";
  let title = CUSTOMER_STAGE[order.stage];
  let body = "";
  const rejected = order.claims.filter((c) => c.status === "rejected").at(-1);

  if (delivery) {
    tone = "risk";
    title = "Your delivery is delayed";
    body = `Our rider couldn’t reach ${order.recipient?.name ?? "the recipient"} at the address. The rider is waiting nearby and the bakery will contact you shortly with a plan.`;
  } else if (late) {
    tone = "risk";
    title = "We received a payment after your quote expired";
    body = "The bakery is checking availability and will contact you about the next step. Your payment is on record and has not been lost.";
  } else
    switch (order.stage) {
      case "submitted":
      case "ready_to_quote":
        body = "Your order is not confirmed yet. The bakery is checking the details and will send your quote. You pay nothing until you accept it.";
        break;
      case "needs_clarification":
        tone = "hold";
        body = "The bakery needs a little more information before quoting. They will message you. Your order is not confirmed yet.";
        break;
      case "awaiting_customer":
        tone = "hold";
        body = order.quote && order.quote.expiresAt > state.now ? `Review and accept it by ${fmtDateTime(order.quote.expiresAt)} to keep your date.` : "This quote has expired. Contact the bakery for a new one.";
        break;
      case "awaiting_payment":
        if (p.pending.length) {
          tone = "review";
          title = "Your payment is being checked";
          body = "You’ll get a separate update when your order is confirmed. Please don’t pay again.";
        } else {
          tone = "hold";
          body = `Pay the ${naira(p.required)} deposit by ${fmtDateTime(order.quote!.expiresAt)} to keep your date.`;
        }
        break;
      case "ready_to_confirm":
        tone = "review";
        body = "Your deposit is verified. The bakery will confirm your order shortly. It is not confirmed until they do.";
        break;
      case "confirmed":
      case "in_production":
        tone = "ok";
        body = `Your cake is booked for ${fmtDate(order.fulfilment.date, "long")}, ${order.fulfilment.window}.`;
        break;
      case "ready_for_handoff":
        tone = "ok";
        body = order.fulfilment.method === "pickup" ? `Ready for pickup, ${order.fulfilment.window}.` : "Ready and waiting for the rider.";
        break;
      case "out_for_delivery":
        tone = "ok";
        body = `On its way, expected within ${order.fulfilment.window}.`;
        break;
      case "delivered":
      case "completed":
        tone = "done";
        body = "Handed over. If something isn’t right, contact the bakery with your reference.";
        break;
      case "expired":
        tone = "risk";
        body = "The date was released when the quote expired. Contact the bakery for a new quote.";
        break;
    }

  return (
    <div className={`state-banner t-${tone}`} role="status">
      <span className="row small" style={{ "--gap": "6px", fontWeight: 600 } as React.CSSProperties}><Glyph tone={tone} /> {order.id}</span>
      <h1 style={{ marginTop: 6 }}>{title}</h1>
      {body && <p style={{ marginTop: 8 }}>{body}</p>}
      {rejected && order.stage === "awaiting_payment" && !p.pending.length && (
        <p style={{ marginTop: 8 }}><b>Message from the bakery:</b> {rejected.note}</p>
      )}
    </div>
  );
}

function Action({ order }: { order: Order }) {
  const { state, dispatch } = useStore();
  const [ref, setRef] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const p = payment(order);
  const q = order.quote;
  if (!q) return null;
  const live = q.expiresAt > state.now;

  if (order.stage === "awaiting_customer" && live)
    return (
      <section className="card stack" aria-labelledby="quote-h" style={{ "--gap": "14px" } as React.CSSProperties}>
        <div className="spread"><h2 id="quote-h">Quote v{q.version}</h2><span className="small muted">Sent {fmtDateTime(q.publishedAt)}</span></div>
        {q.lines.map((l) => <div key={l.label} className="spread small"><span>{l.label}</span><span>{naira(l.amount)}</span></div>)}
        <div className="spread" style={{ borderTop: "1px solid var(--line)", paddingTop: 10 }}><b>Total</b><b>{naira(q.total)}</b></div>
        <div className="spread"><span>Deposit to book ({BUSINESS.depositPercent}%)</span><b>{naira(q.deposit)}</b></div>
        <div className="spread small"><span>Balance, due before {order.fulfilment.method === "pickup" ? "pickup" : "delivery"}</span><span>{naira(q.total - q.deposit)}</span></div>
        <p className="small muted">Your date is held until {fmtDateTime(q.expiresAt)}. After that, it may be offered to someone else. Changes after confirmation need the bakery’s agreement.</p>
        <button className="btn btn-primary" onClick={() => dispatch({ type: "accept_quote", id: order.id })}>Accept quote v{q.version}</button>
        <p className="small muted" style={{ textAlign: "center" }}>Something not right? Contact the bakery before accepting.</p>
      </section>
    );

  if (order.stage === "awaiting_payment" && !p.pending.length && live)
    return (
      <section className="card stack" aria-labelledby="pay-h" style={{ "--gap": "14px" } as React.CSSProperties}>
        <h2 id="pay-h">Pay your deposit</h2>
        <dl className="sumlist">
          <dt>Amount</dt><dd><b>{naira(p.required)}</b></dd>
          <dt>Bank</dt><dd>{BUSINESS.bank.name}</dd>
          <dt>Account</dt><dd>{BUSINESS.bank.account}, {BUSINESS.bank.accountName}</dd>
          <dt>Narration</dt><dd><b>{order.id}</b></dd>
          <dt>Pay by</dt><dd>{fmtDateTime(q.expiresAt)}</dd>
        </dl>
        <p className="small muted">Synthetic bank details for this prototype. The bakery will never ask for your PIN, password or OTP.</p>
        <form
          className="stack"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            if (busy) return;
            if (!ref.trim()) return setErr("Enter the name or reference on your transfer so the bakery can find it.");
            setBusy(true);
            dispatch({ type: "claim_payment", id: order.id, reference: ref.trim() });
          }}
        >
          <div className="field">
            <label htmlFor="pay-ref">Transfer reference or sender name</label>
            <input id="pay-ref" className="input" value={ref} onChange={(e) => { setRef(e.target.value); setErr(""); }} aria-invalid={!!err} aria-describedby={err ? "pay-err" : "pay-hint"} />
            {err ? <span id="pay-err" className="error-text">{err}</span> : <span id="pay-hint" className="hint">This tells the bakery the money is on its way. It doesn’t confirm your order.</span>}
          </div>
          <button className="btn btn-primary" type="submit" disabled={busy}>I’ve paid the deposit</button>
        </form>
      </section>
    );

  if (order.stage === "awaiting_payment" && p.pending.length)
    return (
      <section className="card stack" style={{ "--gap": "6px" } as React.CSSProperties} aria-label="Payment status">
        <div className="spread"><span>Deposit claimed</span><b>{naira(p.pendingAmount)}</b></div>
        <div className="spread small"><span>Verified so far</span><span>{naira(p.verified)}</span></div>
        <p className="small muted">Checking usually happens during opening hours. Your date stays held while the bakery checks.</p>
      </section>
    );

  if (["ready_to_confirm", "confirmed", "in_production", "ready_for_handoff", "out_for_delivery"].includes(order.stage))
    return (
      <section className="card stack" style={{ "--gap": "6px" } as React.CSSProperties} aria-label="Payment summary">
        <div className="spread"><span>Total</span><b>{naira(p.total)}</b></div>
        <div className="spread small"><span>Paid and verified</span><span>{naira(p.verified)}</span></div>
        <div className="spread small"><span>Balance</span><span>{p.balance ? `${naira(p.balance)}, due before ${order.fulfilment.method === "pickup" ? "pickup" : "delivery"}` : "Nothing left to pay"}</span></div>
      </section>
    );
  return null;
}

function Summary({ order }: { order: Order }) {
  const item = order.items[0];
  const f = order.fulfilment;
  return (
    <section className="card" aria-labelledby="sum-h">
      <h2 id="sum-h" style={{ marginBottom: 12 }}>{order.quote?.status === "accepted" ? "What you agreed" : "What you asked for"}</h2>
      <div style={{ display: "grid", placeItems: "center", marginBottom: 12 }}>
        <CakeTop text={item.writing?.kind === "text" ? item.writing.text : ""} flavour={item.flavour} size={180} />
      </div>
      <dl className="sumlist">
        <dt>Cake</dt><dd>{item.size ? `${item.size}-inch` : "Size to confirm"} {item.flavour?.toLowerCase() ?? ""}, {item.finish?.toLowerCase()}</dd>
        <dt>Writing</dt><dd><WritingText writing={item.writing} /></dd>
        <dt>When</dt><dd>{f.date ? fmtDate(f.date, "long") : "Date to confirm"}{f.window ? `, ${f.window}` : ""}</dd>
        <dt>{f.method === "pickup" ? "Pickup" : "Delivery"}</dt><dd>{f.method === "pickup" ? BUSINESS.area : `${f.address ?? "Address to confirm"}`}</dd>
        {order.recipient && (<><dt>For</dt><dd>{order.recipient.name}{order.recipient.surprise ? ", surprise" : ""}</dd></>)}
      </dl>
    </section>
  );
}

function Progress({ order }: { order: Order }) {
  if (["expired", "cancelled", "declined"].includes(order.stage)) return null;
  const nowIndex = MILESTONES.findIndex((m) => !m.reached.includes(order.stage));
  return (
    <section className="card" aria-labelledby="prog-h">
      <h2 id="prog-h" style={{ marginBottom: 14 }}>Progress</h2>
      <ol className="track-steps">
        {MILESTONES.map((m, i) => {
          const done = m.reached.includes(order.stage);
          const isNow = i === nowIndex;
          return (
            <li key={m.label} className={done ? "done" : isNow ? "now" : ""} aria-current={isNow ? "step" : undefined}>
              <span className="dotmark" aria-hidden>{done && <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 6.5 5 9l5-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>}</span>
              <span>
                <span style={{ fontWeight: done || isNow ? 600 : 400, color: done || isNow ? "var(--ink)" : "var(--ink-2)" }}>{m.label}</span>
                <span className="sr-only">{done ? ", done" : isNow ? ", next" : ", not yet"}</span>
              </span>
            </li>
          );
        })}
      </ol>
      <p className="small muted">Steps are only ticked when the bakery records them, never by the clock.</p>
    </section>
  );
}

function Updates({ order }: { order: Order }) {
  const events = order.events.filter((e) => e.customerVisible).reverse();
  if (!events.length) return null;
  return (
    <section className="card" aria-labelledby="up-h">
      <h2 id="up-h" style={{ marginBottom: 10 }}>Updates</h2>
      <ol className="stack" style={{ listStyle: "none", padding: 0, margin: 0, "--gap": "10px" } as React.CSSProperties} reversed>
        {events.map((e, i) => (
          <li key={i} className="small">
            <time dateTime={e.at} className="muted">{fmtDateTime(e.at)}</time>
            <div>{e.text}</div>
          </li>
        ))}
      </ol>
    </section>
  );
}
