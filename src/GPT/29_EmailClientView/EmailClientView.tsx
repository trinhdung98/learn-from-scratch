import React from "react";

/* ---------- Types ---------- */

type Folder = "inbox" | "sent" | "trash";

type Email = {
  id: string;
  folder: Folder;
  from: string;
  to: string;
  subject: string;
  body: string;
  preview: string;
  date: string; // ISO
  hasAttachment?: boolean;
  read: boolean;
  starred: boolean;
};

type SortBy = "date" | "from" | "subject";
type SortDir = "asc" | "desc";

/* ---------- Utils ---------- */

function classNames(...classes: Array<string | null | undefined | false>) {
  return classes.filter(Boolean).join(" ");
}

function formatDateShort(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();

  return new Intl.DateTimeFormat("en", {
    month: sameDay ? undefined : "short",
    day: sameDay ? undefined : "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

/* ---------- Sample data ---------- */

const now = new Date();

const sampleEmails: Email[] = [
  {
    id: "1",
    folder: "inbox",
    from: "Product Team <product@example.com>",
    to: "you@example.com",
    subject: "Welcome to the new dashboard",
    body: "Hi there,\n\nWe’ve just launched a new version of the dashboard. Take a look and let us know what you think.\n\nCheers,\nThe Product Team",
    preview: "We’ve just launched a new version of the dashboard…",
    date: new Date(now.getTime() - 5 * 60 * 1000).toISOString(),
    hasAttachment: false,
    read: false,
    starred: true,
  },
  {
    id: "2",
    folder: "inbox",
    from: "HR <hr@example.com>",
    to: "you@example.com",
    subject: "Your benefits summary",
    body: "Hello,\n\nAttached is the summary of your benefits for this year.\n\nBest,\nHR",
    preview: "Attached is the summary of your benefits for this year…",
    date: new Date(now.getTime() - 60 * 60 * 1000).toISOString(),
    hasAttachment: true,
    read: false,
    starred: false,
  },
  {
    id: "3",
    folder: "inbox",
    from: "Jane Doe <jane@example.com>",
    to: "you@example.com",
    subject: "Lunch tomorrow?",
    body: "Hey,\n\nAre you free for lunch tomorrow? There’s a new place nearby I’d like to try.\n\n-Jane",
    preview: "Are you free for lunch tomorrow? There’s a new place…",
    date: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(),
    hasAttachment: false,
    read: true,
    starred: false,
  },
  {
    id: "4",
    folder: "sent",
    from: "You <you@example.com>",
    to: "team@example.com",
    subject: "Sprint planning notes",
    body: "Hi team,\n\nHere are the notes from sprint planning.\n\nThanks!",
    preview: "Here are the notes from sprint planning…",
    date: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
    hasAttachment: true,
    read: true,
    starred: false,
  },
];

/* ---------- Email List & Item ---------- */

type EmailListProps = {
  emails: Email[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onToggleStar: (id: string) => void;
  onToggleRead: (id: string) => void;
  loading: boolean;
  onLoadMore?: () => void;
  canLoadMore?: boolean;
};

function EmailList({
  emails,
  selectedId,
  onSelect,
  onToggleStar,
  onToggleRead,
  loading,
  onLoadMore,
  canLoadMore,
}: EmailListProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto rounded-lg border border-slate-200 bg-white">
        {loading && (
          <div className="px-3 py-2 text-xs text-slate-500">Loading…</div>
        )}
        {emails.length === 0 && !loading && (
          <div className="px-3 py-4 text-xs text-slate-500">
            No emails in this view.
          </div>
        )}
        <ul className="divide-y divide-slate-100 text-sm">
          {emails.map((email) => (
            <li key={email.id}>
              <EmailItem
                email={email}
                selected={email.id === selectedId}
                onSelect={() => onSelect(email.id)}
                onToggleStar={() => onToggleStar(email.id)}
                onToggleRead={() => onToggleRead(email.id)}
              />
            </li>
          ))}
        </ul>
      </div>
      {canLoadMore && onLoadMore && (
        <button
          type="button"
          onClick={onLoadMore}
          className="mt-2 w-full rounded-full border border-slate-300 bg-white px-3 py-1 text-xs text-slate-700 hover:bg-slate-50"
        >
          Load more
        </button>
      )}
    </div>
  );
}

type EmailItemProps = {
  email: Email;
  selected: boolean;
  onSelect: () => void;
  onToggleStar: () => void;
  onToggleRead: () => void;
};

function EmailItem({
  email,
  selected,
  onSelect,
  onToggleStar,
  onToggleRead,
}: EmailItemProps) {
  const { from, subject, preview, read, starred, date, hasAttachment } = email;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={classNames(
        "flex w-full items-start gap-2 px-3 py-2 text-left transition-colors",
        selected ? "bg-indigo-50" : "hover:bg-slate-50"
      )}
    >
      {/* Star / read toggle */}
      <div className="mt-[2px] flex flex-col items-center gap-1">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleStar();
          }}
          className="text-xs text-amber-400 hover:text-amber-500"
          aria-label={starred ? "Unstar" : "Star"}
        >
          {starred ? "★" : "☆"}
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleRead();
          }}
          className="text-[0.65rem] text-slate-400 hover:text-slate-600"
        >
          {read ? "Read" : "Unread"}
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1">
        <div className="flex items-center justify-between gap-2">
          <span
            className={classNames(
              "text-xs",
              read ? "text-slate-500" : "font-semibold text-slate-800"
            )}
          >
            {from}
          </span>
          <span className="whitespace-nowrap text-[0.7rem] text-slate-400">
            {formatDateShort(date)}
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-1">
          <span
            className={classNames(
              "truncate text-sm",
              read ? "text-slate-700" : "font-semibold text-slate-900"
            )}
          >
            {subject}
          </span>
          {hasAttachment && (
            <span className="text-[0.65rem] text-slate-400">📎</span>
          )}
        </div>
        <div className="mt-0.5 text-[0.75rem] text-slate-500 line-clamp-2">
          {preview}
        </div>
      </div>
    </button>
  );
}

/* ---------- Email Detail ---------- */

type EmailDetailProps = {
  email: Email | null;
  onDelete: (email: Email) => void;
  onToggleRead: (id: string) => void;
  onToggleStar: (id: string) => void;
};

function EmailDetail({
  email,
  onDelete,
  onToggleRead,
  onToggleStar,
}: EmailDetailProps) {
  if (!email) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-xs text-slate-400">
        Select an email to view its details.
      </div>
    );
  }

  const handleDelete = () => {
    onDelete(email);
  };

  return (
    <div className="flex h-full flex-col rounded-lg border border-slate-200 bg-white">
      <header className="border-b border-slate-100 px-4 py-3">
        <div className="mb-1 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-slate-900">
            {email.subject}
          </h2>
          <div className="flex items-center gap-2 text-[0.75rem]">
            <button
              type="button"
              onClick={() => onToggleStar(email.id)}
              className="rounded-full border border-slate-300 px-2 py-0.5 text-xs text-amber-500 hover:bg-amber-50"
            >
              {email.starred ? "★ Starred" : "☆ Star"}
            </button>
            <button
              type="button"
              onClick={() => onToggleRead(email.id)}
              className="rounded-full border border-slate-300 px-2 py-0.5 text-xs text-slate-700 hover:bg-slate-100"
            >
              Mark as {email.read ? "unread" : "read"}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="rounded-full border border-red-200 px-2 py-0.5 text-xs text-red-600 hover:bg-red-50"
            >
              Delete
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between text-[0.7rem] text-slate-500">
          <div>
            <div>
              <span className="font-medium">From: </span> {email.from}
            </div>
            <div>
              <span className="font-medium">To: </span> {email.to}
            </div>
          </div>
          <div>{formatDateShort(email.date)}</div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        <pre className="whitespace-pre-wrap text-[0.8rem] text-slate-800">
          {email.body}
        </pre>
      </div>
    </div>
  );
}

/* ---------- Compose Modal ---------- */

type ComposeModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSend: (draft: { to: string; subject: string; body: string }) => void;
};

function ComposeModal({ isOpen, onClose, onSend }: ComposeModalProps) {
  const [to, setTo] = React.useState("");
  const [subject, setSubject] = React.useState("");
  const [body, setBody] = React.useState("");
  const [touched, setTouched] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setTo("");
      setSubject("");
      setBody("");
      setTouched(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const valid = to.trim().length > 0 && subject.trim().length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!valid) return;
    onSend({
      to: to.trim(),
      subject: subject.trim(),
      body: body.trim() || "(no content)",
    });
  };

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/20">
      <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-lg">
        <header className="flex items-center justify-between border-b border-slate-100 px-4 py-2">
          <h2 className="text-sm font-semibold text-slate-800">New message</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"
          >
            ✕
          </button>
        </header>
        <form onSubmit={handleSubmit} className="px-4 py-3 text-xs space-y-2">
          <div>
            <label className="mb-1 block text-[0.75rem] text-slate-600">
              To
            </label>
            <input
              className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              onBlur={() => setTouched(true)}
              placeholder="recipient@example.com"
            />
          </div>
          <div>
            <label className="mb-1 block text-[0.75rem] text-slate-600">
              Subject
            </label>
            <input
              className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              onBlur={() => setTouched(true)}
              placeholder="Subject"
            />
          </div>
          <div>
            <label className="mb-1 block text-[0.75rem] text-slate-600">
              Message
            </label>
            <textarea
              className="h-40 w-full resize-none rounded-md border border-slate-300 px-2 py-1 text-xs focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your message..."
            />
          </div>

          {touched && !valid && (
            <p className="text-[0.7rem] text-red-500">
              Please provide at least a recipient and a subject.
            </p>
          )}

          <div className="mt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-slate-300 px-3 py-1 text-xs text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!valid}
              className="rounded-full bg-indigo-600 px-4 py-1 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ---------- Main Email Client ---------- */

export default function EmailClientDemo() {
  const [emails, setEmails] = React.useState<Email[]>(sampleEmails);
  const [folder, setFolder] = React.useState<Folder>("inbox");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const [search, setSearch] = React.useState("");
  const [showUnreadOnly, setShowUnreadOnly] = React.useState(false);
  const [sortBy, setSortBy] = React.useState<SortBy>("date");
  const [sortDir, setSortDir] = React.useState<SortDir>("desc");
  const [limit, setLimit] = React.useState(20);

  const [composeOpen, setComposeOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  // compute folder counts
  const folderCounts = React.useMemo(() => {
    const counts: Record<Folder, number> = {
      inbox: 0,
      sent: 0,
      trash: 0,
    };
    emails.forEach((e) => {
      counts[e.folder] += 1;
    });
    return counts;
  }, [emails]);

  // filtered + sorted emails for current folder
  const visibleEmails = React.useMemo(() => {
    const q = search.toLowerCase();

    let list = emails.filter((e) => e.folder === folder);

    if (showUnreadOnly) {
      list = list.filter((e) => !e.read);
    }

    if (q) {
      list = list.filter((e) => {
        const hay = `${e.from} ${e.subject} ${e.preview}`.toLowerCase();
        return hay.includes(q);
      });
    }

    list.sort((a, b) => {
      let cmp = 0;
      if (sortBy === "date") {
        cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
      } else if (sortBy === "from") {
        cmp = a.from.localeCompare(b.from);
      } else if (sortBy === "subject") {
        cmp = a.subject.localeCompare(b.subject);
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return list;
  }, [emails, folder, search, showUnreadOnly, sortBy, sortDir]);

  const pagedEmails = visibleEmails.slice(0, limit);
  const canLoadMore = visibleEmails.length > pagedEmails.length;

  const selectedEmail =
    emails.find((e) => e.id === selectedId && e.folder === folder) ??
    pagedEmails[0] ??
    null;

  React.useEffect(() => {
    // when folder changes, reset selection and limit
    setLimit(20);
    setSelectedId(null);
  }, [folder, search, showUnreadOnly, sortBy, sortDir]);

  const handleToggleStar = (id: string) => {
    setEmails((prev) =>
      prev.map((e) => (e.id === id ? { ...e, starred: !e.starred } : e))
    );
  };

  const handleToggleRead = (id: string) => {
    setEmails((prev) =>
      prev.map((e) => (e.id === id ? { ...e, read: !e.read } : e))
    );
  };

  const handleDelete = (email: Email) => {
    if (email.folder === "trash") {
      // permanently remove
      setEmails((prev) => prev.filter((e) => e.id !== email.id));
    } else {
      // move to trash
      setEmails((prev) =>
        prev.map((e) =>
          e.id === email.id ? { ...e, folder: "trash", read: true } : e
        )
      );
      if (folder !== "trash") {
        setFolder("trash");
      }
    }
  };

  const handleSend = (draft: { to: string; subject: string; body: string }) => {
    const newEmail: Email = {
      id: String(Date.now()),
      folder: "sent",
      from: "You <you@example.com>",
      to: draft.to,
      subject: draft.subject,
      body: draft.body,
      preview: draft.body.slice(0, 80),
      date: new Date().toISOString(),
      hasAttachment: false,
      read: true,
      starred: false,
    };
    setEmails((prev) => [newEmail, ...prev]);
    setComposeOpen(false);
    setFolder("sent");
    setSelectedId(newEmail.id);
  };

  const simulateLoadMore = () => {
    setLoading(true);
    // fake latency
    setTimeout(() => {
      setLimit((l) => l + 20);
      setLoading(false);
    }, 500);
  };

  return (
    <div className="mx-auto my-6 max-w-6xl rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-md">
      {/* Top bar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Mail</h1>
          <p className="text-[0.75rem] text-slate-500">
            Inbox list, detail view, and compose flow — great for talking about
            complex state & UI composition.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => setComposeOpen(true)}
            className="rounded-full bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-700"
          >
            + Compose
          </button>
          <div>
            <label className="mb-1 block text-[0.7rem] text-slate-600">
              Search
            </label>
            <input
              className="w-48 rounded-md border border-slate-300 px-2 py-1 text-xs focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
              placeholder="Search mail…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Main layout */}
      <div className="flex h-[540px] flex-col gap-4 md:flex-row">
        {/* Left sidebar: folders & filters */}
        <aside className="w-full max-w-xs rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 md:w-56">
          <div className="mb-3">
            <div className="mb-1 text-[0.75rem] font-semibold text-slate-600">
              Folders
            </div>
            <nav className="space-y-1">
              {(["inbox", "sent", "trash"] as Folder[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFolder(f)}
                  className={classNames(
                    "flex w-full items-center justify-between rounded-md px-2 py-1 text-left text-[0.8rem]",
                    folder === f
                      ? "bg-slate-900 text-white"
                      : "text-slate-700 hover:bg-slate-100"
                  )}
                >
                  <span className="capitalize">{f}</span>
                  <span className="ml-2 rounded-full bg-slate-200 px-1.5 py-0.5 text-[0.65rem] text-slate-700">
                    {folderCounts[f]}
                  </span>
                </button>
              ))}
            </nav>
          </div>

          <div className="mb-3 border-t border-slate-200 pt-2">
            <div className="mb-1 text-[0.75rem] font-semibold text-slate-600">
              Filters
            </div>
            <label className="flex items-center gap-2 text-[0.8rem]">
              <input
                type="checkbox"
                className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
                checked={showUnreadOnly}
                onChange={(e) => setShowUnreadOnly(e.target.checked)}
              />
              <span>Unread only</span>
            </label>
          </div>

          <div className="border-t border-slate-200 pt-2">
            <div className="mb-1 text-[0.75rem] font-semibold text-slate-600">
              Sort
            </div>
            <div className="mb-1">
              <select
                className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-[0.75rem] focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortBy)}
              >
                <option value="date">Date</option>
                <option value="from">Sender</option>
                <option value="subject">Subject</option>
              </select>
            </div>
            <div className="inline-flex overflow-hidden rounded-full border border-slate-200 bg-white">
              <button
                type="button"
                onClick={() => setSortDir("asc")}
                className={classNames(
                  "px-3 py-1 text-[0.7rem]",
                  sortDir === "asc"
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                )}
              >
                Asc
              </button>
              <button
                type="button"
                onClick={() => setSortDir("desc")}
                className={classNames(
                  "px-3 py-1 text-[0.7rem]",
                  sortDir === "desc"
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                )}
              >
                Desc
              </button>
            </div>
          </div>
        </aside>

        {/* Center: list */}
        <section className="flex-1">
          <EmailList
            emails={pagedEmails}
            selectedId={selectedEmail?.id ?? null}
            onSelect={(id) => {
              setSelectedId(id);
              // mark as read when opened
              setEmails((prev) =>
                prev.map((e) => (e.id === id ? { ...e, read: true } : e))
              );
            }}
            onToggleStar={handleToggleStar}
            onToggleRead={handleToggleRead}
            loading={loading}
            onLoadMore={simulateLoadMore}
            canLoadMore={canLoadMore}
          />
        </section>

        {/* Right: detail */}
        <section className="hidden w-full max-w-xl md:block">
          <EmailDetail
            email={selectedEmail}
            onDelete={handleDelete}
            onToggleRead={handleToggleRead}
            onToggleStar={handleToggleStar}
          />
        </section>
      </div>

      {/* Mobile detail: show under list when selected */}
      <div className="mt-4 block md:hidden">
        <EmailDetail
          email={selectedEmail}
          onDelete={handleDelete}
          onToggleRead={handleToggleRead}
          onToggleStar={handleToggleStar}
        />
      </div>

      <ComposeModal
        isOpen={composeOpen}
        onClose={() => setComposeOpen(false)}
        onSend={handleSend}
      />
    </div>
  );
}
