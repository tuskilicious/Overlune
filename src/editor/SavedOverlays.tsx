import { useEffect, useId, useState } from "react";
import type { Settings } from "../settings/schema";
import { decode, encode } from "../settings/url";

/** A saved overlay as the list shows it (GET /api/overlays, T12.2). */
type Summary = { id: string; name: string };
/** The saved overlay being edited: links copied now are its own, and "Update OBS" sends the editor's settings to it.
 *  `published` is what OBS shows, in the link's form. */
export type SavedOverlay = { id: string; name: string; published: string | null };

type State =
  | { kind: "checking" }
  | { kind: "none" } // signed out, or no saved-overlays API (`npm run dev`, or production before it opens)
  | { kind: "in"; overlays: Summary[]; limit: number };

/** The overlay being edited survives a reload of this tab, never a new visit, so a link opened later can't be sent to
 *  it by mistake. */
const KEY = "overlune:saved-overlay";
function remembered(): string | null {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}
function remember(id: string | null) {
  try {
    if (id) sessionStorage.setItem(KEY, id);
    else sessionStorage.removeItem(KEY);
  } catch {
    // A convenience: without it, open the overlay again from the list.
  }
}

const send = (path: string, method: string, body?: unknown) =>
  fetch(path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  }).catch(() => null);

const TRY_AGAIN = "That didn't work. Please try again.";

/**
 * Saved overlays (T12.5), above the links: signed in, save the overlay to your account, then open, rename and delete
 * your saved ones. A saved overlay's links follow it, so after an edit "Update OBS" changes what OBS shows without
 * pasting a new link. Signed out, or with no API, it shows nothing and the editor works as it always has.
 */
export default function SavedOverlays({
  settings,
  current,
  setCurrent,
  onOpen,
}: {
  settings: Settings;
  current: SavedOverlay | null;
  setCurrent: (overlay: SavedOverlay | null) => void;
  onOpen: (settings: Settings) => void;
}) {
  const [state, setState] = useState<State>({ kind: "checking" });
  const [name, setName] = useState("");
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const nameId = useId();
  /** Read before the effect below writes over it. */
  const [reopen] = useState(remembered);

  useEffect(() => {
    let live = true;
    fetch("/api/overlays")
      .then(async (res) => {
        if (!live) return;
        if (!res.ok || !res.headers.get("Content-Type")?.startsWith("application/json"))
          return setState({ kind: "none" });
        const { overlays, limit } = (await res.json()) as { overlays: Summary[]; limit: number };
        setState({ kind: "in", overlays, limit });
        // Reloaded while editing a saved overlay: keep editing it, with what OBS shows for "Update OBS".
        if (!reopen || !overlays.some((o) => o.id === reopen)) return;
        const one = await fetch(`/api/overlays/${reopen}`).catch(() => null);
        if (live && one?.ok) {
          const o = (await one.json()) as Summary & { published: string | null };
          setCurrent({ id: o.id, name: o.name, published: o.published });
        }
      })
      .catch(() => live && setState({ kind: "none" }));
    return () => {
      live = false;
    };
    // Once, on opening the editor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => remember(current?.id ?? null), [current?.id]);

  const draft = encode(settings);
  // Compared as settings, not as text: the same settings can be written with their fields in another order.
  const shown = current?.published ? JSON.stringify(decode(current.published).settings) : null;
  const behind = current !== null && shown !== JSON.stringify(decode(draft).settings);

  if (state.kind !== "in") return null;
  const { overlays, limit } = state;
  const full = overlays.length >= limit;
  const setOverlays = (f: (o: Summary[]) => Summary[]) =>
    setState((s) => (s.kind === "in" ? { ...s, overlays: f(s.overlays) } : s));

  /** Runs one action, one at a time, and says what happened. Signed out meanwhile: the panel goes. */
  const act = async (work: () => Promise<string>) => {
    setBusy(true);
    try {
      setStatus(await work());
    } catch (e) {
      if (e instanceof Response && e.status === 401) setState({ kind: "none" });
      setStatus(e instanceof Response && e.status === 409 ? await message(e) : TRY_AGAIN);
    } finally {
      setBusy(false);
    }
  };
  const ok = (res: Response | null) => {
    if (!res?.ok) throw res ?? new Error("offline");
    return res;
  };

  /** Saves the draft and makes it what OBS shows. */
  const publish = async (id: string) => {
    ok(await send(`/api/overlays/${id}`, "PATCH", { settings: draft }));
    ok(await send(`/api/overlays/${id}/publish`, "POST"));
  };

  const save = () =>
    act(async () => {
      const saved = (await ok(
        await send("/api/overlays", "POST", { name: name.trim(), settings: draft }),
      ).json()) as Summary;
      ok(await send(`/api/overlays/${saved.id}/publish`, "POST"));
      setOverlays((o) => [{ id: saved.id, name: saved.name }, ...o]);
      setCurrent({ id: saved.id, name: saved.name, published: draft });
      setName("");
      return `Saved as “${saved.name}”. Copy its links below into OBS.`;
    });

  const updateObs = () =>
    act(async () => {
      await publish(current!.id);
      setCurrent({ ...current!, published: draft });
      return "OBS is up to date.";
    });

  const open = (id: string) =>
    act(async () => {
      const o = (await ok(
        await fetch(`/api/overlays/${id}`).catch(() => null),
      ).json()) as Summary & {
        draft: string;
        published: string | null;
      };
      onOpen(decode(o.draft).settings);
      setCurrent({ id: o.id, name: o.name, published: o.published });
      return `Opened “${o.name}”.`;
    });

  const rename = (id: string, newName: string) =>
    act(async () => {
      const saved = (await ok(
        await send(`/api/overlays/${id}`, "PATCH", { name: newName.trim() }),
      ).json()) as Summary;
      setOverlays((o) => o.map((x) => (x.id === id ? { ...x, name: saved.name } : x)));
      if (current?.id === id) setCurrent({ ...current, name: saved.name });
      setRenaming(null);
      return `Renamed to “${saved.name}”.`;
    });

  const remove = (id: string) =>
    act(async () => {
      ok(await send(`/api/overlays/${id}`, "DELETE"));
      const gone = overlays.find((o) => o.id === id)?.name ?? "";
      setOverlays((o) => o.filter((x) => x.id !== id));
      if (current?.id === id) setCurrent(null);
      setConfirmDelete(null);
      return `Deleted “${gone}”. Its links in OBS keep showing what they last showed.`;
    });

  const nameOk = (n: string) => n.trim().length >= 1 && Array.from(n.trim()).length <= 40;

  return (
    <div className="editor-my-overlays" aria-labelledby="saved-heading" role="group">
      <h3 id="saved-heading">Your saved overlays</h3>
      {current ? (
        <div className="editor-my-overlays-current">
          <p>
            Editing <strong>{current.name}</strong>. Its links stay the same: after a change, press
            Update OBS and OBS shows it within a few seconds.
          </p>
          <div className="editor-my-overlays-update">
            <button type="button" onClick={updateObs} disabled={busy || !behind}>
              Update OBS
            </button>
            <span className={behind ? "editor-my-overlays-behind" : undefined}>
              {behind ? "Changes not in OBS yet" : "OBS is up to date"}
            </span>
            <button type="button" onClick={() => setCurrent(null)}>
              Stop editing it
            </button>
          </div>
        </div>
      ) : (
        <form
          className="editor-my-overlays-new"
          onSubmit={(e) => {
            e.preventDefault();
            if (nameOk(name) && !full) void save();
          }}
        >
          <p>
            Save this overlay to your account, and later changes reach OBS with one button, without
            pasting new links.
          </p>
          <label htmlFor={nameId}>Name</label>
          <input
            id={nameId}
            value={name}
            maxLength={40}
            placeholder="My stream"
            onChange={(e) => setName(e.target.value)}
            disabled={full}
          />
          <button type="submit" disabled={busy || full || !nameOk(name)}>
            Save to my account
          </button>
          {full && (
            <p className="editor-hint">
              You’ve saved {limit}, the most you can keep. Delete one below to save a new one.
            </p>
          )}
        </form>
      )}
      <p className="editor-my-overlays-count">
        {overlays.length} of {limit} saved
      </p>
      {overlays.length > 0 && (
        <ul className="editor-my-overlays-list">
          {overlays.map((o) => (
            <li key={o.id} aria-current={current?.id === o.id || undefined}>
              {renaming?.id === o.id ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (nameOk(renaming.name)) void rename(o.id, renaming.name);
                  }}
                >
                  <input
                    aria-label={`New name for ${o.name}`}
                    value={renaming.name}
                    maxLength={40}
                    autoFocus
                    onChange={(e) => setRenaming({ id: o.id, name: e.target.value })}
                    onKeyDown={(e) => e.key === "Escape" && setRenaming(null)}
                  />
                  <button type="submit" disabled={busy || !nameOk(renaming.name)}>
                    Save name
                  </button>
                  <button type="button" onClick={() => setRenaming(null)}>
                    Cancel
                  </button>
                </form>
              ) : confirmDelete === o.id ? (
                <div className="editor-my-overlays-confirm">
                  <span>
                    Delete <strong>{o.name}</strong>? Its links in OBS stop updating.
                  </span>
                  <button type="button" onClick={() => remove(o.id)} disabled={busy}>
                    Delete it
                  </button>
                  <button type="button" onClick={() => setConfirmDelete(null)} autoFocus>
                    Keep it
                  </button>
                </div>
              ) : (
                <>
                  <span className="editor-my-overlays-name">
                    {o.name}
                    {current?.id === o.id && <span className="editor-optional"> (editing)</span>}
                  </span>
                  <button
                    type="button"
                    onClick={() => open(o.id)}
                    disabled={busy}
                    aria-label={`Open ${o.name}`}
                  >
                    Open
                  </button>
                  <button
                    type="button"
                    onClick={() => setRenaming({ id: o.id, name: o.name })}
                    aria-label={`Rename ${o.name}`}
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(o.id)}
                    aria-label={`Delete ${o.name}`}
                  >
                    Delete
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
      <span className="editor-my-overlays-status" role="status">
        {status}
      </span>
    </div>
  );
}

/** The API's own words for a refusal it explains (the limit), or the usual line. */
async function message(res: Response): Promise<string> {
  try {
    return ((await res.json()) as { message?: string }).message ?? TRY_AGAIN;
  } catch {
    return TRY_AGAIN;
  }
}
