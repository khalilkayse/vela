import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { DashboardPage } from "@/components/dashboard-shell";
import { ProductForm } from "@/components/product-form";
import { Skeleton } from "@/components/ui/skeleton";
import { getMyProduct } from "@/lib/server/products";
import type { Product } from "@/lib/types";

export const Route = createFileRoute("/dashboard/products/$id")({
  component: EditProduct,
});

function EditProduct() {
  const { id } = Route.useParams();
  const [product, setProduct] = useState<Product | null | undefined>(undefined);

  useEffect(() => {
    getMyProduct({ data: Number(id) })
      .then(setProduct)
      .catch(() => setProduct(null));
  }, [id]);

  if (product === undefined) {
    return (
      <DashboardPage title="Edit product">
        <Skeleton className="h-96 rounded-xl" />
      </DashboardPage>
    );
  }
  if (!product) {
    return (
      <DashboardPage title="Not found">
        <p className="text-sm text-muted">This product is gone, or it is not yours.</p>
      </DashboardPage>
    );
  }

  return (
    <DashboardPage title={product.title} description={`/${product.slug}`}>
      <ProductForm key={product.id} product={product} />
    </DashboardPage>
  );
}
