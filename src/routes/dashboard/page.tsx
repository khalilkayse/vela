import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { DashboardPage, useShop } from "@/components/dashboard-shell";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/skeleton";
import { errMsg } from "@/lib/errors";
import { deleteBlock, listMyBlocks, saveBlock } from "@/lib/server/blocks";
import type { PageBlock } from "@/lib/types";

export const Route = createFileRoute("/dashboard/page")({ component: PageEditor });

function PageEditor() {
  const { shop } = useShop();
  const [blocks, setBlocks] = useState<PageBlock[] | null>(null);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);

  async function reload() {
    const rows = await listMyBlocks();
    setBlocks(rows);
  }

  useEffect(() => {
    reload().catch(() => setBlocks([]));
  }, []);

  async function onAdd(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await saveBlock({ data: { title, url, kind: "link" } });
      setTitle("");
      setUrl("");
      await reload();
      toast.success("Link added.");
    } catch (error) {
      toast.error(errMsg(error));
    } finally {
      setBusy(false);
    }
  }

  async function onRemove(id: number) {
    try {
      await deleteBlock({ data: id });
      await reload();
    } catch (error) {
      toast.error(errMsg(error));
    }
  }

  async function toggleVisible(block: PageBlock) {
    try {
      await saveBlock({
        data: { id: block.id, title: block.title, url: block.url ?? "", kind: block.kind, visible: !block.visible },
      });
      await reload();
    } catch (error) {
      toast.error(errMsg(error));
    }
  }

  return (
    <DashboardPage
      title="Page"
      description="Stacked links on your public profile — the Linktree layer of your shop."
    >
      <Card className="mb-6 p-5">
        <p className="text-sm text-muted">
          Layout is set to <span className="font-medium text-fg">{shop.layout}</span>. Shop layout hides
          these buttons; Studio and Page show them above your catalog. Change this in Settings.
        </p>
      </Card>

      <form onSubmit={onAdd} className="mb-6 grid gap-4 rounded-xl border border-border bg-surface p-5 shadow-soft sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <Field label="Title">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Book a call" />
        </Field>
        <Field label="URL">
          <Input value={url} onChange={(e) => setUrl(e.target.value)} required placeholder="https://" />
        </Field>
        <Button type="submit" disabled={busy} className="sm:mb-0">
          <Plus />
          Add link
        </Button>
      </form>

      {blocks === null ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : blocks.length === 0 ? (
        <EmptyState
          title="No links yet"
          body="Add the handful of destinations you always send people: a calendar, a newsletter, selected work."
        />
      ) : (
        <ul className="space-y-2">
          {blocks.map((block) => (
            <li
              key={block.id}
              className="flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-fg">{block.title}</p>
                <p className="truncate text-xs text-muted">{block.url}</p>
              </div>
              <Switch checked={block.visible} onCheckedChange={() => toggleVisible(block)} />
              <button
                type="button"
                className="grid size-11 place-items-center rounded-md text-muted hover:bg-bg hover:text-danger"
                onClick={() => onRemove(block.id)}
                aria-label="Remove link"
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </DashboardPage>
  );
}
