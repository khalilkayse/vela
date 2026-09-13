import { createFileRoute } from "@tanstack/react-router";
import { DashboardPage } from "@/components/dashboard-shell";
import { ProductForm } from "@/components/product-form";

export const Route = createFileRoute("/dashboard/articles/new")({
  component: NewArticle,
});

function NewArticle() {
  return (
    <DashboardPage
      title="New article"
      description="A title, an intro, and a body. Charge to read, or leave it free."
    >
      <ProductForm defaultKind="article" lockKind />
    </DashboardPage>
  );
}
