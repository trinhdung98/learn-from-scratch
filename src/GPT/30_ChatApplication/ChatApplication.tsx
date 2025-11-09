import React from "react";

/* ---------- Types ---------- */

type Sender = "me" | "teammate";

type MessageStatus = "sending" | "sent" | "delivered" | "read";

type Message = {
  id: string;
  sender: Sender;
  text: string;
  createdAt: number; // timestamp
  status: MessageStatus;
};

/* ---------- Utilities ---------- */

function classNames(...classes: Array<string | null | undefined | false>) {
  return classes.filter(Boolean).join(" ");
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString("en", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ---------- Subcomponents ---------- */

type MessageBubbleProps = {
  message: Message;
  isOwn: boolean;
};

function MessageBubble({ message, isOwn }: MessageBubbleProps) {
  const statusLabel =
    message.sender === "me"
      ? message.status === "sending"
        ? "Sending…"
        : message.status === "sent"
        ? "Sent"
        : message.status === "delivered"
        ? "Delivered"
        : "Read"
      : "";

  return (
    <div
      className={classNames(
        "mb-2 flex items-end gap-2",
        isOwn ? "justify-end" : "justify-start"
      )}
    >
      {!isOwn && (
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-500 text-[0.75rem] font-semibold text-white">
          T
        </div>
      )}

      <div
        className={classNames(
          "max-w-[70%] rounded-2xl px-3 py-2 text-sm shadow-sm",
          isOwn
            ? "rounded-br-sm bg-indigo-600 text-white"
            : "rounded-bl-sm bg-slate-100 text-slate-900"
        )}
      >
        <p className="whitespace-pre-wrap break-words">{message.text}</p>
        <div
          className={classNames(
            "mt-1 flex items-center gap-2 text-[0.65rem]",
            isOwn ? "text-indigo-100/80" : "text-slate-500"
          )}
        >
          <span>{formatTime(message.createdAt)}</span>
          {statusLabel && <span>• {statusLabel}</span>}
        </div>
      </div>

      {isOwn && (
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-800 text-[0.75rem] font-semibold text-white">
          Me
        </div>
      )}
    </div>
  );
}

type MessageListProps = {
  messages: Message[];
};

function MessageList({ messages }: MessageListProps) {
  const bottomRef = React.useRef<HTMLDivElement | null>(null);

  // Auto-scroll to bottom on new messages
  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div
      className="flex-1 overflow-y-auto px-3 py-2"
      role="log"
      aria-live="polite"
      aria-relevant="additions"
    >
      {messages.length === 0 && (
        <div className="mt-10 text-center text-xs text-slate-500">
          No messages yet. Say hi 👋
        </div>
      )}
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} isOwn={msg.sender === "me"} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}

type MessageInputProps = {
  value: string;
  onChange: (val: string) => void;
  onSend: () => void;
  disabled?: boolean;
};

function MessageInput({
  value,
  onChange,
  onSend,
  disabled,
}: MessageInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const trimmed = value.trim();
  const canSend = !disabled && trimmed.length > 0;

  return (
    <div className="border-t border-slate-200 bg-white px-3 py-2">
      <div className="flex items-end gap-2">
        <textarea
          className="max-h-32 min-h-[40px] flex-1 resize-none rounded-lg border border-slate-300 px-2 py-1 text-sm focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
          placeholder="Type a message… (Enter to send, Shift+Enter for newline)"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
        />
        <button
          type="button"
          onClick={onSend}
          disabled={!canSend}
          className="rounded-full bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
        >
          Send
        </button>
      </div>
    </div>
  );
}

/* ---------- Main Chat Component ---------- */

export default function ChatAppDemo() {
  const [messages, setMessages] = React.useState<Message[]>(() => [
    {
      id: "seed-1",
      sender: "teammate",
      text: "Hey! This is a sample chat. Ask me anything 😄",
      createdAt: Date.now() - 1000 * 60 * 2,
      status: "read",
    },
  ]);
  const [input, setInput] = React.useState("");
  const [isTyping, setIsTyping] = React.useState(false);
  const [online, setOnline] = React.useState(true);

  // Fake online/offline toggle every ~40s just to show the UI
  React.useEffect(() => {
    const id = window.setInterval(() => {
      setOnline((prev) => !prev);
    }, 40000);
    return () => window.clearInterval(id);
  }, []);

  // Send my message
  const sendMessage = () => {
    const text = input.trim();
    if (!text) return;

    const baseId = Date.now().toString();
    const createdAt = Date.now();

    const newMsg: Message = {
      id: baseId,
      sender: "me",
      text,
      createdAt,
      status: "sending",
    };

    setMessages((prev) => [...prev, newMsg]);
    setInput("");

    // Simulate status updates
    window.setTimeout(() => {
      setMessages((prev) =>
        prev.map((m) => (m.id === baseId ? { ...m, status: "sent" } : m))
      );
    }, 400);
    window.setTimeout(() => {
      setMessages((prev) =>
        prev.map((m) => (m.id === baseId ? { ...m, status: "delivered" } : m))
      );
    }, 1000);
    window.setTimeout(() => {
      setMessages((prev) =>
        prev.map((m) => (m.id === baseId ? { ...m, status: "read" } : m))
      );
    }, 2000);

    // Simulate teammate typing + reply
    simulateTeammateReply(text);
  };

  const simulateTeammateReply = (userText: string) => {
    setIsTyping(true);

    const replyText =
      userText.length < 10
        ? "Nice and concise! 👍"
        : "Got it! That sounds interesting.";

    const replyId = `reply-${Date.now()}`;
    const replyTime = Date.now() + 1500;

    window.setTimeout(() => {
      const msg: Message = {
        id: replyId,
        sender: "teammate",
        text: replyText,
        createdAt: replyTime,
        status: "sent",
      };
      setMessages((prev) => [...prev, msg]);
      setIsTyping(false);
    }, 1500);
  };

  return (
    <div className="mx-auto my-6 flex max-w-3xl flex-col rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-md">
      {/* Header */}
      <header className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-500 text-sm font-semibold text-white">
            T
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-900">Teammate</div>
            <div className="flex items-center gap-1 text-[0.75rem] text-slate-500">
              <span
                className={classNames(
                  "inline-block h-2 w-2 rounded-full",
                  online ? "bg-emerald-500" : "bg-slate-400"
                )}
              />
              <span>{online ? "Online" : "Last seen recently"}</span>
            </div>
          </div>
        </div>
        <div className="text-[0.7rem] text-slate-500">
          Demo chat · states: sending → sent → delivered → read
        </div>
      </header>

      {/* Chat window */}
      <div className="flex h-[420px] flex-col rounded-xl border border-slate-200 bg-slate-50">
        <MessageList messages={messages} />

        {/* Typing indicator */}
        {isTyping && (
          <div className="px-3 pb-1 text-[0.7rem] text-slate-500">
            <div className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 shadow-sm">
              <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:0.15s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:0.3s]" />
              <span className="ml-1">Teammate is typing…</span>
            </div>
          </div>
        )}

        <MessageInput
          value={input}
          onChange={setInput}
          onSend={sendMessage}
          disabled={false}
        />
      </div>
    </div>
  );
}
