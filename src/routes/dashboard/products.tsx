import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/products")({
  component: ProductsLayout,
});

function ProductsLayout() {
  return <Outlet />;
}
