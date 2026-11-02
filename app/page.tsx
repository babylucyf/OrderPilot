"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/icons";
import "./intro.css";

const SIDES = {
  owner: {
    href: "/owner",
    title: "I run the bakery",
    sub: "Triage today, capture a WhatsApp order, confirm payments",
    icon: "orders",
    cta: "Open the owner workspace",
    other: { q: "Ordering a cake?", link: "See the customer flow instead" },
  },
  customer: {
    href: "/b/butterleaf",
    title: "I’m ordering a cake",
    sub: "Choose a cake, see the writing, accept a quote, track it",
    icon: "cake",
    cta: "Start a cake order",
    other: { q: "Running the bakery?", link: "See the owner side instead" },
  },
} as const;
type Side = keyof typeof SIDES;

const TRY = [
  { who: "Owner", href: "/owner", text: "A delivery has failed, a payment arrived after its quote expired, and a deposit claim is waiting. Each one tells you the next step." },
  { who: "Owner", href: "/owner/capture", text: "Capture a WhatsApp order. It shows where every field came from, blocks a cake the bakery doesn’t make, and ignores a line asking to change the bank account." },
  { who: "Owner", href: "/owner/orders/OP-1045", text: "Try to quote Thursday. The day is nearly full, so the quote won’t publish and you get dates that still have room." },
  { who: "Customer", href: "/track/OP-1043", text: "Accept a quote and say you’ve paid. The page says “being checked”, never “confirmed”, until the bakery verifies the money." },
  { who: "Customer", href: "/b/butterleaf", text: "Order on a phone, then jump the demo clock past 17:00. The earliest date moves by a day." },
];

export default function Intro() {
  const router = useRouter();
  const [side, setSide] = useState<Side>("owner");
  const s = SIDES[side];
  const other: Side = side === "owner" ? "customer" : "owner";

  return (
    <main id="main" className="intro">
      <section className="entry">
        <div className="entry-card">
          <div className="entry-brand">
            <span className="brand-mark" aria-hidden>
              <svg viewBox="0 0 24 24" width="22" height="22"><path d="M5 6.5h14v11a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 17.5z" fill="none" stroke="#fff" strokeWidth="1.8" /><path d="M9 10.5h6M9 14h4" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" /><path d="M9 6.5V4.5M15 6.5V4.5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" /></svg>
            </span>
            <b>OrderPilot</b>
          </div>
          <h1>Cake orders, agreed before they’re baked</h1>
          <p className="lede">A shared order record for a cake bakery and its customers. Choose a side to explore the prototype.</p>

          <form
            className="picker"
            onSubmit={(e) => {
              e.preventDefault();
              router.push(s.href);
            }}
          >
            <fieldset>
              <legend className="sr-only">Which side do you want to see?</legend>
              <div className="sides">
                {(Object.keys(SIDES) as Side[]).map((k) => (
                  <label key={k} className="side-opt">
                    <input type="radio" name="side" value={k} checked={side === k} onChange={() => setSide(k)} />
                    <span>
                      <span className={`side-tile ${k}`}><Icon name={SIDES[k].icon} size={22} /></span>
                      <span className="side-text"><b>{SIDES[k].title}</b><small>{SIDES[k].sub}</small></span>
                      <span className="radio" aria-hidden />
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            <button className="go" type="submit">{s.cta}</button>
            <p className="other">
              {s.other.q}{" "}
              <button type="button" className="linkish" onClick={() => setSide(other)}>{s.other.link}</button>
            </p>
          </form>
        </div>
        <p className="entry-foot">A concept project by Ugonwa Ohagwasi. Synthetic data, nothing is sent anywhere.</p>
      </section>

      <section className="intro-try" aria-labelledby="try-h">
        <h2 id="try-h">Five things to try</h2>
        <p className="muted">Open both sides in two tabs. They share the same demo data, so an action on one shows up on the other.</p>
        <ul>
          {TRY.map((t) => (
            <li key={t.href}>
              <span className={`who ${t.who === "Owner" ? "owner-tag" : "cust-tag"}`}>{t.who}</span>
              <Link href={t.href}>{t.text}</Link>
              <Icon name="chevron" size={18} />
            </li>
          ))}
        </ul>
      </section>

      <section className="intro-honest" aria-labelledby="h-h">
        <h2 id="h-h">What this is, and isn’t</h2>
        <div className="cols">
          <div>
            <h3>Real in this prototype</h3>
            <p>The order rules: lead time with a 17:00 cut-off, size and flavour limits, daily capacity in workload units, a 24-hour hold, deposit maths in kobo, and a confirmation that needs every condition met.</p>
          </div>
          <div>
            <h3>Simulated</h3>
            <p>The AI extraction, payments, email and accounts. Data is synthetic and lives only in your browser. Butterleaf Cakes and every customer are invented. Staff photos are Unsplash stock.</p>
          </div>
          <div>
            <h3>Not done yet</h3>
            <p>Interviews with bakery owners and customers, and usability testing. The flows here are hypotheses to test, not validated findings.</p>
          </div>
        </div>
      </section>

      <footer className="intro-foot">
        <span className="sig" aria-label="Signed nwa">nwa</span>
        <span className="small muted">Designed and built by Ugonwa Ohagwasi. <a href="mailto:ugonwaohagwasi@gmail.com">ugonwaohagwasi@gmail.com</a></span>
      </footer>
    </main>
  );
}
