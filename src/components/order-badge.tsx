import { Badge } from "@/components/ui/card";
import type { Order } from "@/lib/types";

export function OrderBadge({ order }: { order: Order }) {
  const tone =
    order.status === "paid" ? "success" : order.status === "failed" ? "danger" : "warn";
  // `demo` is a legacy flag from the retired demo-checkout flow; sandbox-mode
  // orders are the current equivalent. Both read as "not real money."
  const isTest = order.demo || order.sifaloEnv === "sandbox";
  const label = isTest && order.status === "paid" ? "Test" : order.status;
  return <Badge tone={tone}>{label}</Badge>;
}
