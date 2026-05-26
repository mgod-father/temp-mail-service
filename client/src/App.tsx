import { Check, Copy, Inbox as InboxIcon, Mail, RefreshCw, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api, type Email, type InboxPayload } from "./api";

const fallbackDomains = ["only4traders.tech", "xchartingview.com"];

export default function App() {
  const [domains, setDomains] = useState(fallbackDomains);
  const [name, setName] = useState("");
  const [domain, setDomain] = useState(fallbackDomains[0]);
  const [data, setData] = useState<InboxPayload | null>(null);
  const [selected, setSelected] = useState<Email | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [extending, setExtending] = useState(false);
  const [extended, setExtended] = useState(false);
  const [actionError, setActionError] = useState("");
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    api.getDomains().then(({ domains }) => {
      if (domains.length) {
        setDomains(domains);
        setDomain(domains[0]);
      }
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!data) return;

    const refresh = window.setInterval(refreshInbox, 5000);

    return () => window.clearInterval(refresh);
  }, [data?.inbox.emailAddress]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const timeLeft = useMemo(() => {
    if (!data) return "";
    const seconds = Math.max(0, Math.floor((new Date(data.inbox.expiresAt).getTime() - now) / 1000));
    const minutes = Math.floor(seconds / 60);
    return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
  }, [data, now]);

  async function createInbox() {
    setError("");
    setLoading(true);
    try {
      const inbox = await api.createInbox(name, domain);
      setData(inbox);
      setSelected(inbox.emails[0] ?? null);
      setActionError("");
      setCopied(false);
      setExtended(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create inbox.");
    } finally {
      setLoading(false);
    }
  }

  async function extendInbox() {
    if (!data) return;
    setActionError("");
    setExtended(false);
    setExtending(true);

    try {
      const { inbox } = await api.extendInbox(data.inbox.emailAddress);
      setData({ ...data, inbox });
      setExtended(true);
      window.setTimeout(() => setExtended(false), 1800);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not extend inbox.");
    } finally {
      setExtending(false);
    }
  }

  async function refreshInbox(showFeedback = false) {
    if (!data) return;
    if (showFeedback) {
      setActionError("");
      setRefreshing(true);
    }

    try {
      const next = await api.getInbox(data.inbox.emailAddress);
      setData(next);
      setSelected((current) => next.emails.find((email) => email.id === current?.id) ?? next.emails[0] ?? null);
    } catch {
      setData(null);
      setSelected(null);
    } finally {
      if (showFeedback) setRefreshing(false);
    }
  }

  async function copyAddress() {
    if (!data) return;
    setActionError("");

    try {
      await navigator.clipboard?.writeText(data.inbox.emailAddress);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setActionError("Could not copy email.");
    }
  }

  async function deleteInbox() {
    if (!data) return;
    await api.deleteInbox(data.inbox.emailAddress);
    setData(null);
    setSelected(null);
  }

  async function deleteEmail(id: string) {
    await api.deleteEmail(id);
    if (!data) return;
    const emails = data.emails.filter((email) => email.id !== id);
    setData({ ...data, emails });
    setSelected(emails[0] ?? null);
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6">
        <header className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-lg bg-emerald-600 text-white">
            <Mail size={22} />
          </span>
          <div>
            <h1 className="text-2xl font-bold">Temp Mail</h1>
            <p className="text-sm text-slate-600">Disposable inboxes that clean themselves.</p>
          </div>
        </header>

        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-[1fr_220px_auto]">
            <label className="grid gap-1 text-sm font-medium">
              Custom name
              <input
                className="h-11 rounded-md border border-slate-300 px-3 outline-none focus:border-emerald-600"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="johndoe"
              />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Domain
              <select
                className="h-11 rounded-md border border-slate-300 px-3 outline-none focus:border-emerald-600"
                value={domain}
                onChange={(event) => setDomain(event.target.value)}
              >
                {domains.map((item) => (
                  <option key={item} value={item}>@{item}</option>
                ))}
              </select>
            </label>
            <button
              className="mt-auto h-11 rounded-md bg-emerald-600 px-5 font-semibold text-white disabled:opacity-60"
              disabled={loading}
              onClick={createInbox}
            >
              {loading ? "Creating..." : "Create inbox"}
            </button>
          </div>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        </section>

        {data && (
          <section className="grid gap-4 lg:grid-cols-[360px_1fr]">
            <aside className="rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 p-4">
                <p className="text-sm text-slate-600">Your email</p>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <strong className="break-all text-lg">{data.inbox.emailAddress}</strong>
                  <button
                    aria-label="Copy"
                    className="grid h-9 w-9 place-items-center rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:border-emerald-200 disabled:text-emerald-700"
                    disabled={copied}
                    onClick={copyAddress}
                  >
                    {copied ? <Check size={17} /> : <Copy size={17} />}
                  </button>
                </div>
                {copied && <p className="mt-2 text-sm font-medium text-emerald-700">Copied</p>}
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-md bg-slate-100 px-3 py-2 text-sm">Expires in {timeLeft}</span>
                  <button
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-60"
                    disabled={extending}
                    onClick={extendInbox}
                  >
                    {extending ? "Extending..." : extended ? "Extended" : "+15 min"}
                  </button>
                  <button className="rounded-md border border-red-200 px-3 py-2 text-sm text-red-600" onClick={deleteInbox}>
                    Delete
                  </button>
                </div>
                {actionError && <p className="mt-3 text-sm text-red-600">{actionError}</p>}
              </div>

              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                <span className="font-semibold">Inbox</span>
                <button
                  aria-label={refreshing ? "Refreshing inbox" : "Refresh inbox"}
                  className="grid h-8 w-8 place-items-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-60"
                  disabled={refreshing}
                  onClick={() => refreshInbox(true)}
                >
                  <RefreshCw className={refreshing ? "animate-spin" : ""} size={16} />
                </button>
              </div>

              <div className="max-h-[460px] overflow-auto">
                {data.emails.length === 0 ? (
                  <div className="grid place-items-center gap-2 p-10 text-center text-slate-500">
                    <InboxIcon size={34} />
                    <p>No emails yet.</p>
                  </div>
                ) : (
                  data.emails.map((email) => (
                    <button
                      key={email.id}
                      aria-current={selected?.id === email.id ? "true" : undefined}
                      className={`block w-full border-b p-4 text-left transition ${
                        selected?.id === email.id
                          ? "border-emerald-200 bg-emerald-50 ring-1 ring-inset ring-emerald-200"
                          : "border-slate-100 hover:bg-slate-50"
                      }`}
                      onClick={() => setSelected(email)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <strong className="line-clamp-1">{email.subject}</strong>
                        <span className="text-xs text-slate-500">{new Date(email.receivedAt).toLocaleTimeString()}</span>
                      </div>
                      <p className="mt-1 line-clamp-1 text-sm text-slate-600">{email.fromAddress}</p>
                    </button>
                  ))
                )}
              </div>
            </aside>

            <article className="min-h-[360px] rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              {selected ? (
                <div className="grid gap-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="break-words text-xl font-bold">{selected.subject}</h2>
                      <p className="mt-1 text-sm text-slate-600">From {selected.fromAddress}</p>
                      <p className="text-sm text-slate-500">{new Date(selected.receivedAt).toLocaleString()}</p>
                    </div>
                    <button
                      aria-label="Delete email"
                      className="grid h-9 w-9 place-items-center rounded-md border border-red-200 text-red-600"
                      onClick={() => deleteEmail(selected.id)}
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                  {selected.bodyHtml ? (
                    <iframe
                      className="min-h-[300px] w-full rounded-md border border-slate-200 bg-white"
                      sandbox="allow-same-origin"
                      srcDoc={selected.bodyHtml}
                      title="Email HTML content"
                    />
                  ) : (
                    <div className="whitespace-pre-wrap rounded-md bg-slate-50 p-4 text-sm leading-6">
                      {selected.bodyText || "No body."}
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid h-full place-items-center text-center text-slate-500">
                  <p>Select an email to read.</p>
                </div>
              )}
            </article>
          </section>
        )}
      </section>
    </main>
  );
}
