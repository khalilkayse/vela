import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, Pencil, Plus, Trash2 } from "lucide-react";
import { DashboardPage, useShop } from "@/components/dashboard-shell";
import { EmptyState, ErrorState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/skeleton";
import { errMsg } from "@/lib/errors";
import { deleteBlock, listMyBlocks, reorderBlocks, saveBlock } from "@/lib/server/blocks";
import type { PageBlock } from "@/lib/types";

export const Route = createFileRoute("/dashboard/page")({ component: PageEditor });

function PageEditor() {
  const { shop } = useShop();
  const [blocks, setBlocks] = useState<PageBlock[] | null>(null);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [kind, setKind] = useState<"link" | "heading">("link");
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  async function reload() {
    setLoadError(null);
    const rows = await listMyBlocks();
    setBlocks(rows);
  }

  useEffect(() => {
    reload().catch((error) => setLoadError(errMsg(error)));
  }, []);

  function selectKind(next: "link" | "heading") {
    setKind(next);
    // The URL field disappears for headings — clear it so switching back and
    // forth can't silently save a stale URL from before the switch.
    if (next === "heading") setUrl("");
  }

  async function onAdd(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await saveBlock({ data: { title, url: kind === "heading" ? "" : url, kind } });
      setTitle("");
      setUrl("");
      await reload();
      toast.success(kind === "heading" ? "Heading added." : "Link added.");
    } catch (error) {
      toast.error(errMsg(error));
    } finally {
      setBusy(false);
    }
  }

  async function onRemove(block: PageBlock) {
    if (!window.confirm(`Remove "${block.title}" from your page?`)) return;
    try {
      await deleteBlock({ data: block.id });
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

  function startEdit(block: PageBlock) {
    setEditingId(block.id);
    setEditTitle(block.title);
    setEditUrl(block.url ?? "");
  }

  async function saveEdit(block: PageBlock) {
    setSavingEdit(true);
    try {
      await saveBlock({
        data: {
          id: block.id,
          title: editTitle,
          url: block.kind === "heading" ? "" : editUrl,
          kind: block.kind,
          visible: block.visible,
        },
      });
      setEditingId(null);
      await reload();
      toast.success("Saved.");
    } catch (error) {
      toast.error(errMsg(error));
    } finally {
      setSavingEdit(false);
    }
  }

  async function move(index: number, dir: -1 | 1) {
    if (!blocks) return;
    const next = [...blocks];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    setBlocks(next);
    try {
      await reorderBlocks({ data: next.map((block) => block.id) });
    } catch (error) {
      toast.error(errMsg(error));
      await reload();
    }
  }

  const layoutNote =
    shop.layout === "shop"
      ? "Shop layout hides these buttons on the public page. Switch to Studio or Page in Settings to show them."
      : shop.layout === "links"
        ? "Page layout stacks these buttons in a single column. Products you sell appear as buttons underneath."
        : "Studio layout shows these buttons under your bio, then your products.";

  return (
    <DashboardPage
      title="Page"
      description="Buttons and headings on your public profile — a calendar, a newsletter, selected work."
    >
      <Card className="mb-6 p-5">
        <p className="text-sm text-muted">{layoutNote}</p>
      </Card>

      <form onSubmit={onAdd} className="mb-6 grid gap-4 rounded-xl border border-border bg-surface p-5 shadow-soft sm:grid-cols-[auto_1fr_1fr_auto] sm:items-end">
        <div>
          <p className="mb-1.5 text-[13px] font-medium text-fg">Type</p>
          <div className="flex rounded-md border border-border p-1">
            <button
              type="button"
              className={`h-9 rounded px-3 text-sm ${kind === "link" ? "bg-primary text-primary-fg" : "text-muted"}`}
              onClick={() => selectKind("link")}
            >
              Link
            </button>
            <button
              type="button"
              className={`h-9 rounded px-3 text-sm ${kind === "heading" ? "bg-primary text-primary-fg" : "text-muted"}`}
              onClick={() => selectKind("heading")}
            >
              Heading
            </button>
          </div>
        </div>
        <Field label={kind === "heading" ? "Heading" : "Title"}>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder={kind === "heading" ? "Selected work" : "Book a call"} />
        </Field>
        {kind === "link" ? (
          <Field label="URL">
            <Input value={url} onChange={(e) => setUrl(e.target.value)} required placeholder="https://" />
          </Field>
        ) : (
          <div />
        )}
        <Button type="submit" disabled={busy} className="sm:mb-0">
          <Plus />
          Add
        </Button>
      </form>

      {loadError ? (
        <ErrorState message={loadError} onRetry={() => void reload().catch((error) => setLoadError(errMsg(error)))} />
      ) : blocks === null ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : blocks.length === 0 ? (
        <EmptyState
          title="No links yet"
          body="Add the destinations you always send people: a calendar, a newsletter, selected work. Headings split the stack into groups."
        />
      ) : (
        <ul className="space-y-2">
          {blocks.map((block, index) => (
            <li
              key={block.id}
              className="rounded-lg border border-border bg-surface px-3 py-3 sm:px-4"
            >
              {editingId === block.id ? (
                <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                  <Field label={block.kind === "heading" ? "Heading" : "Title"}>
                    <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                  </Field>
                  {block.kind === "link" ? (
                    <Field label="URL">
                      <Input value={editUrl} onChange={(e) => setEditUrl(e.target.value)} placeholder="https://" />
                    </Field>
                  ) : (
                    <div />
                  )}
                  <div className="flex gap-2">
                    <Button type="button" size="sm" disabled={savingEdit} onClick={() => void saveEdit(block)}>
                      {savingEdit ? "Saving…" : "Save"}
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="flex flex-col">
                    <button
                      type="button"
                      className="grid size-8 place-items-center rounded text-muted hover:bg-bg hover:text-fg disabled:opacity-30"
                      onClick={() => void move(index, -1)}
                      disabled={index === 0}
                      aria-label="Move up"
                    >
                      <ChevronUp className="size-4" />
                    </button>
                    <button
                      type="button"
                      className="grid size-8 place-items-center rounded text-muted hover:bg-bg hover:text-fg disabled:opacity-30"
                      onClick={() => void move(index, 1)}
                      disabled={index === blocks.length - 1}
                      aria-label="Move down"
                    >
                      <ChevronDown className="size-4" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => startEdit(block)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className="truncate text-sm font-medium text-fg">{block.title}</p>
                    <p className="truncate text-xs text-muted">
                      {block.kind === "heading" ? "Heading" : block.url}
                    </p>
                  </button>
                  <Switch
                    checked={block.visible}
                    onCheckedChange={() => toggleVisible(block)}
                    ariaLabel={`${block.visible ? "Hide" : "Show"} "${block.title}" on your page`}
                  />
                  <button
                    type="button"
                    className="grid size-11 place-items-center rounded-md text-muted hover:bg-bg hover:text-danger"
                    onClick={() => startEdit(block)}
                    aria-label={`Edit "${block.title}"`}
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    type="button"
                    className="grid size-11 place-items-center rounded-md text-muted hover:bg-bg hover:text-danger"
                    onClick={() => void onRemove(block)}
                    aria-label={`Remove "${block.title}"`}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </DashboardPage>
  );
}
