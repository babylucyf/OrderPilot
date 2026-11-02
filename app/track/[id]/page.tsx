"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useOrder, useStore } from "@/lib/store";
import { BUSINESS, fmtDate, fmtDateTime, naira, payment, quoteLines, type Tone } from "@/lib/rules";
import type { Order, Stage } from "@/lib/types";
import { CakeTop, WritingText } from "@/components/ui";
import { Spot, type SpotKind } from "@/components/Spot";
import { CustHead, SwitchSide } from "@/components/Cust";
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
        <CustHead sub="Your order" />
        <div className="hero">
          <Spot kind="question" tone="done" />
          <h1>{ready ? "We can’t find that order" : "Loading your order"}</h1>
          {ready && <p>Check the link from your message. If the demo was reset, start a new request.</p>}
        </div>
        {ready && <Link className="btn-pill" href="/b/butterleaf" style={{ marginTop: 24 }}>Order a cake</Link>}
        <SwitchSide />
      </main>
    );

  const s = status(order);
  return (
    <main id="main" className="cust">
      <CustHead sub={`Order ${order.id}`} />
      <div className="hero" role="status">
        <Spot kind={s.spot} tone={s.tone} />
        <h1>{s.title}</h1>
        <p>{s.body}</p>
      </div>
      <div className="step">
        <Item order={order} />
        <Action order={order} note={s.note} tone={s.tone} />
        <Summary order={order} />
        <Progress order={order} />
        <Updates order={order} />
        <div className="card">
          <h2>Need to change something?</h2>
          <p className="small" style={{ color: "var(--ink-2)", marginTop: 6 }}>
            Contact {BUSINESS.name} with your reference <b>{order.id}</b>. Your order stays as it is until the bakery agrees a change with you. Butterleaf is a fictional bakery, so there is no number to call in this demo.
          </p>
        </div>
        <p className="small muted" style={{ textAlign: "center" }}>In the real product, this page opens only after you verify the phone or email you ordered with.</p>
        <SwitchSide />
      </div>
    </main>
  );
}

function status(order: Order): { spot: SpotKind; tone: Tone; title: string; body: string; note: string } {
  const p = payment(order);
  const late = order.issues.find((i) => i.kind === "late_payment" && i.status === "open");
  const delivery = order.issues.find((i) => i.kind === "recipient_unavailable" && i.status === "open");
  const rejected = order.claims.filter((c) => c.status === "rejected").at(-1);
  const when = `${fmtDate(order.fulfilment.date, "long")}, ${order.fulfilment.window}`;
  if (delivery) return { spot: "alert", tone: "risk", title: "Delivery delayed", body: `Our rider couldn’t reach ${order.recipient?.name ?? "the recipient"}. The bakery will contact you shortly with a plan.`, note: "Your cake is safe with the rider" };
  if (late) return { spot: "alert", tone: "risk", title: "Payment arrived late", body: "We received a payment after your quote expired. The bakery is checking availability and will contact you.", note: "Your payment is on record and has not been lost" };
  switch (order.stage) {
    case "submitted":
    case "ready_to_quote":
      return { spot: "request", tone: "review", title: "Request received", body: "The bakery is checking the details and will send your quote.", note: "Not confirmed yet. You pay nothing until you accept a quote" };
    case "needs_clarification":
      return { spot: "question", tone: "hold", title: "One quick question", body: "The bakery needs a little more information before quoting. They’ll message you.", note: "Not confirmed yet" };
    case "awaiting_customer":
      return { spot: "quote", tone: "hold", title: "Your quote is ready", body: "Check the price and details, then accept to keep your date.", note: `Date held until ${fmtDateTime(order.quote!.expiresAt)}` };
    case "awaiting_payment":
      if (p.pending.length) return { spot: "checking", tone: "review", title: "Checking your payment", body: "The bakery is matching your transfer. Please don’t pay again.", note: "Payment being checked. Not confirmed yet" };
      return { spot: "wallet", tone: "hold", title: "Pay your deposit", body: rejected ? `Message from the bakery: ${rejected.note}` : `Pay ${naira(p.required)} to keep your date.`, note: `Pay by ${fmtDateTime(order.quote!.expiresAt)}` };
    case "ready_to_confirm":
      return { spot: "checking", tone: "review", title: "Payment verified", body: "The bakery will confirm your order shortly. It isn’t confirmed until they do.", note: "Deposit verified, awaiting confirmation" };
    case "confirmed":
      return { spot: "cake", tone: "ok", title: "Order confirmed", body: `Your cake is booked for ${when}.`, note: "Confirmed by the bakery" };
    case "in_production":
      return { spot: "cake", tone: "ok", title: "Being made", body: `Your cake is being made for ${when}.`, note: "Confirmed and in production" };
    case "ready_for_handoff":
      return order.fulfilment.method === "pickup"
        ? { spot: "bag", tone: "ok", title: "Ready for pickup", body: `Collect from ${BUSINESS.area}, ${order.fulfilment.window}.`, note: p.balance ? `${naira(p.balance)} balance due at pickup` : "Fully paid" }
        : { spot: "bag", tone: "ok", title: "Ready", body: "Your cake is boxed and waiting for the rider.", note: "Confirmed and ready" };
    case "out_for_delivery":
      return { spot: "scooter", tone: "ok", title: "On its way", body: `Expected within ${order.fulfilment.window}.`, note: "Your order is confirmed and in transit" };
    case "delivered":
    case "completed":
      return { spot: "done", tone: "done", title: "Handed over", body: "Enjoy the celebration. If something isn’t right, contact the bakery.", note: "Delivered" };
    case "expired":
      return { spot: "alert", tone: "risk", title: "Quote expired", body: "The date was released when the quote expired. Contact the bakery for a new quote.", note: "No booking is active" };
    default:
      return { spot: "done", tone: "done", title: "Order closed", body: "", note: "" };
  }
}

function Item({ order }: { order: Order }) {
  const item = order.items[0];
  const total = order.quote?.total ?? (item.size && item.flavour ? quoteLines(order).total : 0);
  return (
    <div className="card item">
      <span className="thumb"><CakeTop text={item.writing?.kind === "text" ? item.writing.text : ""} flavour={item.flavour} size={68} /></span>
      <span>
        <span className="kind">Celebration cake</span>
        <span className="name" style={{ display: "block" }}>{item.qty > 1 ? `${item.qty} × ` : ""}{item.size ? `${item.size}-inch` : "Size to confirm"} {item.flavour?.toLowerCase() ?? ""}</span>
        <span className="meta">{item.finish}</span>
      </span>
      <span className="price">{total ? naira(total) : "Quote due"}{!order.quote && total ? <span className="meta" style={{ display: "block", fontWeight: 400 }}>estimate</span> : null}</span>
    </div>
  );
}

function Action({ order, note, tone }: { order: Order; note: string; tone: Tone }) {
  const { state, dispatch } = useStore();
  const [ref, setRef] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const p = payment(order);
  const q = order.quote;
  const live = !!q && q.expiresAt > state.now;
  const Note = () => (note ? <p className={`cta-note ${tone}`}>{note}</p> : null);

  if (q && order.stage === "awaiting_customer" && live)
    return (
      <section aria-labelledby="quote-h">
        <div className="card">
          <div className="card-head"><h2 id="quote-h">Quote v{q.version}</h2><span className="small muted">Sent {fmtDateTime(q.publishedAt)}</span></div>
          <dl className="rows money">
            {q.lines.map((l) => <div key={l.label}><dt>{l.label}</dt><dd>{naira(l.amount)}</dd></div>)}
            <div className="total"><dt>Total</dt><dd>{naira(q.total)}</dd></div>
            <div><dt>Deposit to book ({BUSINESS.depositPercent}%)</dt><dd>{naira(q.deposit)}</dd></div>
            <div><dt>Balance before {order.fulfilment.method === "pickup" ? "pickup" : "delivery"}</dt><dd>{naira(q.total - q.deposit)}</dd></div>
          </dl>
        </div>
        <div style={{ marginTop: 18 }}>
          <button className="btn-pill" onClick={() => dispatch({ type: "accept_quote", id: order.id })}>Accept quote v{q.version}</button>
          <Note />
        </div>
      </section>
    );

  if (q && order.stage === "awaiting_payment" && !p.pending.length && live)
    return (
      <section aria-labelledby="pay-h">
        <div className="card">
          <div className="card-head"><h2 id="pay-h">Bank transfer</h2><span className="small muted">Synthetic details</span></div>
          <dl className="rows">
            <div><dt>Amount</dt><dd>{naira(p.required)}</dd></div>
            <div><dt>Bank</dt><dd>{BUSINESS.bank.name}</dd></div>
            <div><dt>Account</dt><dd>{BUSINESS.bank.account}</dd></div>
            <div><dt>Account name</dt><dd>{BUSINESS.bank.accountName}</dd></div>
            <div><dt>Narration</dt><dd>{order.id}</dd></div>
          </dl>
        </div>
        <form
          className="stack"
          style={{ marginTop: 18 }}
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
            {err ? <span id="pay-err" className="error-text">{err}</span> : <span id="pay-hint" className="hint">This tells the bakery the money is on its way. It doesn’t confirm your order. The bakery never asks for your PIN or OTP.</span>}
          </div>
          <button className="btn-pill" type="submit" disabled={busy}>I’ve paid the deposit</button>
          <Note />
        </form>
      </section>
    );

  if (q && ["awaiting_payment", "ready_to_confirm", "confirmed", "in_production", "ready_for_handoff", "out_for_delivery", "delivered", "completed"].includes(order.stage))
    return (
      <section>
        <div className="card">
          <div className="card-head"><h2>Payment</h2></div>
          <dl className="rows">
            <div><dt>Total</dt><dd>{naira(p.total)}</dd></div>
            {p.pending.length > 0 && <div><dt>Being checked</dt><dd>{naira(p.pendingAmount)}</dd></div>}
            <div><dt>Paid and verified</dt><dd>{naira(p.verified)}</dd></div>
            <div className="total"><dt>Balance</dt><dd>{p.balance ? naira(p.balance) : "Nothing left"}</dd></div>
          </dl>
        </div>
        <Note />
      </section>
    );
  return <Note />;
}

function Summary({ order }: { order: Order }) {
  const item = order.items[0];
  const f = order.fulfilment;
  return (
    <section className="card" aria-labelledby="sum-h">
      <div className="card-head"><h2 id="sum-h">{order.quote?.status === "accepted" ? "What you agreed" : "Order summary"}</h2></div>
      <dl className="rows">
        <div><dt>Order ID</dt><dd>{order.id}</dd></div>
        <div><dt>Writing</dt><dd><WritingText writing={item.writing} /></dd></div>
        <div><dt>Date</dt><dd>{f.date ? fmtDate(f.date, "long") : "To confirm"}</dd></div>
        <div><dt>Time</dt><dd>{f.window ?? "To confirm"}</dd></div>
        <div><dt>{f.method === "pickup" ? "Pickup" : "Deliver to"}</dt><dd>{f.method === "pickup" ? BUSINESS.area : f.address ?? "To confirm"}</dd></div>
        {order.recipient && <div><dt>For</dt><dd>{order.recipient.name}{order.recipient.surprise ? ", surprise" : ""}</dd></div>}
      </dl>
    </section>
  );
}

function Progress({ order }: { order: Order }) {
  if (["expired", "cancelled", "declined"].includes(order.stage)) return null;
  const nowIndex = MILESTONES.findIndex((m) => !m.reached.includes(order.stage));
  return (
    <section className="card" aria-labelledby="prog-h">
      <div className="card-head"><h2 id="prog-h">Progress</h2></div>
      <ol className="track-steps">
        {MILESTONES.map((m, i) => {
          const done = m.reached.includes(order.stage);
          const isNow = i === nowIndex;
          return (
            <li key={m.label} className={done ? "done" : isNow ? "now" : ""} aria-current={isNow ? "step" : undefined}>
              <span className="dotmark" aria-hidden>{done && <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 6.5 5 9l5-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>}</span>
              <span>
                <span style={{ fontWeight: done || isNow ? 500 : 400, color: done || isNow ? "var(--ink)" : "var(--ink-3)" }}>{m.label}</span>
                <span className="sr-only">{done ? ", done" : isNow ? ", next" : ", not yet"}</span>
              </span>
            </li>
          );
        })}
      </ol>
      <p className="small muted">Ticked only when the bakery records it, never by the clock.</p>
    </section>
  );
}

function Updates({ order }: { order: Order }) {
  const events = order.events.filter((e) => e.customerVisible).reverse();
  if (!events.length) return null;
  return (
    <section className="card" aria-labelledby="up-h">
      <div className="card-head"><h2 id="up-h">Updates</h2></div>
      <ol className="stack" style={{ listStyle: "none", padding: 0, margin: 0, "--gap": "12px" } as React.CSSProperties} reversed>
        {events.map((e, i) => (
          <li key={i} className="small">
            <div style={{ fontWeight: 500 }}>{e.text.replace(/ against bank record \S+/, "")}</div>
            <time dateTime={e.at} className="muted">{fmtDateTime(e.at)}</time>
          </li>
        ))}
      </ol>
    </section>
  );
}
