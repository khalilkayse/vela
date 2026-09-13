import { useEffect, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { DashboardPage } from "@/components/dashboard-shell";
import { EmptyState } from "@/components/empty-state";
import { ProductCover } from "@/components/product-cover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { htmlToPlain } from "@/lib/html";
import { listMyProducts } from "@/lib/server/products";
import type { Product } from "@/lib/types";
import { formatPrice } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/articles/")({ component: ArticlesPage });

function ArticlesPage() {
  const [articles, setArticles] = useState<Product[] | null>(null);

  useEffect(() => {
    listMyProducts()
      .then((rows) => setArticles(rows.filter((row) => row.kind === "article")))
      .catch(() => setArticles([]));
  }, []);

  return (
    <DashboardPage
      title="Articles"
      description="Essays and notes on your page. Keep them free, or charge once to read."
      action={
        <Button asChild>
          <Link to="/dashboard/articles/new">
            <Plus />
            Write article
          </Link>
        </Button>
      }
    >
      {articles === null ? (
        <div className="grid gap-3">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      ) : articles.length === 0 ? (
        <EmptyState
          title="No articles yet"
          body="Write a title and a body. Toggle paid, read only if you want readers to unlock it at checkout."
          action={
            <Button asChild>
              <Link to="/dashboard/articles/new">Write your first article</Link>
            </Button>
          }
        />
      ) : (
        <ul className="space-y-3">
          {articles.map((article) => (
            <li key={article.id}>
              <Link
                to="/dashboard/products/$id"
                params={{ id: String(article.id) }}
                className="flex min-w-0 gap-4 rounded-xl border border-border bg-surface p-3 shadow-soft transition-[transform] duration-150 hover:-translate-y-0.5 sm:p-4"
              >
                <ProductCover
                  style={article.coverStyle}
                  imageUrl={article.coverUrl}
                  className="h-20 w-28 shrink-0 rounded-md"
                />
                <div className="min-w-0 flex-1 py-0.5">
                  <div className="flex items-start justify-between gap-3">
                    <p className="truncate font-medium text-fg">{article.title}</p>
                    <p className="shrink-0 tabular-nums text-sm font-semibold text-fg">
                      {article.price > 0 ? formatPrice(article.price, article.currency) : "Free"}
                    </p>
                  </div>
                  <p className="mt-1 line-clamp-1 text-sm text-muted">
                    {htmlToPlain(article.description) || htmlToPlain(article.bodyHtml) || "No intro"}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Badge tone="primary">{article.paywalled ? "Paid read" : "Free"}</Badge>
                    {article.published ? <Badge tone="success">Live</Badge> : <Badge>Draft</Badge>}
                    {article.featured ? <Badge>Featured</Badge> : null}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </DashboardPage>
  );
}
