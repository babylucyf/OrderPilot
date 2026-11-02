"use client";

import Link from "next/link";
import { BUSINESS } from "@/lib/rules";
import { Icon } from "./icons";

export function CustHead({ sub, back = "/" }: { sub: string; back?: string }) {
  return (
    <header className="cust-head">
      <Link href={back} className="cust-back" aria-label="Back to the OrderPilot overview"><Icon name="chevron" size={20} className="flip" /></Link>
      <span className="who"><b>{BUSINESS.name}</b><span>{sub}</span></span>
      <span className="cust-logo" aria-hidden>B</span>
    </header>
  );
}

export function SwitchSide() {
  return (
    <p className="switch-side">
      Running the bakery? <Link href="/owner">See the owner side instead</Link>
    </p>
  );
}
