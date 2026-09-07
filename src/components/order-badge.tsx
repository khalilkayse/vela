import { Badge } from "@/components/ui/card";
import type { Order } from "@/lib/types";

export function OrderBadge({ order }: { order: Order }) {
  const tone =
    order.status === "paid" ? "success" : order.status === "failed" ? "danger" : "warn";
  const label = order.demo && order.status === "paid" ? "Demo" : order.status;
  return <Badge tone={tone}>{label}</Badge>;
}
