import { createFileRoute } from "@tanstack/react-router";
import { DashxShell } from "@/components/dashx-shell";

export const Route = createFileRoute("/dashx")({
  component: DashxShell,
});
