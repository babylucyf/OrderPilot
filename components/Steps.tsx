import type { Order } from "@/lib/types";
import { Icon } from "./icons";

export const STEP_LABELS = ["Request", "Quote accepted", "Deposit verified", "Confirmed", "Made", "Handed over"];
const STEP_ICONS = ["request", "quote", "paid", "confirm", "cake", "handoff"];

/** How many milestones are recorded, derived from the stage. Never from the clock. */
export function reached(o: Order) {
  switch (o.stage) {
    case "awaiting_payment":
      return 2;
    case "ready_to_confirm":
      return 3;
    case "confirmed":
    case "in_production":
      return 4;
    case "ready_for_handoff":
    case "out_for_delivery":
      return 5;
    case "delivered":
    case "completed":
      return 6;
    default:
      return 1;
  }
}

export function Steps({ order, large = false }: { order: Order; large?: boolean }) {
  const r = reached(order);
  const problem = order.stage === "expired" || order.issues.some((i) => i.status === "open");
  const label = `${r} of 6 milestones recorded. Last: ${STEP_LABELS[r - 1]}.${r < 6 ? ` Next: ${STEP_LABELS[r]}${problem ? ", blocked by an issue" : ""}.` : ""}`;
  return (
    <span className={`steps${large ? " lg" : ""}`} role="img" aria-label={label}>
      {STEP_ICONS.map((ic, i) => (
        <span key={ic} style={{ display: "contents" }}>
          {i > 0 && <span className={`ln${i < r ? " on" : ""}`} />}
          <span className={`dot${i < r ? " on" : i === r ? (problem ? " bad" : " now") : ""}`} title={STEP_LABELS[i]}>
            <Icon name={ic} size={large ? 18 : 14} strokeWidth={1.8} />
          </span>
        </span>
      ))}
    </span>
  );
}
