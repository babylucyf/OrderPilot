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
        <Header />
        <div className="step">
          <div className="state-banner t-review">
            <span className="row small" style={{ "--gap": "6px", fontWeight: 600 } as React.CSSProperties}><Glyph tone="review" /> Request received</span>
            <h1 ref={headRef} tabIndex={-1} style={{ marginTop: 6 }}>We’ve received your request</h1>
            <p style={{ marginTop: 8 }}>Your order is <b>not confirmed yet</b>. Next, {BUSINESS.name} will check the details and send your quote. You pay nothing until you accept it.</p>
          </div>
          <div className="card stack">
            <dl className="sumlist">
              <dt>Reference</dt><dd><b>{submitted}</b></dd>
              <dt>Received</dt><dd>{fmtDate(state.now.slice(0, 10), "long")}</dd>
              <dt>Updates</dt><dd>{f.email ? `By email to ${f.email}` : `The bakery will contact you on ${f.phone}`}</dd>
            </dl>
          </div>
          <Link className="btn btn-primary" href={`/track/${submitted}`}>Track this request</Link>
          <p className="small muted">Demo tip: open the <Link href="/owner">owner workspace</Link> in another tab. Your request is at the top of Today.</p>
        </div>
      </main>
    );

  return (
    <main id="main" className="cust">
      <Header />
      <nav aria-label="Order progress">
        <div className="progress" aria-hidden>{STEPS.map((s, i) => <span key={s} className={i <= step ? "on" : ""} />)}</div>
        <p className="small muted">Step {step + 1} of {STEPS.length}: {STEPS[step]}</p>
      </nav>

      <div className="step">
        <h1 ref={headRef} tabIndex={-1}>{["Choose your cake", "What should it say?", "When do you need it?", "Your details", "Check your request"][step]}</h1>

        {errors.length > 0 && (
          <div className="err-summary" ref={errRef} tabIndex={-1} role="alert" aria-labelledby="err-h">
            <b id="err-h">{errors.length === 1 ? "One thing to fix" : `${errors.length} things to fix`}</b>
            <ul>{errors.map((e) => <li key={e.id + e.msg}><a href={`#${e.id}`}>{e.msg}</a></li>)}</ul>
          </div>
        )}

        {step === 0 && (
          <>
            <fieldset className="stack" style={{ "--gap": "10px" } as React.CSSProperties}>
              <legend className="legend" style={{ marginBottom: 10 }}>Size</legend>
              <div className="choices" style={{ "--n": 3 } as React.CSSProperties}>
                {SIZES.map((s) => {
                  const dis = !!f.flavour && !ALLOWED[f.flavour].includes(s);
                  return (
                    <label key={s} className="choice">
                      <input id={`size-${s}`} type="radio" name="size" checked={f.size === s} disabled={dis} onChange={() => set({ size: s })} aria-describedby={dis ? "size-note" : undefined} />
                      <span>{s}-inch<small>{s === 8 ? "Serves 12 to 15" : s === 10 ? "Serves 20 to 25" : "Serves 30 to 40"}</small></span>
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
              <div className="choices" style={{ "--n": 1 } as React.CSSProperties}>
                {FINISHES.map((fi) => (
                  <label key={fi.id} className="choice">
                    <input type="radio" name="finish" checked={f.finish === fi.id} onChange={() => set({ finish: fi.id })} />
                    <span style={{ flexDirection: "row", justifyContent: "space-between", padding: "8px 16px" }}>{fi.id}<small>{fi.extra ? `+${naira(fi.extra)}` : "Included"}</small></span>
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
              <h2>Estimated price</h2>
              {quoteLines(draftOrder()).lines.map((l) => <div key={l.label} className="spread small"><span>{l.label}</span><span>{naira(l.amount)}</span></div>)}
              <div className="spread"><b>Estimate</b><b>{naira(estimate ?? 0)}</b></div>
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
          <span className="row" style={{ "--gap": "8px", flexWrap: "nowrap" } as React.CSSProperties}>
            {step > 0 && <button className="btn btn-secondary" onClick={() => go(step - 1)}>Back</button>}
            {step < 4 ? (
              <button className="btn btn-primary" onClick={() => go(step + 1)}>Continue</button>
            ) : (
              <button className="btn btn-primary" onClick={submit} disabled={sending} aria-busy={sending}>{sending ? "Sending…" : "Send request"}</button>
            )}
          </span>
        </div>
      </div>
      <p id="contact" className="small muted" style={{ marginTop: 32 }}>Butterleaf Cakes is a fictional bakery for this concept, so there is no number to call.</p>
    </main>
  );
}

function Header() {
  return (
    <header className="cust-head">
      <span className="cust-logo" aria-hidden>B</span>
      <span>
        <b>{BUSINESS.name}</b>
        <span className="small muted">Custom cakes, {BUSINESS.area}</span>
      </span>
    </header>
  );
}
