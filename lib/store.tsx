"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from "react";
import type { Issue, Item, Order, Stage } from "./types";
import { DEMO_NOW, DEMO_NOW_AFTER_CLOSE, seedOrders } from "./seed";
import { BUSINESS, capacityFor, missingFields, orderUnits, quoteLines } from "./rules";

const KEY = "orderpilot-demo-v1";
const ME = "Ifeoma Obi";

export interface State {
  orders: Order[];
  now: string;
  nextId: number;
  version: number;
}

export type Action =
  | { type: "submit_request"; order: Order }
  | { type: "save_draft"; order: Order }
  | { type: "resolve_fields"; id: string; patch: Partial<Order>; item?: Partial<Item> }
  | { type: "publish_quote"; id: string }
  | { type: "accept_quote"; id: string }
  | { type: "claim_payment"; id: string; reference: string }
  | { type: "verify_payment"; id: string; claimId: string; reference: string }
  | { type: "reject_claim"; id: string; claimId: string; note: string }
  | { type: "confirm"; id: string }
  | { type: "advance"; id: string; to: Stage; note: string }
  | { type: "toggle_check"; id: string; check: string }
  | { type: "resolve_issue"; id: string; issueId: string; resolution: string; then?: Stage }
  | { type: "record_balance"; id: string; reference: string }
  | { type: "change_date"; id: string; date: string }
  | { type: "set_clock"; now: string }
  | { type: "replace"; state: State }
  | { type: "reset" };

function initial(): State {
  return { orders: seedOrders(), now: DEMO_NOW, nextId: 1047, version: 0 };
}

function event(o: Order, now: string, text: string, actor = ME, customerVisible = false) {
  o.events = [...o.events, { at: now, actor, text, customerVisible }];
}

function update(state: State, id: string, fn: (o: Order) => Order | void): State {
  return {
    ...state,
    version: state.version + 1,
    orders: state.orders.map((o) => {
      if (o.id !== id) return o;
      const copy: Order = structuredClone(o);
      return fn(copy) ?? copy;
    }),
  };
}

function hoursLater(iso: string, h: number) {
  return new Date(new Date(iso).getTime() + h * 3600_000).toISOString();
}

export function reducer(state: State, a: Action): State {
  const now = state.now;
  switch (a.type) {
    case "submit_request":
    case "save_draft": {
      const id = `OP-${state.nextId}`;
      const o: Order = { ...a.order, id, createdAt: now, isNew: true };
      o.stage = missingFields(o).length ? (a.type === "save_draft" ? "needs_clarification" : "submitted") : a.type === "save_draft" ? "ready_to_quote" : "submitted";
      o.events = [
        a.type === "submit_request"
          ? { at: now, actor: o.buyer.name, text: "Request submitted through order link", customerVisible: true }
          : { at: now, actor: ME, text: "Captured from pasted message. Extraction reviewed and accepted." },
      ];
      return { ...state, version: state.version + 1, nextId: state.nextId + 1, orders: [o, ...state.orders] };
    }
    case "resolve_fields":
      return update(state, a.id, (o) => {
        Object.assign(o, a.patch);
        if (a.item) o.items[0] = { ...o.items[0], ...a.item };
        o.isNew = false;
        const m = missingFields(o);
        if (["submitted", "needs_clarification"].includes(o.stage)) o.stage = m.length ? "needs_clarification" : "ready_to_quote";
        event(o, now, m.length ? `Details updated. Still missing: ${m.join(", ")}` : "All required details complete. Ready to quote.");
      });
    case "publish_quote":
      return update(state, a.id, (o) => {
        const cap = capacityFor(state.orders, o.fulfilment.date!, now, o.id);
        if (orderUnits(o) > cap.free) return o; // guarded in UI; server would return CAPACITY_CONFLICT
        const q = quoteLines(o);
        const version = (o.quote?.version ?? 0) + 1;
        o.quote = { version, publishedAt: now, expiresAt: hoursLater(now, BUSINESS.holdHours), lines: q.lines, total: q.total, deposit: q.deposit, status: "current" };
        o.stage = "awaiting_customer";
        o.isNew = false;
        event(o, now, `Quote v${version} published with a ${BUSINESS.holdHours}-hour hold`, ME, true);
      });
    case "accept_quote":
      return update(state, a.id, (o) => {
        if (!o.quote || o.quote.status !== "current" || o.quote.expiresAt <= now) return o;
        o.quote.status = "accepted";
        o.quote.acceptedAt = now;
        o.stage = "awaiting_payment";
        event(o, now, `Quote v${o.quote.version} accepted`, o.buyer.name, true);
      });
    case "claim_payment":
      return update(state, a.id, (o) => {
        o.claims.push({ id: `CLM-${o.claims.length + 2}`, amount: o.quote!.deposit, reference: a.reference, at: now, status: "under_review", reviewLockUntil: hoursLater(now, 2) });
        event(o, now, "Said they have paid the deposit. Payment is being checked.", o.buyer.name, true);
      });
    case "verify_payment":
      return update(state, a.id, (o) => {
        const c = o.claims.find((x) => x.id === a.claimId);
        if (!c || c.status !== "under_review") return o;
        if (o.ledger.some((e) => e.reference === a.reference)) return o; // one credit per external reference
        c.status = "verified";
        o.ledger.push({ id: a.reference, amount: c.amount, reference: a.reference, at: now, method: "Bank transfer, checked in bank app", verifiedBy: ME });
        const verified = o.ledger.reduce((s, e) => s + e.amount, 0);
        if (o.stage === "awaiting_payment" && verified >= (o.quote?.deposit ?? 0)) o.stage = "ready_to_confirm";
        event(o, now, `Deposit verified against bank record ${a.reference}`, ME, true);
      });
    case "reject_claim":
      return update(state, a.id, (o) => {
        const c = o.claims.find((x) => x.id === a.claimId);
        if (!c) return o;
        c.status = "rejected";
        c.note = a.note;
        event(o, now, `Payment claim not matched: ${a.note}`, ME, true);
      });
    case "confirm":
      return update(state, a.id, (o) => {
        if (o.stage !== "ready_to_confirm") return o;
        o.stage = "confirmed";
        event(o, now, "Order confirmed. Hold converted to a commitment.", ME, true);
      });
    case "advance":
      return update(state, a.id, (o) => {
        o.stage = a.to;
        event(o, now, a.note, ME, true);
      });
    case "toggle_check":
      return update(state, a.id, (o) => {
        o.checks = { ...o.checks, [a.check]: !o.checks[a.check] };
      });
    case "resolve_issue":
      return update(state, a.id, (o) => {
        const i = o.issues.find((x) => x.id === a.issueId) as Issue | undefined;
        if (!i) return o;
        i.status = "resolved";
        i.resolution = a.resolution;
        if (a.then) o.stage = a.then;
        event(o, now, `${i.title}: ${a.resolution}`, ME, i.kind !== "late_payment");
      });
    case "record_balance":
      return update(state, a.id, (o) => {
        const bal = (o.quote?.total ?? 0) - o.ledger.reduce((s, e) => s + e.amount, 0);
        if (bal <= 0 || o.ledger.some((e) => e.reference === a.reference)) return o;
        o.ledger.push({ id: a.reference, amount: bal, reference: a.reference, at: now, method: "Bank transfer, checked in bank app", verifiedBy: ME });
        event(o, now, `Balance verified against bank record ${a.reference}`, ME, true);
      });
    case "change_date":
      return update(state, a.id, (o) => {
        o.fulfilment.date = a.date;
        event(o, now, `Fulfilment date proposed as ${a.date}`);
      });
    case "set_clock":
      return { ...state, now: a.now, version: state.version + 1 };
    case "replace":
      return a.state;
    case "reset":
      return { ...initial(), version: state.version + 1 };
  }
}

interface Ctx {
  state: State;
  dispatch: (a: Action) => void;
  ready: boolean;
  me: string;
  afterClose: boolean;
  toggleClock: () => void;
}

const StoreContext = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initial);
  const [ready, setReady] = useState(false);
  const skipSave = useRef(true);

  // Synthetic demo state only, kept in this browser so owner and customer tabs can talk to each other.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) dispatch({ type: "replace", state: JSON.parse(raw) });
    } catch {}
    setReady(true);
    const onStorage = (e: StorageEvent) => {
      if (e.key !== KEY || !e.newValue) return;
      try {
        skipSave.current = true;
        dispatch({ type: "replace", state: JSON.parse(e.newValue) });
      } catch {}
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (skipSave.current) {
      skipSave.current = false;
      return;
    }
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {}
  }, [state]);

  const toggleClock = useCallback(() => {
    dispatch({ type: "set_clock", now: state.now === DEMO_NOW ? DEMO_NOW_AFTER_CLOSE : DEMO_NOW });
  }, [state.now]);

  const value = useMemo(
    () => ({ state, dispatch, ready, me: ME, afterClose: state.now === DEMO_NOW_AFTER_CLOSE, toggleClock }),
    [state, ready, toggleClock]
  );
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const c = useContext(StoreContext);
  if (!c) throw new Error("useStore outside provider");
  return c;
}

export function useOrder(id: string) {
  const { state } = useStore();
  return state.orders.find((o) => o.id === id);
}
