import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { AdminPage } from "@/components/dashx-shell";
import { Badge, Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { getAccessSettings, getReservedUsernames, saveAccessSettings, saveReservedUsernames } from "@/lib/server/admin";
import { allCountryCodes, countryName, formatCountry, parseCountryList } from "@/lib/geo";
import { errMsg } from "@/lib/errors";

export const Route = createFileRoute("/dashx/access")({ component: DashxAccess });

function DashxAccess() {
  const [blocked, setBlocked] = useState<string[]>([]);
  const [defaultCountry, setDefaultCountry] = useState("");
  const [draft, setDraft] = useState("");
  const [extraNames, setExtraNames] = useState<string[]>([]);
  const [lockedNames, setLockedNames] = useState<string[]>([]);
  const [nameDraft, setNameDraft] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const codes = useMemo(() => allCountryCodes(), []);

  useEffect(() => {
    Promise.all([getAccessSettings(), getReservedUsernames()])
      .then(([access, names]) => {
        setBlocked(access.blockedCountries);
        setDefaultCountry(access.defaultSignupCountry);
        setExtraNames(names.extra);
        setLockedNames(names.locked);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  function addDraft() {
    const next = parseCountryList(draft);
    if (next.length === 0) return;
    setBlocked((current) => [...new Set([...current, ...next])]);
    setDraft("");
  }

  function addName() {
    const value = nameDraft.trim().toLowerCase();
    if (value.length < 2) return;
    setExtraNames((current) => [...new Set([...current, value])]);
    setNameDraft("");
  }

  async function onSave(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const extra = parseCountryList(draft);
      const result = await saveAccessSettings({
        data: {
          blockedCountries: [...blocked, ...extra],
          defaultSignupCountry: defaultCountry,
        },
      });
      setBlocked(result.blockedCountries);
      setDraft("");
      const extraDraft = nameDraft.trim().toLowerCase();
      const names = extraDraft ? [...extraNames, extraDraft] : extraNames;
      const saved = await saveReservedUsernames({ data: { extra: names } });
      setExtraNames(saved.extra);
      setNameDraft("");
      toast.success("Access rules saved.");
    } catch (error) {
      toast.error(errMsg(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminPage
      title="Access"
      description="Recorded country comes from Cloudflare and similar proxy headers (CF-IPCountry). Unknown visitors fall back to the default below. Blocked countries cannot create new accounts — existing ones can still sign in."
    >
      <form onSubmit={onSave} className="space-y-6">
        <Card className="p-6">
          <h2 className="text-base font-semibold text-fg">Default shop country</h2>
          <p className="mt-1 text-sm text-muted">
            Used when the request has no country header. New shops inherit this so catalogs can be
            based in the right market.
          </p>
          <div className="mt-4 max-w-xs">
            <Field label="ISO country">
              <Input
                value={defaultCountry}
                onChange={(e) => setDefaultCountry(e.target.value.toUpperCase())}
                list="kart-countries"
                placeholder="SO"
                maxLength={2}
              />
            </Field>
            {defaultCountry ? (
              <p className="mt-2 text-xs text-muted">{formatCountry(defaultCountry)}</p>
            ) : null}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-base font-semibold text-fg">Blocked signup countries</h2>
          <p className="mt-1 text-sm text-muted">
            Type an ISO code (SO, KE, US) or several separated by commas.
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value.toUpperCase())}
              list="kart-countries"
              placeholder="KE, ET"
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addDraft();
                }
              }}
            />
            <Button type="button" variant="secondary" onClick={addDraft}>
              Add
            </Button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {blocked.length === 0 ? (
              <p className="text-sm text-muted">No countries blocked.</p>
            ) : (
              blocked.map((code) => (
                <button
                  key={code}
                  type="button"
                  className="inline-flex"
                  onClick={() => setBlocked((current) => current.filter((item) => item !== code))}
                  title="Remove"
                >
                  <Badge tone="danger">{formatCountry(code)}</Badge>
                </button>
              ))
            )}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-base font-semibold text-fg">Reserved usernames</h2>
          <p className="mt-1 text-sm text-muted">
            These cannot be claimed as shop URLs. People who try them just see that the username is not
            available. Locked names protect Kart routes.
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <Input
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value.toLowerCase())}
              placeholder="brand, official, shop"
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addName();
                }
              }}
            />
            <Button type="button" variant="secondary" onClick={addName}>
              Add
            </Button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {extraNames.length === 0 ? (
              <p className="text-sm text-muted">No extra names yet.</p>
            ) : (
              extraNames.map((name) => (
                <button
                  key={name}
                  type="button"
                  className="inline-flex"
                  onClick={() => setExtraNames((current) => current.filter((item) => item !== name))}
                  title="Remove"
                >
                  <Badge tone="danger">{name}</Badge>
                </button>
              ))
            )}
          </div>
          <p className="mt-5 text-xs font-medium uppercase tracking-[0.12em] text-muted">Locked</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {lockedNames.map((name) => (
              <Badge key={name}>{name}</Badge>
            ))}
          </div>
        </Card>

        <Button type="submit" disabled={!loaded || saving}>
          {saving ? "Saving…" : "Save access"}
        </Button>
      </form>
      <datalist id="kart-countries">
        {codes.map((code) => (
          <option key={code} value={code}>
            {countryName(code)}
          </option>
        ))}
      </datalist>
    </AdminPage>
  );
}
