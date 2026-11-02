import type { Order } from "./types";
import { capacityFor, fmtDate, fmtDateTime, fmtTime, holdActive, lagosParts, missingFields, naira, orderUnits, payment, type Tone } from "./rules";

export interface Gate {
  label: string;
  ok: boolean;
  detail: string;
}

/** PRD BR-13: confirmation requires every condition, shown as an explicit checklist. */
export function confirmationGate(o: Order, orders: Order[], now: string): Gate[] {
  const p = payment(o);
  const missing = missingFields(o);
  const cap = o.fulfilment.date ? capacityFor(orders, o.fulfilment.date, now, o.id) : null;
  const units = orderUnits(o);
  const openCritical = o.issues.filter((i) => i.status === "open");
  return [
    { label: "Details complete", ok: missing.length === 0, detail: missing.length ? `Missing: ${missing.join(", ")}` : "Every required field is answered" },
    {
      label: "Current quote accepted",
      ok: o.quote?.status === "accepted",
      detail: o.quote ? `Quote v${o.quote.version} ${o.quote.status === "accepted" ? "accepted " + fmtDateTime(o.quote.acceptedAt!) : "not accepted"}` : "No quote published",
    },
    {
      label: "Required payment verified",
      ok: p.verified >= p.required && p.required > 0,
      detail: `${naira(p.verified)} verified of ${naira(p.required)} deposit` + (p.pending.length ? `, ${naira(p.pendingAmount)} being checked` : ""),
    },
    {
      label: "Capacity still available",
      ok: !!cap && cap.committed + cap.held + units <= cap.limit,
      detail: cap ? `This order uses ${units} units. Day total with it: ${cap.committed + cap.held + units} of ${cap.limit}` : "No date set",
    },
    { label: "No open critical issue", ok: openCritical.length === 0, detail: openCritical.length ? openCritical.map((i) => i.title).join(", ") : "Nothing blocking" },
  ];
}

export interface NextStep {
  title: string;
  reason: string;
  tone: Tone;
  severity: number; // higher = more urgent
  due?: string; // ISO
}

export function nextStep(o: Order, orders: Order[], now: string): NextStep | null {
  const p = payment(o);
  const today = lagosParts(now).date;
  const open = o.issues.find((i) => i.status === "open");
  if (open?.kind === "recipient_unavailable")
    return { title: "Agree a new handoff plan", reason: `${open.detail}`, tone: "risk", severity: 100, due: now };
  if (open?.kind === "late_payment")
    return { title: "Resolve late payment", reason: `${naira(p.verified)} arrived after the quote expired. The slot was released.`, tone: "risk", severity: 90, due: open.openedAt };
  switch (o.stage) {
    case "submitted":
      return { title: "Review new request", reason: missingFields(o).length ? `Missing: ${missingFields(o).join(", ")}` : "All required details supplied", tone: "review", severity: 50, due: o.createdAt };
    case "needs_clarification":
      return { title: "Get missing details", reason: missingFields(o).join(", "), tone: "hold", severity: 45, due: o.createdAt };
    case "ready_to_quote": {
      const cap = o.fulfilment.date ? capacityFor(orders, o.fulfilment.date, now, o.id) : null;
      const conflict = cap && orderUnits(o) > cap.free;
      return {
        title: conflict ? "Pick another date before quoting" : "Prepare and publish quote",
        reason: conflict ? `${fmtDate(o.fulfilment.date!)} has ${cap!.free} unit${cap!.free === 1 ? "" : "s"} free. This order needs ${orderUnits(o)}` : "Details complete and valid",
        tone: conflict ? "risk" : "review",
        severity: conflict ? 60 : 40,
        due: o.createdAt,
      };
    }
    case "awaiting_customer":
      return { title: "Waiting on customer", reason: `Quote v${o.quote!.version} hold expires ${fmtDateTime(o.quote!.expiresAt)}`, tone: "hold", severity: 10, due: o.quote!.expiresAt };
    case "awaiting_payment":
      if (p.pending.length)
        return {
          title: "Check payment claim",
          reason: `${naira(p.pendingAmount)} claimed. Review lock ends ${fmtTime(p.pending[0].reviewLockUntil!)}; quote hold ends ${fmtTime(o.quote!.expiresAt)}`,
          tone: "review",
          severity: 70,
          due: p.pending[0].reviewLockUntil,
        };
      return { title: "Waiting for deposit", reason: `Hold expires ${fmtDateTime(o.quote!.expiresAt)}`, tone: "hold", severity: holdActive(o, now) ? 15 : 55, due: o.quote!.expiresAt };
    case "ready_to_confirm":
      return { title: "Confirm or decline", reason: "Deposit verified while the hold was valid. Units are protected until you decide.", tone: "review", severity: 75, due: o.ledger.at(-1)?.at };
    case "confirmed":
      return o.fulfilment.date === today
        ? { title: "Start production", reason: "Due today", tone: "hold", severity: 65, due: now }
        : null;
    case "in_production": {
      const needsBalance = o.fulfilment.date === today && p.balance > 0;
      return {
        title: needsBalance ? "Collect balance before dispatch" : "Finish readiness checks",
        reason: needsBalance ? `${naira(p.balance)} balance is due before the ${o.fulfilment.window} handoff` : `Handoff ${o.fulfilment.window}`,
        tone: needsBalance ? "risk" : "ok",
        severity: needsBalance ? 80 : 30,
        due: now,
      };
    }
    case "ready_for_handoff":
      return { title: o.fulfilment.method === "pickup" ? "Hand over at pickup" : "Dispatch", reason: `Window ${o.fulfilment.window}`, tone: "ok", severity: 35, due: now };
    case "out_for_delivery":
      return { title: "Record handoff", reason: "Rider on the way", tone: "ok", severity: 20, due: now };
    default:
      return null;
  }
}

export function attentionQueue(orders: Order[], now: string) {
  return orders
    .map((o) => ({ order: o, step: nextStep(o, orders, now) }))
    .filter((x): x is { order: Order; step: NextStep } => !!x.step && x.step.severity >= 40)
    .sort((a, b) => b.step.severity - a.step.severity);
}
