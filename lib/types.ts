export type Stage =
  | "submitted"
  | "needs_clarification"
  | "ready_to_quote"
  | "awaiting_customer"
  | "awaiting_payment"
  | "ready_to_confirm"
  | "confirmed"
  | "in_production"
  | "ready_for_handoff"
  | "out_for_delivery"
  | "delivered"
  | "completed"
  | "expired"
  | "declined"
  | "cancelled";

export type Writing = { kind: "text"; text: string } | { kind: "none" } | null; // null = not answered yet

export type Size = 8 | 10 | 12;
export type Flavour = "Vanilla" | "Red velvet" | "Chocolate" | "Lemon";

export interface Item {
  size: Size | null;
  flavour: Flavour | null;
  qty: number;
  writing: Writing;
  finish: string | null;
}

export interface Person {
  name: string;
  phone: string;
  email?: string;
}

export interface Recipient extends Person {
  surprise: boolean;
  contactAllowed: boolean;
}

export type Method = "delivery" | "pickup";

export interface Fulfilment {
  method: Method | null;
  date: string | null; // YYYY-MM-DD, Africa/Lagos
  window: string | null;
  area: string | null;
  address: string | null;
}

export interface Quote {
  version: number;
  publishedAt: string; // ISO
  expiresAt: string; // ISO
  lines: { label: string; amount: number }[]; // minor units (kobo)
  total: number;
  deposit: number;
  status: "current" | "accepted" | "expired" | "superseded";
  acceptedAt?: string;
}

export interface Claim {
  id: string;
  amount: number;
  reference: string;
  at: string;
  status: "under_review" | "verified" | "rejected";
  reviewLockUntil?: string;
  note?: string;
}

export interface LedgerEntry {
  id: string;
  amount: number;
  reference: string;
  at: string;
  method: string;
  verifiedBy: string;
}

export interface Issue {
  id: string;
  kind: "recipient_unavailable" | "late_payment" | "duplicate" | "delay";
  title: string;
  detail: string;
  openedAt: string;
  owner: string;
  status: "open" | "resolved";
  resolution?: string;
}

export interface OrderEvent {
  at: string;
  actor: string;
  text: string;
  customerVisible?: boolean;
}

export interface Order {
  id: string;
  source: "customer_link" | "pasted_message" | "manual";
  createdAt: string;
  buyer: Person;
  recipient: Recipient | null; // null = buyer is the recipient or pickup
  fulfilment: Fulfilment;
  items: Item[];
  stage: Stage;
  revision: number;
  quote: Quote | null;
  claims: Claim[];
  ledger: LedgerEntry[];
  issues: Issue[];
  checks: Record<string, boolean>;
  assignee: string;
  dietaryNote?: string;
  events: OrderEvent[];
  isNew?: boolean;
}

export interface StaffMember {
  id: string;
  name: string;
  role: "Owner" | "Coordinator" | "Production";
  photo?: string;
}
