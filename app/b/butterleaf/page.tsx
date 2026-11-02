"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import {
  addDays, ALLOWED, AREAS, BUSINESS, capacityFor, charCount, earliestDate, fmtDate, FINISHES, FLAVOURS, itemUnitPrice, naira,
  quoteLines, SIZES, weekday, WINDOWS, WRITING_LIMIT,
} from "@/lib/rules";
import type { Flavour, Method, Order, Size } from "@/lib/types";
import { CakeTop, Glyph } from "@/components/ui";
import { CustHead, SwitchSide } from "@/components/Cust";
import { Spot } from "@/components/Spot";
import "../../customer.css";

interface Form {
  size: Size | null; flavour: Flavour | null; finish: string;
  writingMode: "text" | "none" | ""; writing: string; writingOk: boolean;
  method: Method | ""; date: string; window: string; area: string; address: string; landmark: string;
  name: string; phone: string; email: string;
  forWhom: "me" | "other" | ""; rName: string; rPhone: string; surprise: boolean; contactOk: boolean;
}

const EMPTY: Form = {
  size: null, flavour: null, finish: "Smooth buttercream", writingMode: "", writing: "", writingOk: false,
  method: "", date: "", window: "", area: "", address: "", landmark: "",
  name: "", phone: "", email: "", forWhom: "", rName: "", rPhone: "", surprise: false, contactOk: true,
};

const STEPS = ["Cake", "Writing", "When", "Details", "Review"];

export default function RequestBuilder() {
  const { state, dispatch } = useStore();
  const [step, setStep] = useState(0);
  const [f, setF] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<{ id: string; msg: string }[]>([]);
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const headRef = useRef<HTMLHeadingElement>(null);
  const errRef = useRef<HTMLDivElement>(null);
  const set = (p: Partial<Form>) => setF((x) => ({ ...x, ...p }));

  const earliest = earliestDate(state.now);
  const units = f.size ? { 8: 2, 10: 3, 12: 4 }[f.size] : 0;
  const cap = f.date ? capacityFor(state.orders, f.date, state.now) : null;
  const dateFull = !!cap && units > cap.free;
  const closedDay = !!f.date && weekday(f.date) === BUSINESS.closedWeekday;
  const tooSoon = !!f.date && f.date < earliest.date;
  const nextOpen = (() => {
    const out: string[] = [];
    let d = earliest.date;
    while (out.length < 3) {
      if (weekday(d) !== BUSINESS.closedWeekday && capacityFor(state.orders, d, state.now).free >= (units || 2)) out.push(d);
      d = addDays(d, 1);
    }
    return out;
  })();

  const draftOrder = (): Order => ({
    id: "", source: "customer_link", createdAt: state.now,
    buyer: { name: f.name.trim(), phone: f.phone.trim(), email: f.email.trim() || undefined },
    recipient: f.forWhom === "other" ? { name: f.rName.trim(), phone: f.rPhone.trim(), surprise: f.surprise, contactAllowed: f.contactOk } : null,
    items: [{ size: f.size, flavour: f.flavour, qty: 1, finish: f.finish, writing: f.writingMode === "none" ? { kind: "none" } : { kind: "text", text: f.writing } }],
    fulfilment: { method: f.method || null, date: f.date || null, window: f.window || null, area: f.method === "delivery" ? f.area : null, address: f.method === "delivery" ? [f.address.trim(), f.landmark.trim() && `Landmark: ${f.landmark.trim()}`].filter(Boolean).join(". ") : null },
    stage: "submitted", revision: 1, quote: null, claims: [], ledger: [], issues: [], checks: {}, assignee: "Bisi Lawal", events: [],
  });

  const estimate = f.size && f.flavour ? quoteLines(draftOrder()).total : null;

  function validate(s: number) {
    const e: { id: string; msg: string }[] = [];
    if (s === 0) {
      if (!f.size) e.push({ id: "size-8", msg: "Choose a size" });
      if (!f.flavour) e.push({ id: "fl-Vanilla", msg: "Choose a flavour" });
    }
    if (s === 1) {
      if (!f.writingMode) e.push({ id: "wm-text", msg: "Choose whether the cake has writing" });
      if (f.writingMode === "text") {
        if (!f.writing.trim()) e.push({ id: "writing", msg: "Type the words for the cake, or choose no writing" });
        else if (charCount(f.writing) > WRITING_LIMIT[f.size!]) e.push({ id: "writing", msg: `Writing is ${charCount(f.writing)} characters. A ${f.size}-inch cake fits ${WRITING_LIMIT[f.size!]}` });
        else if (!f.writingOk) e.push({ id: "writing-ok", msg: "Confirm the writing is exactly right" });
      }
    }
    if (s === 2) {
      if (!f.method) e.push({ id: "m-pickup", msg: "Choose pickup or delivery" });
      if (!f.date) e.push({ id: "date", msg: "Choose a date" });
      else if (tooSoon) e.push({ id: "date", msg: `The earliest date is ${fmtDate(earliest.date, "long")}` });
      else if (closedDay) e.push({ id: "date", msg: "The bakery is closed on Sundays. Choose another day" });
      else if (dateFull) e.push({ id: "date", msg: `${fmtDate(f.date, "long")} is fully booked. Choose another date` });
      if (!f.window) e.push({ id: "w-0", msg: "Choose a time window" });
      if (f.method === "delivery") {
        if (!f.area) e.push({ id: "area", msg: "Choose a delivery area" });
        if (!f.address.trim()) e.push({ id: "address", msg: "Enter the delivery address" });
      }
    }
    if (s === 3) {
      if (!f.name.trim()) e.push({ id: "name", msg: "Enter your name" });
      if (!/^[0-9 +]{10,16}$/.test(f.phone.trim())) e.push({ id: "phone", msg: "Enter a phone number, for example 0803 123 4567" });
      if (f.email && !/^\S+@\S+\.\S+$/.test(f.email)) e.push({ id: "email", msg: "Check the email address, for example name@example.com" });
      if (!f.forWhom) e.push({ id: "who-me", msg: "Tell us who the cake is for" });
      if (f.forWhom === "other") {
        if (!f.rName.trim()) e.push({ id: "rname", msg: "Enter the recipient’s name" });
        if (f.method === "delivery" && !/^[0-9 +]{10,16}$/.test(f.rPhone.trim())) e.push({ id: "rphone", msg: "Enter the recipient’s phone so the rider can hand over the cake" });
      }
    }
    return e;
  }

  useEffect(() => { if (errors.length) errRef.current?.focus(); }, [errors]);

  const go = (to: number) => {
    if (to > step) {
      const e = validate(step);
      setErrors(e);
      if (e.length) return;
    } else setErrors([]);
    setStep(to);
    requestAnimationFrame(() => { headRef.current?.focus(); window.scrollTo({ top: 0 }); });
  };

  const submit = () => {
    if (sending) return; // one request per tap (PRD INT-09, AT-07)
    setSending(true);
    const id = `OP-${state.nextId}`;
    setTimeout(() => {
      dispatch({ type: "submit_request", order: draftOrder() });
      setSubmitted(id);
      setSending(false);
      requestAnimationFrame(() => headRef.current?.focus());
    }, 700);
  };

  if (submitted)
    return (
      <main id="main" className="cust">
        <CustHead sub="Request sent" />
        <div className="hero" role="status">
          <Spot kind="request" tone="review" />
          <h1 ref={headRef} tabIndex={-1}>Request received</h1>
          <p>{BUSINESS.name} will check the details and send your quote. You pay nothing until you accept it.</p>
        </div>
        <div className="step">
          <div className="card item">
            <span className="thumb"><CakeTop text={f.writingMode === "text" ? f.writing : ""} flavour={f.flavour} size={68} /></span>
            <span>
              <span className="small muted">Celebration cake</span>
              <span style={{ display: "block", fontSize: 16, fontWeight: 500 }}>{f.size}-inch {f.flavour?.toLowerCase()}</span>
              <span className="small" style={{ color: "var(--ink-2)" }}>{f.finish}</span>
            </span>
            <span style={{ fontWeight: 600, textAlign: "right" }}>{naira(estimate ?? 0)}<span className="small muted" style={{ display: "block", fontWeight: 400 }}>estimate</span></span>
          </div>
          <div className="card">
            <div className="card-head"><h2>Request summary</h2></div>
            <dl className="rows">
              <div><dt>Reference</dt><dd>{submitted}</dd></div>
              <div><dt>Date</dt><dd>{fmtDate(f.date, "long")}</dd></div>
              <div><dt>Time</dt><dd>{f.window}</dd></div>
              <div><dt>{f.method === "pickup" ? "Pickup" : "Deliver to"}</dt><dd>{f.method === "pickup" ? BUSINESS.area : f.address}</dd></div>
              <div><dt>Updates</dt><dd>{f.email ? `Email, ${f.email}` : `Phone, ${f.phone}`}</dd></div>
            </dl>
          </div>
          <div>
            <Link className="btn-pill" href={`/track/${submitted}`}>Track this request</Link>
            <p className="cta-note review">Not confirmed yet. The bakery reviews it first</p>
          </div>
          <p className="small muted" style={{ textAlign: "center" }}>Demo tip: open the <Link href="/owner">owner workspace</Link> in another tab. Your request is at the top of Today.</p>
          <SwitchSide />
        </div>
      </main>
    );

  return (
    <main id="main" className="cust">
      <CustHead sub="Custom cakes, Surulere" />
      <nav aria-label="Order progress">
        <div className="progress" aria-hidden>{STEPS.map((s, i) => <span key={s} className={i <= step ? "on" : ""} />)}</div>
        <p className="step-of">Step {step + 1} of {STEPS.length}: {STEPS[step]}</p>
      </nav>

      <div className="step">
        <div className="step-title">
          <h1 ref={headRef} tabIndex={-1}>{["Choose your cake", "What should it say?", "When do you need it?", "Your details", "Check your request"][step]}</h1>
          <p>{["Two layers, baked to order. Prices update as you choose.", "We pipe it exactly as you type it.", `Cakes need ${BUSINESS.leadDays} days’ notice.`, "So the bakery can send your quote.", "Nothing is booked until you accept a quote."][step]}</p>
        </div>

        {errors.length > 0 && (
          <div className="err-summary" ref={errRef} tabIndex={-1} role="alert" aria-labelledby="err-h">
            <Glyph tone="risk" size={18} />
            <div>
              <b id="err-h">{errors.length === 1 ? "One thing to fix" : `${errors.length} things to fix`}</b>
              <ul>{errors.map((e) => <li key={e.id + e.msg}><a href={`#${e.id}`}>{e.msg}</a></li>)}</ul>
            </div>
          </div>
        )}

        {step === 0 && (
          <>
            <fieldset className="stack" style={{ "--gap": "10px" } as React.CSSProperties}>
              <legend className="legend" style={{ marginBottom: 10 }}>Size</legend>
              <div className="opts">
                {SIZES.map((s) => {
                  const dis = !!f.flavour && !ALLOWED[f.flavour].includes(s);
                  return (
                    <label key={s} className="opt">
                      <input id={`size-${s}`} type="radio" name="size" checked={f.size === s} disabled={dis} onChange={() => set({ size: s })} aria-describedby={dis ? "size-note" : undefined} />
                      <span>
                        <span className="tile">{s}”</span>
                        <span><b>{s}-inch cake</b><small>{s === 8 ? "Serves 12 to 15" : s === 10 ? "Serves 20 to 25" : "Serves 30 to 40"}</small></span>
                        <em>from {naira(itemUnitPrice({ size: s, flavour: "Vanilla", qty: 1, finish: "Smooth buttercream", writing: null }))}</em>
                      </span>
                    </label>
                  );
                })}
              </div>
              {f.flavour && ALLOWED[f.flavour].length < 3 && (
                <p id="size-note" className="small" style={{ color: "var(--ink-2)" }}>{f.flavour} is available in 8-inch and 10-inch sizes. For a 12-inch cake, choose another flavour.</p>
              )}
            </fieldset>
            <fieldset className="stack" style={{ "--gap": "10px" } as React.CSSProperties}>
              <legend className="legend" style={{ marginBottom: 10 }}>Flavour</legend>
              <div className="choices" style={{ "--n": 2 } as React.CSSProperties}>
                {FLAVOURS.map((fl) => {
                  const dis = !!f.size && !ALLOWED[fl].includes(f.size);
                  return (
                    <label key={fl} className="choice">
                      <input id={`fl-${fl.replace(" ", "-")}`} type="radio" name="flavour" checked={f.flavour === fl} disabled={dis} onChange={() => set({ flavour: fl })} />
                      <span>{fl}{dis && <small>Not in {f.size}-inch</small>}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
            <fieldset className="stack" style={{ "--gap": "10px" } as React.CSSProperties}>
              <legend className="legend" style={{ marginBottom: 10 }}>Finish</legend>
              <div className="opts">
                {FINISHES.map((fi, i) => (
                  <label key={fi.id} className="opt">
                    <input type="radio" name="finish" checked={f.finish === fi.id} onChange={() => set({ finish: fi.id })} />
                    <span>
                      <span className="tile" aria-hidden><FinishArt kind={i} /></span>
                      <span><b>{fi.id}</b><small>{["Clean, classic, any colour", "Glossy drip over the top edge", "Seasonal fresh flowers"][i]}</small></span>
                      <em>{fi.extra ? `+${naira(fi.extra)}` : "Included"}</em>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            <p className="small muted">Want a design that isn’t listed? <a href="#contact">Message the bakery</a> and they will quote it personally.</p>
          </>
        )}

        {step === 1 && (
          <>
            <fieldset className="stack" style={{ "--gap": "10px" } as React.CSSProperties}>
              <legend className="legend" style={{ marginBottom: 10 }}>Writing on the cake</legend>
              <div className="choices" style={{ "--n": 2 } as React.CSSProperties}>
                <label className="choice"><input id="wm-text" type="radio" name="wm" checked={f.writingMode === "text"} onChange={() => set({ writingMode: "text" })} /><span>Add writing</span></label>
                <label className="choice"><input type="radio" name="wm" checked={f.writingMode === "none"} onChange={() => set({ writingMode: "none", writingOk: false })} /><span>No writing</span></label>
              </div>
            </fieldset>
            {f.writingMode === "text" && (
              <>
                <div className="field">
                  <label htmlFor="writing">Exact words</label>
                  <input id="writing" className="input" value={f.writing} autoComplete="off" spellCheck={false} onChange={(e) => set({ writing: e.target.value, writingOk: false })} aria-invalid={errors.some((x) => x.id === "writing")} aria-describedby="writing-hint" />
                  <span id="writing-hint" className="hint" aria-live="polite">
                    {charCount(f.writing)} of {WRITING_LIMIT[f.size!]} characters for a {f.size}-inch cake. We write it exactly as typed, including capitals, punctuation and emoji.
                  </span>
                </div>
                <div className="card" style={{ display: "grid", placeItems: "center" }}>
                  <CakeTop text={f.writing} flavour={f.flavour} size={240} />
                  <span className="small muted">Preview only. Lettering is piped by hand.</span>
                </div>
                <label className="row" style={{ minHeight: 44, alignItems: "center", gap: 10 }}>
                  <input id="writing-ok" type="checkbox" checked={f.writingOk} onChange={(e) => set({ writingOk: e.target.checked })} style={{ width: 22, height: 22, accentColor: "var(--blueberry)" }} />
                  The writing is exactly right, including spelling
                </label>
              </>
            )}
          </>
        )}

        {step === 2 && (
          <>
            <fieldset className="stack" style={{ "--gap": "10px" } as React.CSSProperties}>
              <legend className="legend" style={{ marginBottom: 10 }}>Pickup or delivery</legend>
              <div className="choices" style={{ "--n": 2 } as React.CSSProperties}>
                <label className="choice"><input id="m-pickup" type="radio" name="m" checked={f.method === "pickup"} onChange={() => set({ method: "pickup" })} /><span>Pickup<small>{BUSINESS.area}</small></span></label>
                <label className="choice"><input type="radio" name="m" checked={f.method === "delivery"} onChange={() => set({ method: "delivery" })} /><span>Delivery<small>Fee by area</small></span></label>
              </div>
            </fieldset>
            <div className="field">
              <label htmlFor="date">Date</label>
              <input id="date" className="input" type="date" min={earliest.date} value={f.date} onChange={(e) => set({ date: e.target.value })} aria-invalid={errors.some((x) => x.id === "date")} aria-describedby="date-hint" />
              <span id="date-hint" className="hint">
                Earliest: <b>{fmtDate(earliest.date, "long")}</b>. Cakes need {BUSINESS.leadDays} days’ notice{earliest.afterClosing ? `, and requests after ${BUSINESS.closingTime} count from tomorrow` : ` from requests made before ${BUSINESS.closingTime}`}. Closed on Sundays.
              </span>
              {f.date && (dateFull || closedDay) && !tooSoon && (
                <div className="notice t-hold" style={{ marginTop: 6 }}>
                  <Glyph tone="hold" size={16} />
                  <p><strong>{closedDay ? "Closed that day" : `${fmtDate(f.date, "long")} is fully booked`}</strong>Dates with room: {nextOpen.map((d, i) => (<span key={d}>{i > 0 && ", "}<button type="button" className="btn btn-quiet btn-sm" style={{ padding: "0 4px", minHeight: 32 }} onClick={() => set({ date: d })}>{fmtDate(d, "long")}</button></span>))}</p>
                </div>
              )}
            </div>
            <fieldset className="stack" style={{ "--gap": "10px" } as React.CSSProperties}>
              <legend className="legend" style={{ marginBottom: 10 }}>{f.method === "pickup" ? "Pickup window" : "Delivery window"}</legend>
              <div className="choices" style={{ "--n": 2 } as React.CSSProperties}>
                {WINDOWS.map((w, i) => (
                  <label key={w} className="choice"><input id={`w-${i}`} type="radio" name="w" checked={f.window === w} onChange={() => set({ window: w })} /><span>{w}</span></label>
                ))}
              </div>
            </fieldset>
            {f.method === "delivery" && (
              <>
                <div className="field">
                  <label htmlFor="area">Delivery area</label>
                  <select id="area" className="select" value={f.area} onChange={(e) => set({ area: e.target.value })}>
                    <option value="">Choose an area</option>
                    {AREAS.map((a) => <option key={a.id} value={a.id}>{a.id}, {naira(a.fee)}</option>)}
                  </select>
                  <span className="hint">Area not listed? <a href="#contact">Message the bakery</a> for a delivery quote.</span>
                </div>
                <div className="field">
                  <label htmlFor="address">Address</label>
                  <textarea id="address" className="textarea" style={{ minHeight: 80 }} autoComplete="street-address" value={f.address} onChange={(e) => set({ address: e.target.value })} />
                </div>
                <div className="field">
                  <label htmlFor="landmark">Landmark or gate instructions <span className="muted" style={{ fontWeight: 400 }}>(optional)</span></label>
                  <input id="landmark" className="input" value={f.landmark} onChange={(e) => set({ landmark: e.target.value })} />
                </div>
              </>
            )}
          </>
        )}

        {step === 3 && (
          <>
            <div className="field"><label htmlFor="name">Your name</label><input id="name" className="input" autoComplete="name" value={f.name} onChange={(e) => set({ name: e.target.value })} /></div>
            <div className="field"><label htmlFor="phone">Your phone</label><input id="phone" className="input" type="tel" inputMode="tel" autoComplete="tel" value={f.phone} onChange={(e) => set({ phone: e.target.value })} /></div>
            <div className="field">
              <label htmlFor="email">Email <span className="muted" style={{ fontWeight: 400 }}>(optional)</span></label>
              <input id="email" className="input" type="email" autoComplete="email" value={f.email} onChange={(e) => set({ email: e.target.value })} aria-describedby="email-h" />
              <span id="email-h" className="hint">For your quote and updates. Without it, the bakery contacts you by phone.</span>
            </div>
            <fieldset className="stack" style={{ "--gap": "10px" } as React.CSSProperties}>
              <legend className="legend" style={{ marginBottom: 10 }}>Who is the cake for?</legend>
              <div className="choices" style={{ "--n": 2 } as React.CSSProperties}>
                <label className="choice"><input id="who-me" type="radio" name="who" checked={f.forWhom === "me"} onChange={() => set({ forWhom: "me" })} /><span>Me</span></label>
                <label className="choice"><input type="radio" name="who" checked={f.forWhom === "other"} onChange={() => set({ forWhom: "other" })} /><span>Someone else</span></label>
              </div>
            </fieldset>
            {f.forWhom === "other" && (
              <div className="card stack">
                <div className="field"><label htmlFor="rname">Recipient’s name</label><input id="rname" className="input" autoComplete="off" value={f.rName} onChange={(e) => set({ rName: e.target.value })} /></div>
                <div className="field">
                  <label htmlFor="rphone">Recipient’s phone{f.method !== "delivery" && <span className="muted" style={{ fontWeight: 400 }}> (optional)</span>}</label>
                  <input id="rphone" className="input" type="tel" inputMode="tel" autoComplete="off" value={f.rPhone} onChange={(e) => set({ rPhone: e.target.value })} />
                </div>
                <label className="row" style={{ minHeight: 44, gap: 10 }}>
                  <input type="checkbox" checked={f.surprise} onChange={(e) => set({ surprise: e.target.checked, contactOk: e.target.checked ? false : f.contactOk })} style={{ width: 22, height: 22, accentColor: "var(--blueberry)" }} />
                  It’s a surprise. Only contact them on the day, to hand it over.
                </label>
                <p className="small muted">You stay the main contact. The recipient never sees the price.</p>
              </div>
            )}
          </>
        )}

        {step === 4 && (
          <>
            <div className="card stack" style={{ "--gap": "16px" } as React.CSSProperties}>
              <div className="spread"><h2>Cake</h2><button className="btn btn-quiet btn-sm" onClick={() => go(0)}>Change</button></div>
              <p>{f.size}-inch {f.flavour?.toLowerCase()}, {f.finish.toLowerCase()}</p>
              <div className="spread"><h2>Writing</h2><button className="btn btn-quiet btn-sm" onClick={() => go(1)}>Change</button></div>
              {f.writingMode === "none" ? <p>No writing</p> : <p className="writing" style={{ fontSize: 22 }}>“{f.writing}”</p>}
              <div className="spread"><h2>When</h2><button className="btn btn-quiet btn-sm" onClick={() => go(2)}>Change</button></div>
              <p>{f.method === "pickup" ? `Pickup from ${BUSINESS.area}` : `Delivery to ${f.address}, ${f.area}`}<br />{fmtDate(f.date, "long")}, {f.window}</p>
              <div className="spread"><h2>People</h2><button className="btn btn-quiet btn-sm" onClick={() => go(3)}>Change</button></div>
              <p>{f.name}, {f.phone}{f.email && `, ${f.email}`}{f.forWhom === "other" && <><br />For {f.rName}{f.surprise ? " (surprise)" : ""}</>}</p>
            </div>
            <div className="card stack" style={{ "--gap": "10px" } as React.CSSProperties}>
              <div className="card-head" style={{ marginBottom: 4 }}><h2>Estimated price</h2></div>
              <dl className="rows money">
                {quoteLines(draftOrder()).lines.map((l) => <div key={l.label}><dt>{l.label}</dt><dd>{naira(l.amount)}</dd></div>)}
                <div className="total"><dt>Estimate</dt><dd>{naira(estimate ?? 0)}</dd></div>
              </dl>
              <p className="small muted">This is an estimate. Your quote confirms the final price. To book, you pay a {BUSINESS.depositPercent}% deposit after accepting the quote, and the date is held for {BUSINESS.holdHours} hours.</p>
            </div>
            <p className="small muted">By sending, you agree that {BUSINESS.name} can use these details to prepare your order. This is a concept prototype: nothing is sent to a real bakery.</p>
          </>
        )}
      </div>

      <div className="bottom-bar">
        <div className="bottom-inner">
          <span className="est" aria-live="polite">
            <span className="small muted">{estimate ? "Estimate" : "Price"}</span>
            <b>{estimate ? naira(estimate) : f.size && !f.flavour ? `From ${naira(itemUnitPrice({ size: f.size, flavour: "Vanilla", qty: 1, finish: f.finish, writing: null }))}` : "Choose a cake"}</b>
          </span>
          <span className="acts">
            {step > 0 && <button className="btn-pill ghost" onClick={() => go(step - 1)}>Back</button>}
            {step < 4 ? (
              <button className="btn-pill" onClick={() => go(step + 1)}>Continue</button>
            ) : (
              <button className="btn-pill" onClick={submit} disabled={sending} aria-busy={sending}>{sending ? "Sending…" : "Send request"}</button>
            )}
          </span>
        </div>
      </div>
      <p id="contact" className="small muted" style={{ marginTop: 32, textAlign: "center" }}>Butterleaf Cakes is a fictional bakery for this concept, so there is no number to call.</p>
      <SwitchSide />
    </main>
  );
}

function FinishArt({ kind }: { kind: number }) {
  return (
    <svg viewBox="0 0 32 32" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <ellipse cx="16" cy="11" rx="11" ry="4" />
      <path d="M5 11v10c0 2.2 4.9 4 11 4s11-1.8 11-4V11" />
      {kind === 1 && <path d="M7 13.5v3M11 14.5v5M16 15v3M21 14.5v4.5M25 13.5v2.5" />}
      {kind === 2 && (
        <>
          <circle cx="11" cy="9" r="2" fill="currentColor" stroke="none" />
          <circle cx="16" cy="7.5" r="2.2" fill="currentColor" stroke="none" />
          <circle cx="21" cy="9" r="2" fill="currentColor" stroke="none" />
        </>
      )}
    </svg>
  );
}
