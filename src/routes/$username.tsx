import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/$username")({
  component: UsernameLayout,
});

function UsernameLayout() {
  return <Outlet />;
}
