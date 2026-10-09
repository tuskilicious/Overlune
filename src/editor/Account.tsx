import { useEffect, useState } from "react";
import { siTwitch } from "simple-icons";

/** What /api/me returns: only what this shows (T7.4). */
type Me = { login: string; displayName: string; avatarUrl: string | null };
type State = { kind: "checking" } | { kind: "closed" } | { kind: "out" } | { kind: "in"; me: Me };

const isJson = (res: Response) =>
  res.headers.get("Content-Type")?.startsWith("application/json") ?? false;

/**
 * Sign in with Twitch in the editor's header (T7.4). Signed out: a button. Signed in: the streamer's Twitch picture
 * and name, opening sign out, sign out everywhere and delete. Where there's no account API (`npm run dev`, or
 * production while accounts are closed) it shows nothing, and the editor works exactly as it always has: an account
 * is never needed to make overlays.
 */
export default function Account() {
  const [state, setState] = useState<State>({ kind: "checking" });
  const [status, setStatus] = useState(() =>
    new URLSearchParams(location.search).get("signin") === "failed"
      ? "Signing in with Twitch didn't work. Please try again."
      : "",
  );
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    let live = true;
    fetch("/api/me")
      .then(async (res) => {
        if (!live) return;
        if (res.ok && isJson(res)) setState({ kind: "in", me: (await res.json()) as Me });
        else if (res.status === 401 && isJson(res)) setState({ kind: "out" });
        else setState({ kind: "closed" });
      })
      .catch(() => live && setState({ kind: "closed" }));
    return () => {
      live = false;
    };
  }, []);

  /** Signs out, everywhere, or deletes: each ends signed out, with a line saying what happened. */
  const leave = async (path: string, method: "POST" | "DELETE", done: string) => {
    const res = await fetch(path, { method }).catch(() => null);
    if (res?.ok) {
      setState({ kind: "out" });
      setConfirmDelete(false);
      setStatus(done);
    } else setStatus("That didn't work. Please try again.");
  };

  if (state.kind === "checking" || state.kind === "closed") return null;
  // User image links are https only (CLAUDE.md §6). Twitch's always are; anything else shows no picture.
  const avatar = state.kind === "in" && state.me.avatarUrl?.startsWith("https://");
  return (
    <div className="editor-account">
      {state.kind === "out" ? (
        <a className="editor-account-signin" href="/api/auth/twitch">
          <svg viewBox="0 0 24 24" aria-hidden focusable="false">
            <path d={siTwitch.path} />
          </svg>
          Sign in with Twitch
        </a>
      ) : (
        <details className="editor-account-menu">
          <summary>
            {avatar && <img src={state.me.avatarUrl!} alt="" width="32" height="32" />}
            <span>{state.me.displayName}</span>
          </summary>
          <div className="editor-account-panel">
            <p>
              Signed in with Twitch as <strong>{state.me.login}</strong>.
            </p>
            <button
              type="button"
              onClick={() => leave("/api/auth/signout", "POST", "You're signed out.")}
            >
              Sign out
            </button>
            <button
              type="button"
              onClick={() =>
                leave("/api/auth/signout-everywhere", "POST", "You're signed out on every device.")
              }
            >
              Sign out everywhere
            </button>
            {confirmDelete ? (
              <div className="editor-account-confirm">
                <p>
                  Delete your Overlune account? This can't be undone. Your overlay links keep
                  working.
                </p>
                <button
                  type="button"
                  onClick={() => leave("/api/me", "DELETE", "Your account is deleted.")}
                >
                  Delete my account
                </button>
                <button type="button" onClick={() => setConfirmDelete(false)}>
                  Keep it
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => setConfirmDelete(true)}>
                Delete my account…
              </button>
            )}
          </div>
        </details>
      )}
      <span className="editor-account-status" role="status">
        {status}
      </span>
    </div>
  );
}
