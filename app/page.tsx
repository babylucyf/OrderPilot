"use client";

import Link from "next/link";
import { useState } from "react";
import { CakeTop } from "@/components/ui";
import { charCount } from "@/lib/rules";
import "./intro.css";

const TRY = [
  { who: "Owner", href: "/owner", text: "Open Today. A delivery has failed, a payment arrived after its quote expired, and a deposit claim is waiting. Each one tells you the next step." },
  { who: "Owner", href: "/owner/capture", text: "Capture a WhatsApp order. The AI suggestion shows where every field came from, blocks a 12-inch chocolate cake the bakery doesn’t make, and ignores a line asking to change the bank account." },
  { who: "Owner", href: "/owner/orders/OP-1045", text: "Try to quote Thursday. The day is nearly full, so the quote won’t publish and you get dates that still have room." },
  { who: "Customer", href: "/track/OP-1043", text: "Accept a quote and say you’ve paid. The page says “being checked”, never “confirmed”, until the owner verifies the money and confirms." },
  { who: "Customer", href: "/b/butterleaf", text: "Order a cake on a phone. Switch the demo clock past 17:00 and the earliest date moves by a day." },
];

export default function Intro() {
  const [w, setW] = useState("Happy 30th, Tolu!");
  return (
    <main id="main" className="intro">
      <section className="intro-hero">
        <div className="intro-copy">
          <p className="intro-kicker">OrderPilot, a concept by Ugonwa Ohagwasi</p>
          <h1>Cake orders, agreed before they’re baked.</h1>
          <p className="lede">
            A shared order record for independent custom cake businesses in Lagos. Customers request through a link, owners turn chat messages into checked orders, and nothing is confirmed until the details, the date and the deposit line up.
          </p>
          <div className="intro-doors">
            <Link href="/owner" className="door">
              <b>Owner workspace</b>
              <span>Today, orders, chat capture, production. Best on a laptop.</span>
            </Link>
            <Link href="/b/butterleaf" className="door">
              <b>Customer order page</b>
              <span>Request, quote, payment and tracking. Best on a phone.</span>
            </Link>
          </div>
        </div>
        <figure className="intro-cake">
          <CakeTop text={w} flavour="Red velvet" size={320} />
          <div className="field">
            <label htmlFor="try-writing">Type the cake writing</label>
            <input id="try-writing" className="input" value={w} maxLength={40} onChange={(e) => setW(e.target.value)} spellCheck={false} autoComplete="off" />
          </div>
          <figcaption className="small muted">
            {charCount(w)} characters, kept exactly as typed. A misspelt name on a cake can’t be undone, so the writing is shown the same way to the customer, the owner and the kitchen.
          </figcaption>
        </figure>
      </section>

      <section className="intro-try" aria-labelledby="try-h">
        <h2 id="try-h">Five things to try</h2>
        <p className="muted">Open the owner and customer views in two tabs. They share the same demo data, so an action in one shows up in the other.</p>
        <ul>
          {TRY.map((t) => (
            <li key={t.href}>
              <span className={`who ${t.who === "Owner" ? "owner-tag" : "cust-tag"}`}>{t.who}</span>
              <Link href={t.href}>{t.text}</Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="intro-honest" aria-labelledby="h-h">
        <h2 id="h-h">What this is, and isn’t</h2>
        <div className="cols">
          <div>
            <h3>Real in this prototype</h3>
            <p>The order rules from the product requirements: lead time with a 17:00 cut-off, size and flavour limits, daily capacity in workload units, a 24-hour hold, deposit maths in kobo, and a confirmation that needs every condition met.</p>
          </div>
          <div>
            <h3>Simulated</h3>
            <p>The AI extraction, payments, email and accounts. Data is synthetic and lives only in your browser. Butterleaf Cakes and every customer are invented.</p>
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
