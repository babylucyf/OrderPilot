import type { Flavour, Item, Order, Size, Stage } from "./types";

/* All values below are synthetic, configurable sample settings (PRD BR-01). Not market facts. */

export const BUSINESS = {
  name: "Butterleaf Cakes",
  area: "Surulere, Lagos",
  timezone: "Africa/Lagos",
  closingTime: "17:00",
  leadDays: 3,
  closedWeekday: 0, // Sunday
  dailyUnitLimit: 12,
  depositPercent: 50,
  holdHours: 24,
  bank: { name: "Sample Bank (synthetic)", account: "00 0000 0000", accountName: "Butterleaf Cakes" },
};

export const SIZES: Size[] = [8, 10, 12];
export const FLAVOURS: Flavour[] = ["Vanilla", "Red velvet", "Chocolate", "Lemon"];
export const FINISHES = [
  { id: "Smooth buttercream", extra: 0 },
  { id: "Drip finish", extra: 6000_00 },
  { id: "Fresh flowers", extra: 9000_00 },
];
export const WINDOWS = ["10:00 to 12:00", "12:00 to 14:00", "14:00 to 16:00", "16:00 to 18:00"];
export const AREAS = [
  { id: "Surulere", fee: 3500_00 },
  { id: "Yaba", fee: 5000_00 },
  { id: "Ikeja", fee: 6000_00 },
  { id: "Lekki Phase 1", fee: 6500_00 },
  { id: "Victoria Island", fee: 7000_00 },
];

const BASE: Record<Size, number> = { 8: 38000_00, 10: 52000_00, 12: 68000_00 };
const FLAVOUR_EXTRA: Record<Flavour, number> = { Vanilla: 0, "Red velvet": 4000_00, Chocolate: 3000_00, Lemon: 2000_00 };
const UNITS: Record<Size, number> = { 8: 2, 10: 3, 12: 4 };
export const ALLOWED: Record<Flavour, Size[]> = {
  Vanilla: [8, 10, 12],
  "Red velvet": [8, 10, 12],
  Chocolate: [8, 10],
  Lemon: [8, 10, 12],
};
export const WRITING_LIMIT: Record<Size, number> = { 8: 24, 10: 32, 12: 40 };

export function combinationAllowed(size: Size | null, flavour: Flavour | null) {
  if (!size || !flavour) return true;
  return ALLOWED[flavour].includes(size);
}

export function restrictionReason(size: Size, flavour: Flavour) {
  const ok = ALLOWED[flavour];
  return `${flavour} is available in ${ok.map((s) => `${s}-inch`).join(" and ")} sizes.`;
}

/** Counts user-perceived characters (grapheme clusters), PRD INT-06. */
export function charCount(text: string) {
  try {
    const seg = new Intl.Segmenter("en", { granularity: "grapheme" });
    return Array.from(seg.segment(text)).length;
  } catch {
    return Array.from(text).length;
  }
}

export function itemUnitPrice(item: Item) {
  if (!item.size || !item.flavour) return 0;
  const finish = FINISHES.find((f) => f.id === item.finish)?.extra ?? 0;
  return BASE[item.size] + FLAVOUR_EXTRA[item.flavour] + finish;
}

export function itemUnits(item: Item) {
  return item.size ? UNITS[item.size] * item.qty : 0;
}

export function orderUnits(order: Order) {
  return order.items.reduce((s, i) => s + itemUnits(i), 0);
}

export function deliveryFee(order: Pick<Order, "fulfilment">) {
  if (order.fulfilment.method !== "delivery") return 0;
  return AREAS.find((a) => a.id === order.fulfilment.area)?.fee ?? 0;
}

export function quoteLines(order: Order) {
  const lines = order.items.map((i) => ({
    label: `${i.qty} × ${i.size}-inch ${i.flavour?.toLowerCase()} cake, ${i.finish?.toLowerCase() ?? "standard finish"}`,
    amount: itemUnitPrice(i) * i.qty,
  }));
  const fee = deliveryFee(order);
  if (fee) lines.push({ label: `Delivery to ${order.fulfilment.area}`, amount: fee });
  const total = lines.reduce((s, l) => s + l.amount, 0);
  const deposit = Math.ceil((total * BUSINESS.depositPercent) / 100);
  return { lines, total, deposit };
}

/* ---------- Money and dates ---------- */

export function naira(minor: number) {
  return "₦" + Math.round(minor / 100).toLocaleString("en-NG");
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Lagos is UTC+1 with no daylight saving. */
export function lagosParts(iso: string) {
  const d = new Date(new Date(iso).getTime() + 60 * 60 * 1000);
  return {
    date: `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`,
    time: `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`,
  };
}

export function addDays(date: string, n: number) {
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function weekday(date: string) {
  return new Date(date + "T00:00:00Z").getUTCDay();
}

export function fmtDate(date: string | null, style: "short" | "long" = "short") {
  if (!date) return "Date not set";
  const d = new Date(date + "T12:00:00Z");
  return d.toLocaleDateString("en-GB", {
    weekday: style === "long" ? "long" : "short",
    day: "numeric",
    month: style === "long" ? "long" : "short",
    timeZone: "UTC",
  });
}

export function fmtDateTime(iso: string) {
  const p = lagosParts(iso);
  return `${fmtDate(p.date)}, ${p.time}`;
}

export function fmtTime(iso: string) {
  return lagosParts(iso).time;
}

/** PRD BR-02 and BR-03: calendar-day lead time with a closing-time cut-off. */
export function earliestDate(nowIso: string) {
  const { date, time } = lagosParts(nowIso);
  const acceptance = time >= BUSINESS.closingTime ? addDays(date, 1) : date;
  let d = addDays(acceptance, BUSINESS.leadDays);
  while (weekday(d) === BUSINESS.closedWeekday) d = addDays(d, 1);
  return { date: d, acceptance, afterClosing: time >= BUSINESS.closingTime };
}

export function relativeDay(date: string, nowIso: string) {
  const today = lagosParts(nowIso).date;
  if (date === today) return "Today";
  if (date === addDays(today, 1)) return "Tomorrow";
  return fmtDate(date);
}

/* ---------- Payment and capacity derivation ---------- */

export function payment(order: Order) {
  const total = order.quote?.total ?? 0;
  const required = order.quote?.deposit ?? 0;
  const verified = order.ledger.reduce((s, e) => s + e.amount, 0);
  const pending = order.claims.filter((c) => c.status === "under_review");
  const pendingAmount = pending.reduce((s, c) => s + c.amount, 0);
  const balance = Math.max(total - verified, 0);
  let label: string;
  let tone: Tone;
  if (!order.quote) {
    label = "Not due yet";
    tone = "neutral";
  } else if (verified === 0 && pending.length) {
    label = "Payment being checked";
    tone = "review";
  } else if (verified === 0) {
    label = order.quote.status === "accepted" ? "Awaiting deposit" : "Not due yet";
    tone = order.quote.status === "accepted" ? "hold" : "neutral";
  } else if (verified >= total) {
    label = "Fully paid";
    tone = "ok";
  } else if (verified >= required) {
    label = "Deposit verified, balance due";
    tone = "ok";
  } else {
    label = "Partly paid";
    tone = "hold";
  }
  return { total, required, verified, pending, pendingAmount, balance, label, tone };
}

export type Tone = "neutral" | "review" | "hold" | "ok" | "risk" | "done";

export const HOLD_STAGES: Stage[] = ["awaiting_customer", "awaiting_payment"];
export const PROTECTED_STAGES: Stage[] = ["ready_to_confirm"];
export const COMMITTED_STAGES: Stage[] = ["confirmed", "in_production", "ready_for_handoff", "out_for_delivery"];

export function holdActive(order: Order, nowIso: string) {
  return !!order.quote && HOLD_STAGES.includes(order.stage) && order.quote.expiresAt > nowIso;
}

export function capacityFor(orders: Order[], date: string, nowIso: string, excludeId?: string) {
  let held = 0;
  let committed = 0;
  for (const o of orders) {
    if (o.id === excludeId || o.fulfilment.date !== date) continue;
    const u = orderUnits(o);
    if (COMMITTED_STAGES.includes(o.stage) || PROTECTED_STAGES.includes(o.stage)) committed += u;
    else if (holdActive(o, nowIso)) held += u;
  }
  const limit = BUSINESS.dailyUnitLimit;
  return { held, committed, limit, free: Math.max(limit - held - committed, 0) };
}

/* ---------- Completeness (PRD INT-02) ---------- */

export function missingFields(o: Order) {
  const m: string[] = [];
  if (!o.buyer.name) m.push("Buyer name");
  if (!o.buyer.phone && !o.buyer.email) m.push("Buyer contact");
  o.items.forEach((i, idx) => {
    const p = o.items.length > 1 ? `Cake ${idx + 1}: ` : "";
    if (!i.size) m.push(p + "Size");
    if (!i.flavour) m.push(p + "Flavour");
    if (i.writing === null) m.push(p + "Cake writing (or no writing)");
    if (i.size && i.flavour && !combinationAllowed(i.size, i.flavour)) m.push(p + "Size and flavour combination");
  });
  if (!o.fulfilment.date) m.push("Fulfilment date");
  if (!o.fulfilment.method) m.push("Delivery or pickup");
  if (!o.fulfilment.window) m.push("Time window");
  if (o.fulfilment.method === "delivery") {
    if (!o.fulfilment.address) m.push("Delivery address");
    if (o.recipient && !o.recipient.phone) m.push("Recipient phone");
  }
  return m;
}

/* ---------- Labels ---------- */

export const STAGE_LABEL: Record<Stage, string> = {
  submitted: "New request",
  needs_clarification: "Needs clarification",
  ready_to_quote: "Ready to quote",
  awaiting_customer: "Quote sent",
  awaiting_payment: "Awaiting payment",
  ready_to_confirm: "Ready to confirm",
  confirmed: "Confirmed",
  in_production: "In production",
  ready_for_handoff: "Ready for handoff",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  completed: "Completed",
  expired: "Quote expired",
  declined: "Declined",
  cancelled: "Cancelled",
};

export const STAGE_TONE: Record<Stage, Tone> = {
  submitted: "review",
  needs_clarification: "hold",
  ready_to_quote: "review",
  awaiting_customer: "hold",
  awaiting_payment: "hold",
  ready_to_confirm: "review",
  confirmed: "ok",
  in_production: "ok",
  ready_for_handoff: "ok",
  out_for_delivery: "ok",
  delivered: "done",
  completed: "done",
  expired: "risk",
  declined: "neutral",
  cancelled: "neutral",
};

/** Customer-facing words: request, quote, payment check and confirmation stay distinct (PRD CUS-01). */
export const CUSTOMER_STAGE: Record<Stage, string> = {
  submitted: "Request received, not confirmed yet",
  needs_clarification: "The bakery has a question",
  ready_to_quote: "Request received, quote being prepared",
  awaiting_customer: "Your quote is ready",
  awaiting_payment: "Quote accepted, deposit due",
  ready_to_confirm: "Payment verified, awaiting bakery confirmation",
  confirmed: "Confirmed",
  in_production: "Being made",
  ready_for_handoff: "Ready",
  out_for_delivery: "On its way",
  delivered: "Delivered",
  completed: "Delivered",
  expired: "Quote expired",
  declined: "Request declined",
  cancelled: "Cancelled",
};
