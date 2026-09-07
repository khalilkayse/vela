import { createFileRoute } from "@tanstack/react-router";
import { DashboardPage } from "@/components/dashboard-shell";
import { ProductForm } from "@/components/product-form";

export const Route = createFileRoute("/dashboard/products/new")({
  component: NewProduct,
});

function NewProduct() {
  return (
    <DashboardPage title="New product" description="A file, a session, or a free link on your page.">
      <ProductForm />
    </DashboardPage>
  );
}
