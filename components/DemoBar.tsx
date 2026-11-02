"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { fmtDate, lagosParts } from "@/lib/rules";

export function DemoBar() {
  const { state, dispatch, afterClose, toggleClock } = useStore();
  const p = lagosParts(state.now);
  return (
    <div className="demo-bar no-print" role="region" aria-label="Prototype controls">
      <span>
        <Link href="/">OrderPilot concept prototype</Link>
        <span className="demo-long">. Synthetic data, simulated actions, saved only in this browser.</span>
        <span className="demo-short">, synthetic data</span>
      </span>
      <span className="row" style={{ "--gap": "8px" } as React.CSSProperties}>
        <span>
          Demo clock: <span className="clock">{fmtDate(p.date)}, {p.time} Lagos</span>
        </span>
        <button type="button" onClick={toggleClock} aria-pressed={afterClose}>
          {afterClose ? "Back to 14:20" : "Jump past 17:00 closing"}
        </button>
        <button
          type="button"
          onClick={() => {
            dispatch({ type: "reset" });
          }}
        >
          Reset demo
        </button>
      </span>
    </div>
  );
}
