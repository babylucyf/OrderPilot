"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useOrder, useStore } from "@/lib/store";
import {
  addDays, AREAS, BUSINESS, capacityFor, charCount, fmtDate, fmtDateTime, holdActive, lagosParts, missingFields, naira,
  orderUnits, payment, quoteLines, STAGE_LABEL, STAGE_TONE, weekday, WINDOWS, WRITING_LIMIT,
} from "@/lib/rules";
import { confirmationGate, nextStep } from "@/lib/ops";
import { Avatar, Badge, CakeTop, Glyph, Sheet, WritingText } from "@/components/ui";
import { Icon } from "@/components/icons";
import { reached, Steps, STEP_LABELS } from "@/components/Steps";
import type { Order } from "@/lib/types";

const CHECKS = [
  { id: "spec", label: "Specification read against revision" },
  { id: "writing", label: "Writing checked letter by letter" },
  { id: "decoration", label: "Finish and decoration checked" },
  { id: "packaging", label: "Boxed and labelled" },
  { id: "handoff", label: "Handoff details confirmed" },
];

const TONE_BG = { risk: "var(--risk-tint)", review: "var(--review-tint)", hold: "var(--hold-tint)", ok: "var(--ok-tint)", done: "var(--done-tint)", neutral: "var(--done-tint)" };
const TONE_FG = { risk: "var(--risk)", review: "var(--review)", hold: "var(--hold)", ok: "var(--ok)", done: "var(--done)", neutral: "var(--ink-2)" };

export default function OrderWorkspace() {
  const { id } = useParams<{ id: string }>();
  const order = useOrder(id);
  const { state } = useStore();
  if (!order)
    return (
      <div className="panel panel-body stack">
        <h1>Order not found</h1>
        <p className="muted">There is no order {id} in this business. It may belong to another business, or the demo was reset.</p>
        <Link href="/owner/orders">Back to orders</Link>
      </div>
    );
  const step = nextStep(order, state.orders, state.now);
  const tone = step?.tone ?? "done";
  const r = reached(order);
  return (
    <>
      <nav className="crumbs no-print" aria-label="Breadcrumb">
        <Link href="/owner">Today</Link><Icon name="chevron" size={14} />
        <Link href="/owner/orders">Orders</Link><Icon name="chevron" size={14} />
        <span aria-current="page">{order.id}</span>
      </nav>
      <div className="ws-head">
        <div>
          <div className="ws-title">
            <h1>{order.id}</h1>
            <Badge tone={STAGE_TONE[order.stage]}>{STAGE_LABEL[order.stage]}</Badge>
          </div>
          <div className="ws-meta">
            <span>{order.buyer.name}</span>
            <span>{order.source === "pasted_message" ? "Captured from a chat" : order.source === "manual" ? "Entered manually" : "Came through the order link"}</span>
            <span className="agreed">
              {order.quote?.status === "accepted"
                ? <><Icon name="confirm" size={16} />Agreed: rev {order.revision}, quote v{order.quote.version}, {fmtDateTime(order.quote.acceptedAt!)}</>
                : <><Icon name="quote" size={16} />Not agreed yet</>}
            </span>
            <span className="person"><Avatar name={order.assignee} size={24} />{order.assignee}</span>
          </div>
        </div>
        <Link className="btn btn-secondary" href={`/track/${order.id}`} target="_blank"><Icon name="external" size={18} />Customer view</Link>
      </div>

      {step && (
        <section className="panel next" aria-labelledby="next-h">
          <span className={`next-icon ${ICON_TONE[tone]}`}><Glyph tone={tone} size={18} /></span>
          <div>
            <span className="small muted">Next step</span>
            <h2 id="next-h">{step.title}</h2>
            <p>{step.reason}</p>
          </div>
          <div className="next-actions"><Actions order={order} /></div>
        </section>
      )}

      <section className="panel progress-card" aria-label="Order milestones">
        <Steps order={order} large />
        <div className="progress-labels" aria-hidden>
          {STEP_LABELS.map((l, i) => <span key={l} className={i < r ? "on" : ""}>{l}</span>)}
        </div>
      </section>

      <div className="ws-grid">
        <div className="stack" style={{ "--gap": "20px" } as React.CSSProperties}>
          <Details order={order} />
          <Money order={order} />
        </div>
        <div className="stack" style={{ "--gap": "20px" } as React.CSSProperties}>
          {["ready_to_confirm", "awaiting_payment", "awaiting_customer"].includes(order.stage) && <GatePanel order={order} />}
          {["confirmed", "in_production", "ready_for_handoff"].includes(order.stage) && <Checklist order={order} />}
          <History order={order} />
        </div>
      </div>
    </>
  );
}

const ICON_TONE: Record<string, string> = { risk: "ic-red", review: "ic-blue", hold: "ic-amber", ok: "ic-green", done: "ic-violet", neutral: "ic-violet" };

/* ---------------- Actions: one primary per stage, every guard explained ---------------- */

function Actions({ order }: { order: Order }) {
  const { state, dispatch } = useStore();
  const p = payment(order);
  const [sheet, setSheet] = useState<null | "clarify" | "quote" | "verify" | "confirm" | "balance" | "issue">(null);
  const open = order.issues.find((i) => i.status === "open");
  const close = () => setSheet(null);
  const checksDone = CHECKS.every((c) => order.checks[c.id]);

  let buttons: React.ReactNode = null;
  if (open?.kind === "recipient_unavailable" || open?.kind === "late_payment") {
    buttons = <button className="btn btn-primary" onClick={() => setSheet("issue")}>Decide next step</button>;
  } else
    switch (order.stage) {
      case "submitted":
      case "needs_clarification":
        buttons = <button className="btn btn-primary" onClick={() => setSheet("clarify")}>Add missing details</button>;
        break;
      case "ready_to_quote":
        buttons = (
          <button className="btn btn-primary" onClick={() => setSheet("quote")}>
            {order.fulfilment.date && orderUnits(order) > capacityFor(state.orders, order.fulfilment.date, state.now, order.id).free ? "See dates with room" : "Prepare quote"}
          </button>
        );
        break;
      case "awaiting_customer":
        buttons = <Link className="btn btn-secondary" href={`/track/${order.id}`} target="_blank">See customer view</Link>;
        break;
      case "awaiting_payment":
        buttons = p.pending.length ? (
          <button className="btn btn-primary" onClick={() => setSheet("verify")}>Check payment</button>
        ) : (
          <Link className="btn btn-secondary" href={`/track/${order.id}`} target="_blank">See customer view</Link>
        );
        break;
      case "ready_to_confirm":
        buttons = <button className="btn btn-primary" onClick={() => setSheet("confirm")}>Review and confirm</button>;
        break;
      case "confirmed":
        buttons = <button className="btn btn-primary" onClick={() => dispatch({ type: "advance", id: order.id, to: "in_production", note: "Production started" })}>Start production</button>;
        break;
      case "in_production":
        buttons = (
          <>
            {p.balance > 0 && <button className="btn btn-secondary" onClick={() => setSheet("balance")}>Record balance</button>}
            <button className="btn btn-primary" disabled={!checksDone} aria-describedby={!checksDone ? "ready-why" : undefined} onClick={() => dispatch({ type: "advance", id: order.id, to: "ready_for_handoff", note: "Quality checks complete, ready for handoff" })}>
              Mark ready
            </button>
            {!checksDone && <span id="ready-why" className="small" style={{ color: "var(--ink)", flexBasis: "100%" }}>Finish the readiness checks to continue.</span>}
          </>
        );
        break;
      case "ready_for_handoff": {
        const blocked = p.balance > 0;
        const pickup = order.fulfilment.method === "pickup";
        buttons = (
          <>
            {blocked && <button className="btn btn-secondary" onClick={() => setSheet("balance")}>Record balance</button>}
            <button
              className="btn btn-primary"
              disabled={blocked}
              aria-describedby={blocked ? "handoff-why" : undefined}
              onClick={() => dispatch(pickup ? { type: "advance", id: order.id, to: "delivered", note: `Collected by ${order.buyer.name}` } : { type: "advance", id: order.id, to: "out_for_delivery", note: "Dispatched with rider" })}
            >
              {pickup ? "Record collection" : "Dispatch"}
            </button>
            {blocked && <span id="handoff-why" className="small" style={{ color: "var(--ink)", flexBasis: "100%" }}>{naira(p.balance)} balance must be verified first.</span>}
          </>
        );
        break;
      }
      case "out_for_delivery":
        buttons = <button className="btn btn-primary" onClick={() => dispatch({ type: "advance", id: order.id, to: "delivered", note: `Delivered to ${order.recipient?.name ?? order.buyer.name}` })}>Record delivery</button>;
        break;
    }

  return (
    <>
      {buttons}
      <ClarifySheet order={order} open={sheet === "clarify"} onClose={close} />
      <QuoteSheet order={order} open={sheet === "quote"} onClose={close} />
      <VerifySheet order={order} open={sheet === "verify"} onClose={close} />
      <ConfirmSheet order={order} open={sheet === "confirm"} onClose={close} />
      <BalanceSheet order={order} open={sheet === "balance"} onClose={close} />
      <IssueSheet order={order} open={sheet === "issue"} onClose={close} />
    </>
  );
}

function ClarifySheet({ order, open, onClose }: { order: Order; open: boolean; onClose: () => void }) {
  const { state, dispatch } = useStore();
  const missing = missingFields(order);
  const item = order.items[0];
  const [date, setDate] = useState(order.fulfilment.date ?? "");
  const [writingMode, setWritingMode] = useState<"text" | "none" | "">(item.writing === null ? "" : item.writing.kind);
  const [text, setText] = useState(item.writing?.kind === "text" ? item.writing.text : "");
  const [phone, setPhone] = useState(order.recipient?.phone ?? "");
  const [copied, setCopied] = useState(false);
  const earliest = addDays(lagosParts(state.now).date, BUSINESS.leadDays);
  const asks: string[] = [];
  if (!order.fulfilment.date) asks.push("which date you need it (the earliest we can do is " + fmtDate(earliest, "long") + ")");
  if (item.writing === null) asks.push("the exact words for the cake, or say no writing");
  if (order.recipient && !order.recipient.phone) asks.push(`a phone number for ${order.recipient.name} so the rider can reach them`);
  const draft = `Hi ${order.buyer.name.split(" ")[0]}, thank you for your order with ${BUSINESS.name}. Before we can send your quote, please share ${asks.join("; ")}.`;
  const limit = item.size ? WRITING_LIMIT[item.size] : 32;
  return (
    <Sheet open={open} onClose={onClose} title="Add missing details">
      <p className="small muted">Still missing: {missing.join(", ") || "nothing"}</p>
      <div className="stack" style={{ "--gap": "6px", background: "var(--paper)", padding: 12, borderRadius: 8 } as React.CSSProperties}>
        <span className="small" style={{ fontWeight: 600 }}>Suggested message to the customer</span>
        <span className="small muted">Drafted by AI from the known details. Edit it before you send. Nothing is sent automatically.</span>
        <p style={{ fontSize: 14 }}>{draft}</p>
        <button type="button" className="btn btn-secondary btn-sm" style={{ alignSelf: "flex-start" }} onClick={() => { navigator.clipboard?.writeText(draft).catch(() => {}); setCopied(true); }}>
          {copied ? "Copied. Paste it into your chat" : "Copy message"}
        </button>
      </div>
      <hr className="divider" />
      <p className="small" style={{ fontWeight: 600 }}>When the customer replies, record their answers here.</p>
      {!order.fulfilment.date && (
        <div className="field">
          <label htmlFor="c-date">Fulfilment date</label>
          <input id="c-date" className="input" type="date" min={earliest} value={date} onChange={(e) => setDate(e.target.value)} />
          <span className="hint">Earliest under the 3-day lead time: {fmtDate(earliest, "long")}</span>
        </div>
      )}
      {item.writing === null && (
        <fieldset className="stack" style={{ "--gap": "8px" } as React.CSSProperties}>
          <legend className="legend">Cake writing</legend>
          <div className="choices" style={{ "--n": 2 } as React.CSSProperties}>
            <label className="choice"><input type="radio" name="wm" checked={writingMode === "text"} onChange={() => setWritingMode("text")} /><span>Add writing</span></label>
            <label className="choice"><input type="radio" name="wm" checked={writingMode === "none"} onChange={() => setWritingMode("none")} /><span>No writing</span></label>
          </div>
          {writingMode === "text" && (
            <div className="field">
              <label htmlFor="c-text">Exact words, as the customer wrote them</label>
              <input id="c-text" className="input" value={text} onChange={(e) => setText(e.target.value)} maxLength={80} aria-describedby="c-text-h" />
              <span id="c-text-h" className="hint">{charCount(text)} of {limit} characters. Spelling and punctuation are kept exactly.</span>
            </div>
          )}
        </fieldset>
      )}
      {order.recipient && !order.recipient.phone && (
        <div className="field">
          <label htmlFor="c-phone">Recipient phone ({order.recipient.name})</label>
          <input id="c-phone" className="input" type="tel" inputMode="tel" autoComplete="off" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
      )}
      <div className="row" style={{ justifyContent: "flex-end" }}>
        <button className="btn btn-quiet" onClick={onClose}>Cancel</button>
        <button
          className="btn btn-primary"
          onClick={() => {
            dispatch({
              type: "resolve_fields",
              id: order.id,
              patch: {
                fulfilment: { ...order.fulfilment, date: date || order.fulfilment.date },
                recipient: order.recipient ? { ...order.recipient, phone: phone || order.recipient.phone } : null,
              },
              item: item.writing === null && writingMode ? { writing: writingMode === "none" ? { kind: "none" } : text.trim() ? { kind: "text", text } : null } : undefined,
            });
            onClose();
          }}
        >
          Save answers
        </button>
      </div>
    </Sheet>
  );
}

function QuoteSheet({ order, open, onClose }: { order: Order; open: boolean; onClose: () => void }) {
  const { state, dispatch } = useStore();
  const q = quoteLines(order);
  const units = orderUnits(order);
  const date = order.fulfilment.date!;
  const cap = capacityFor(state.orders, date, state.now, order.id);
  const conflict = units > cap.free;
  const today = lagosParts(state.now).date;
  const alternatives = Array.from({ length: 10 }, (_, i) => addDays(addDays(today, BUSINESS.leadDays), i))
    .filter((d) => weekday(d) !== BUSINESS.closedWeekday && d !== date && capacityFor(state.orders, d, state.now, order.id).free >= units)
    .slice(0, 3);
  const [copied, setCopied] = useState(false);
  const msg = `Hi ${order.buyer.name.split(" ")[0]}, ${fmtDate(date, "long")} is fully booked. We can make your cake for ${alternatives.map((d) => fmtDate(d, "long")).join(", or ")}. Which works for you?`;
  return (
    <Sheet open={open} onClose={onClose} title={conflict ? "This date is full" : `Quote v${(order.quote?.version ?? 0) + 1} for ${order.id}`}>
      {conflict ? (
        <>
          <div className="notice t-risk" role="alert">
            <Glyph tone="risk" size={16} />
            <p><strong>Not enough capacity on {fmtDate(date, "long")}</strong>This cake needs {units} units. {cap.free} unit{cap.free === 1 ? " is" : "s are"} free after {cap.committed} committed and {cap.held} held. The quote was not published, and the draft is kept.</p>
          </div>
          <p className="small" style={{ fontWeight: 600 }}>Dates with room for this cake</p>
          <ul className="stack" style={{ "--gap": "8px", listStyle: "none", padding: 0, margin: 0 } as React.CSSProperties}>
            {alternatives.map((d) => (
              <li key={d} className="spread" style={{ alignItems: "center" }}>
                <span>{fmtDate(d, "long")} <span className="small muted">{capacityFor(state.orders, d, state.now, order.id).free} units free</span></span>
                <button className="btn btn-secondary btn-sm" onClick={() => dispatch({ type: "change_date", id: order.id, date: d })}>Customer chose this</button>
              </li>
            ))}
          </ul>
          <button className="btn btn-secondary btn-sm" style={{ alignSelf: "flex-start" }} onClick={() => { navigator.clipboard?.writeText(msg).catch(() => {}); setCopied(true); }}>
            {copied ? "Copied" : "Copy message offering these dates"}
          </button>
          <div className="row" style={{ justifyContent: "flex-end" }}>
            <button className="btn btn-quiet" onClick={onClose}>Close, keep the draft</button>
          </div>
        </>
      ) : (
        <>
          <table>
            <tbody>
              {q.lines.map((l) => (
                <tr key={l.label}><td style={{ paddingLeft: 0 }}>{l.label}</td><td className="num">{naira(l.amount)}</td></tr>
              ))}
              <tr><td style={{ paddingLeft: 0, fontWeight: 700 }}>Total</td><td className="num" style={{ fontWeight: 700 }}>{naira(q.total)}</td></tr>
              <tr><td style={{ paddingLeft: 0 }}>Deposit to book ({BUSINESS.depositPercent}%)</td><td className="num">{naira(q.deposit)}</td></tr>
            </tbody>
          </table>
          <div className="notice t-hold">
            <Glyph tone="hold" size={16} />
            <p><strong>Publishing holds {units} of {cap.free} free units on {fmtDate(date, "long")}</strong>The hold lasts {BUSINESS.holdHours} hours. If the deposit is not verified by then, the units are released and the quote expires. Prices come from the catalogue saved today.</p>
          </div>
          <div className="row" style={{ justifyContent: "flex-end" }}>
            <button className="btn btn-quiet" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={() => { dispatch({ type: "publish_quote", id: order.id }); onClose(); }}>Publish quote and hold date</button>
          </div>
        </>
      )}
    </Sheet>
  );
}

function VerifySheet({ order, open, onClose }: { order: Order; open: boolean; onClose: () => void }) {
  const { state, dispatch } = useStore();
  const claim = order.claims.find((c) => c.status === "under_review");
  const [ref, setRef] = useState("");
  const [found, setFound] = useState(false);
  const [reject, setReject] = useState(false);
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");
  if (!claim) return null;
  const holdOk = holdActive(order, state.now);
  const dupe = state.orders.some((o) => o.ledger.some((e) => e.reference.toLowerCase() === ref.trim().toLowerCase()));
  return (
    <Sheet open={open} onClose={onClose} title="Check payment claim">
      <dl className="dl">
        <dt>Claimed</dt><dd>{naira(claim.amount)} deposit</dd>
        <dt>Customer reference</dt><dd>“{claim.reference}”</dd>
        <dt>Claimed at</dt><dd>{fmtDateTime(claim.at)}</dd>
        <dt>Quote hold</dt><dd>{holdOk ? `Valid until ${fmtDateTime(order.quote!.expiresAt)}` : "Expired"}</dd>
      </dl>
      <p className="small muted">A claim or screenshot is not proof of payment. Check your bank app or statement, then record what you found there.</p>
      {!reject ? (
        <>
          <div className="field">
            <label htmlFor="v-ref">Bank transaction reference</label>
            <input id="v-ref" className="input" value={ref} onChange={(e) => { setRef(e.target.value); setErr(""); }} aria-invalid={!!err} aria-describedby={err ? "v-err" : "v-hint"} placeholder="For example TRF-60021" />
            {err ? <span id="v-err" className="error-text">{err}</span> : <span id="v-hint" className="hint">Each bank reference can be credited once.</span>}
          </div>
          <label className="row small" style={{ minHeight: 44 }}>
            <input type="checkbox" checked={found} onChange={(e) => setFound(e.target.checked)} style={{ width: 20, height: 20, accentColor: "var(--blueberry)" }} />
            I found {naira(claim.amount)} from this customer in the bank account
          </label>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <button className="btn btn-quiet" onClick={() => setReject(true)}>Can’t find it</button>
            <span className="row">
              <button className="btn btn-quiet" onClick={onClose}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  if (!ref.trim()) return setErr("Enter the reference from your bank record.");
                  if (dupe) return setErr("This reference is already credited to an order. Check it is not a duplicate receipt.");
                  if (!found) return setErr("Tick the box once you have found the money in the account.");
                  dispatch({ type: "verify_payment", id: order.id, claimId: claim.id, reference: ref.trim() });
                  onClose();
                }}
              >
                Verify payment
              </button>
            </span>
          </div>
        </>
      ) : (
        <>
          <div className="field">
            <label htmlFor="v-note">What should the customer know?</label>
            <textarea id="v-note" className="textarea" value={note} onChange={(e) => setNote(e.target.value)} placeholder="We can’t see a transfer with this reference yet. Please send the sender name and time." />
            <span className="hint">The customer sees this note. Their quote hold keeps running.</span>
          </div>
          <div className="row" style={{ justifyContent: "flex-end" }}>
            <button className="btn btn-quiet" onClick={() => setReject(false)}>Back</button>
            <button className="btn btn-danger" disabled={!note.trim()} onClick={() => { dispatch({ type: "reject_claim", id: order.id, claimId: claim.id, note: note.trim() }); onClose(); }}>Mark as not matched</button>
          </div>
        </>
      )}
    </Sheet>
  );
}

function GatePanel({ order }: { order: Order }) {
  const { state } = useStore();
  const gate = confirmationGate(order, state.orders, state.now);
  return (
    <section className="panel" aria-labelledby="gate-h">
      <div className="panel-head"><h2 id="gate-h">Before you can confirm</h2><span className="small muted">{gate.filter((g) => g.ok).length} of {gate.length} met</span></div>
      <ul className="gate panel-body">
        {gate.map((g) => (
          <li key={g.label}>
            <span className={g.ok ? "ok" : "no"} aria-hidden><Glyph tone={g.ok ? "ok" : "risk"} size={16} /></span>
            <span><b>{g.label}</b><span className="sr-only">{g.ok ? ": met" : ": not met"}</span><br /><span className="muted small">{g.detail}</span></span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ConfirmSheet({ order, open, onClose }: { order: Order; open: boolean; onClose: () => void }) {
  const { state, dispatch } = useStore();
  const gate = confirmationGate(order, state.orders, state.now);
  const ready = gate.every((g) => g.ok);
  return (
    <Sheet open={open} onClose={onClose} title={`Confirm ${order.id}?`}>
      <p>
        You are committing to make a {order.items[0].size}-inch {order.items[0].flavour?.toLowerCase()} cake for {order.fulfilment.method === "pickup" ? "pickup" : "delivery"} on {fmtDate(order.fulfilment.date, "long")}, {order.fulfilment.window}.
        {" "}{orderUnits(order)} units move from protected to committed. {order.buyer.name.split(" ")[0]} is told the order is confirmed.
      </p>
      <ul className="gate">
        {gate.map((g) => (
          <li key={g.label}><span className={g.ok ? "ok" : "no"} aria-hidden><Glyph tone={g.ok ? "ok" : "risk"} size={16} /></span><span>{g.label}{g.ok ? "" : `: ${g.detail}`}</span></li>
        ))}
      </ul>
      <div className="row" style={{ justifyContent: "flex-end" }}>
        <button className="btn btn-quiet" onClick={onClose}>Not yet</button>
        <button className="btn btn-primary" disabled={!ready} onClick={() => { dispatch({ type: "confirm", id: order.id }); onClose(); }}>Confirm order</button>
      </div>
    </Sheet>
  );
}

function BalanceSheet({ order, open, onClose }: { order: Order; open: boolean; onClose: () => void }) {
  const { dispatch, state } = useStore();
  const p = payment(order);
  const [ref, setRef] = useState("");
  const [err, setErr] = useState("");
  return (
    <Sheet open={open} onClose={onClose} title={`Record ${naira(p.balance)} balance`}>
      <p className="small muted">Check the bank record first. Recording it here updates what the customer sees.</p>
      <div className="field">
        <label htmlFor="b-ref">Bank transaction reference</label>
        <input id="b-ref" className="input" value={ref} onChange={(e) => { setRef(e.target.value); setErr(""); }} aria-invalid={!!err} aria-describedby={err ? "b-err" : undefined} />
        {err && <span id="b-err" className="error-text">{err}</span>}
      </div>
      <div className="row" style={{ justifyContent: "flex-end" }}>
        <button className="btn btn-quiet" onClick={onClose}>Cancel</button>
        <button
          className="btn btn-primary"
          onClick={() => {
            if (!ref.trim()) return setErr("Enter the reference from your bank record.");
            if (state.orders.some((o) => o.ledger.some((e) => e.reference.toLowerCase() === ref.trim().toLowerCase()))) return setErr("This reference is already credited to an order.");
            dispatch({ type: "record_balance", id: order.id, reference: ref.trim() });
            onClose();
          }}
        >
          Record balance
        </button>
      </div>
    </Sheet>
  );
}

function IssueSheet({ order, open, onClose }: { order: Order; open: boolean; onClose: () => void }) {
  const { dispatch } = useStore();
  const issue = order.issues.find((i) => i.status === "open");
  const [choice, setChoice] = useState("");
  if (!issue) return null;
  const options =
    issue.kind === "recipient_unavailable"
      ? [
          { id: "reached", label: "Recipient reached, rider completes delivery", then: "delivered" as const, res: "Recipient reached by phone. Rider completed delivery." },
          { id: "return", label: "Rider returns the cake, new delivery time to agree with the buyer", then: "ready_for_handoff" as const, res: "Rider returned the cake to the bakery. New delivery time to agree with the buyer." },
        ]
      : [
          { id: "requote", label: "Offer a revised quote for a date with capacity", then: undefined, res: "Revised quote to be offered. The payment stays on record until the buyer chooses." },
          { id: "refund", label: "Refund the deposit (refund pending, not yet sent)", then: undefined, res: "Refund approved by owner. Refund pending until the transfer is confirmed." },
        ];
  return (
    <Sheet open={open} onClose={onClose} title={issue.title}>
      <p>{issue.detail}</p>
      <fieldset className="stack" style={{ "--gap": "8px" } as React.CSSProperties}>
        <legend className="legend" style={{ marginBottom: 8 }}>What happens next?</legend>
        {options.map((o) => (
          <label key={o.id} className="row" style={{ minHeight: 44, alignItems: "center", gap: 10, padding: "8px 12px", border: "1px solid var(--line-strong)", borderRadius: 8, borderColor: choice === o.id ? "var(--blueberry)" : undefined, background: choice === o.id ? "var(--blueberry-tint)" : undefined }}>
            <input type="radio" name="issue" value={o.id} checked={choice === o.id} onChange={() => setChoice(o.id)} style={{ width: 18, height: 18, accentColor: "var(--blueberry)" }} />
            {o.label}
          </label>
        ))}
      </fieldset>
      <p className="small muted">The original record stays in the history. This adds a decision, it does not rewrite what happened.</p>
      <div className="row" style={{ justifyContent: "flex-end" }}>
        <button className="btn btn-quiet" onClick={onClose}>Cancel</button>
        <button
          className="btn btn-primary"
          disabled={!choice}
          onClick={() => {
            const o = options.find((x) => x.id === choice)!;
            dispatch({ type: "resolve_issue", id: order.id, issueId: issue.id, resolution: o.res, then: o.then });
            onClose();
          }}
        >
          Record decision
        </button>
      </div>
    </Sheet>
  );
}

/* ---------------- Record panels ---------------- */

function Details({ order }: { order: Order }) {
  const item = order.items[0];
  const f = order.fulfilment;
  const r = order.recipient;
  const initials = (n: string) => n.split(" ").filter((x) => !x.endsWith(".")).map((x) => x[0]).slice(0, 2).join("");
  const missing = (t: string) => <span style={{ color: "var(--hold)" }}>{t}</span>;
  return (
    <section className="panel" aria-labelledby="det-h">
      <div className="panel-head"><h2 id="det-h">Order details</h2><span className="small muted">{orderUnits(order)} workload units</span></div>

      <div className="info-sec">
        <h3>Customer</h3>
        <div className="kv" style={{ "--cols": 2 } as React.CSSProperties}>
          <div className="person-row">
            <span className="initials" aria-hidden>{initials(order.buyer.name)}</span>
            <span><b style={{ fontWeight: 600 }}>{order.buyer.name}</b><span className="sub">Buyer, {order.buyer.phone}{order.buyer.email ? `, ${order.buyer.email}` : ""}</span></span>
          </div>
          {r ? (
            <div className="person-row">
              <span className="initials" aria-hidden>{initials(r.name)}</span>
              <span>
                <b style={{ fontWeight: 600 }}>{r.name}</b>
                <span className="sub">Recipient, {r.phone || missing("phone missing")}</span>
                {r.surprise && <span className="sub" style={{ color: "var(--glaze)", fontWeight: 500 }}>Surprise. No price or order messages to the recipient.</span>}
              </span>
            </div>
          ) : (
            <div className="person-row"><span className="sub">Buyer collects or receives the cake.</span></div>
          )}
        </div>
      </div>

      <div className="info-sec">
        <h3>Cake</h3>
        <div className="cake-row">
          <CakeTop text={item.writing?.kind === "text" ? item.writing.text : ""} flavour={item.flavour} size={132} />
          <dl className="kv" style={{ "--cols": 3 } as React.CSSProperties}>
            <div><dt>Size</dt><dd>{item.size ? `${item.qty} × ${item.size}-inch, 2 layers` : missing("Missing")}</dd></div>
            <div><dt>Flavour</dt><dd>{item.flavour ?? missing("Missing")}</dd></div>
            <div><dt>Finish</dt><dd>{item.finish ?? "Standard"}</dd></div>
            <div className="wide"><dt>Writing, exactly as agreed</dt><dd><WritingText writing={item.writing} className="" /></dd></div>
            <div><dt>Characters</dt><dd>{item.writing?.kind === "text" ? charCount(item.writing.text) : "None"}</dd></div>
          </dl>
        </div>
      </div>

      <div className="info-sec">
        <h3>Handoff</h3>
        <dl className="kv">
          <div><dt>Date</dt><dd>{f.date ? fmtDate(f.date, "long") : missing("Not agreed")}</dd></div>
          <div><dt>Window</dt><dd>{f.window ?? missing("Missing")}</dd></div>
          <div><dt>Method</dt><dd>{f.method === "pickup" ? "Pickup" : f.method === "delivery" ? `Delivery, ${f.area}` : missing("Missing")}</dd></div>
          <div><dt>{f.method === "delivery" ? "Address" : "Collect from"}</dt><dd>{f.method === "delivery" ? f.address ?? missing("Missing") : `${BUSINESS.name}, ${BUSINESS.area}`}</dd></div>
        </dl>
      </div>
    </section>
  );
}

function Money({ order }: { order: Order }) {
  const p = payment(order);
  return (
    <section className="panel" aria-labelledby="pay-h">
      <div className="panel-head"><h2 id="pay-h">Quote and payments</h2><Badge tone={p.tone}>{p.label}</Badge></div>
      <div className="panel-body stack" style={{ "--gap": "16px" } as React.CSSProperties}>
        {!order.quote ? (
          <p className="muted">No quote yet. Pricing is set when you publish a quote, from the catalogue saved at that moment.</p>
        ) : (
          <>
            <table className="ledger">
              <caption className="sr-only">Quote version {order.quote.version}</caption>
              <tbody>
                {order.quote.lines.map((l) => (<tr key={l.label}><td>{l.label}</td><td className="num">{naira(l.amount)}</td></tr>))}
                <tr><td><b>Total, quote v{order.quote.version}</b></td><td className="num"><b>{naira(order.quote.total)}</b></td></tr>
              </tbody>
            </table>
            <div className="choices money-tiles" style={{ "--n": 3 } as React.CSSProperties}>
              {[
                { k: "Deposit required", v: naira(p.required) },
                { k: "Verified", v: naira(p.verified) },
                { k: "Balance", v: naira(p.balance) },
              ].map((x) => (
                <div key={x.k} style={{ border: "1px solid var(--line)", borderRadius: 8, padding: "10px 12px" }}>
                  <div className="small muted">{x.k}</div>
                  <div style={{ fontWeight: 650, fontSize: 18 }}>{x.v}</div>
                </div>
              ))}
            </div>
            <p className="small muted">Quote {order.quote.status === "expired" ? "expired" : "hold ends"} {fmtDateTime(order.quote.expiresAt)}.</p>
          </>
        )}
        {(order.ledger.length > 0 || order.claims.length > 0) && (
          <div>
            <h3 style={{ marginBottom: 6 }}>Payment record</h3>
            <table className="ledger">
              <thead><tr><th>When</th><th>What</th><th className="num">Amount</th></tr></thead>
              <tbody>
                {order.claims.map((c) => (
                  <tr key={c.id}>
                    <td className="small">{fmtDateTime(c.at)}</td>
                    <td className="small">Customer claim, ref “{c.reference}” <Badge tone={c.status === "verified" ? "ok" : c.status === "rejected" ? "risk" : "review"}>{c.status === "verified" ? "Matched" : c.status === "rejected" ? "Not matched" : "Being checked"}</Badge></td>
                    <td className="num small">{naira(c.amount)}</td>
                  </tr>
                ))}
                {order.ledger.map((e) => (
                  <tr key={e.id}>
                    <td className="small">{fmtDateTime(e.at)}</td>
                    <td className="small">Verified by {e.verifiedBy}, {e.reference}</td>
                    <td className="num small">{naira(e.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

function Checklist({ order }: { order: Order }) {
  const { dispatch } = useStore();
  const locked = order.stage === "confirmed";
  return (
    <section className="panel" aria-labelledby="chk-h">
      <div className="panel-head"><h2 id="chk-h">Readiness checks</h2><span className="small muted">Rev {order.revision}</span></div>
      <div className="panel-body">
        {locked && <p className="small muted" style={{ marginBottom: 8 }}>Checks open once production starts.</p>}
        <ul className="checklist">
          {CHECKS.map((c) => (
            <li key={c.id}>
              <label>
                <input type="checkbox" disabled={locked || order.stage === "ready_for_handoff"} checked={!!order.checks[c.id]} onChange={() => dispatch({ type: "toggle_check", id: order.id, check: c.id })} />
                {c.label}
              </label>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function History({ order }: { order: Order }) {
  return (
    <section className="panel" aria-labelledby="his-h">
      <div className="panel-head"><h2 id="his-h">History</h2><span className="small muted">Newest first. Nothing is deleted.</span></div>
      <ol className="timeline panel-body" reversed>
        {[...order.events].reverse().map((e, i) => (
          <li key={i}>
            <div>
              <span>{e.text}</span>
              <time dateTime={e.at}>{fmtDateTime(e.at)}, {e.actor}{e.customerVisible ? ", visible to customer" : ", internal"}</time>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
