import React from "react";

/* ---------- Types ---------- */

type ViewMode = "month" | "week" | "day";

type EventType = "meeting" | "personal" | "reminder";

type CalendarEvent = {
  id: string;
  title: string;
  date: string; // "YYYY-MM-DD"
  time?: string; // "HH:MM"
  type: EventType;
};

type EventsByDate = Record<string, CalendarEvent[]>;

type DayCell = {
  date: Date;
  iso: string;
  isCurrentMonth: boolean;
};

/* ---------- Helpers ---------- */

function classNames(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatMonthYear(date: Date): string {
  return new Intl.DateTimeFormat("en", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatWeekdayShort(index: number): string {
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][index];
}

function formatDateLabel(date: Date): string {
  return new Intl.DateTimeFormat("en", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
}

// Avoid timezone issues vs toISOString()
function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addMonths(date: Date, delta: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + delta);
  d.setDate(1);
  return d;
}

function addDays(date: Date, delta: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + delta);
  return d;
}

/** Build a 6x7 (42-cell) month grid including leading/trailing days */
function buildMonthGrid(monthDate: Date): DayCell[] {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const firstWeekday = firstOfMonth.getDay(); // 0 = Sun
  const startDate = new Date(year, month, 1 - firstWeekday);

  const cells: DayCell[] = [];
  for (let i = 0; i < 42; i++) {
    const date = addDays(startDate, i);
    const iso = toISODate(date);
    cells.push({
      date,
      iso,
      isCurrentMonth: date.getMonth() === month,
    });
  }
  return cells;
}

/* ---------- Sample Data ---------- */

const today = new Date();
const todayISO = toISODate(today);

const SAMPLE_EVENTS: EventsByDate = {
  [todayISO]: [
    {
      id: "e1",
      title: "Daily standup",
      date: todayISO,
      time: "09:30",
      type: "meeting",
    },
  ],
};

/* ---------- Main Component ---------- */

export default function CalendarViewDemo() {
  const [view, setView] = React.useState<ViewMode>("month");
  const [currentMonth, setCurrentMonth] = React.useState<Date>(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const [selectedDate, setSelectedDate] = React.useState<Date>(today);
  const [focusedISO, setFocusedISO] = React.useState<string>(todayISO);
  const [eventsByDate, setEventsByDate] =
    React.useState<EventsByDate>(SAMPLE_EVENTS);

  const [newEventTitle, setNewEventTitle] = React.useState("");
  const [newEventTime, setNewEventTime] = React.useState("");
  const [newEventType, setNewEventType] = React.useState<EventType>("meeting");

  const calendarRef = React.useRef<HTMLDivElement | null>(null);

  const monthGrid = React.useMemo(
    () => buildMonthGrid(currentMonth),
    [currentMonth]
  );

  const selectedISO = toISODate(selectedDate);
  const selectedEvents = eventsByDate[selectedISO] ?? [];

  const eventTypeClass: Record<EventType, string> = {
    meeting: "bg-blue-100 text-blue-700 border-blue-200",
    personal: "bg-emerald-100 text-emerald-700 border-emerald-200",
    reminder: "bg-amber-100 text-amber-700 border-amber-200",
  };

  /* ---------- Event handlers ---------- */

  const handlePrev = () => {
    setCurrentMonth((prev) => addMonths(prev, -1));
  };

  const handleNext = () => {
    setCurrentMonth((prev) => addMonths(prev, 1));
  };

  const handleToday = () => {
    const d = new Date();
    const first = new Date(d.getFullYear(), d.getMonth(), 1);
    setCurrentMonth(first);
    setSelectedDate(d);
    const iso = toISODate(d);
    setFocusedISO(iso);
  };

  const handleSelectDate = (date: Date) => {
    setSelectedDate(date);
    const iso = toISODate(date);
    setFocusedISO(iso);

    if (view !== "day") {
      // keep month pointing at selected date
      const first = new Date(date.getFullYear(), date.getMonth(), 1);
      setCurrentMonth(first);
    }
  };

  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    const title = newEventTitle.trim();
    if (!title) return;
    const iso = selectedISO;
    const newEvent: CalendarEvent = {
      id: `evt-${Date.now()}`,
      title,
      date: iso,
      time: newEventTime || undefined,
      type: newEventType,
    };
    setEventsByDate((prev) => ({
      ...prev,
      [iso]: [...(prev[iso] ?? []), newEvent],
    }));
    setNewEventTitle("");
    setNewEventTime("");
    setNewEventType("meeting");
  };

  /* ---------- Keyboard navigation ---------- */

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (view !== "month") return; // keep it simple for now

    const key = e.key;
    if (
      ![
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
        "Home",
        "End",
        "PageUp",
        "PageDown",
        "Enter",
        " ",
      ].includes(key)
    ) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    const cell = monthGrid.find((c) => c.iso === focusedISO);
    const baseDate = cell ? cell.date : selectedDate;
    let nextDate = baseDate;

    switch (key) {
      case "ArrowLeft":
        nextDate = addDays(baseDate, -1);
        break;
      case "ArrowRight":
        nextDate = addDays(baseDate, 1);
        break;
      case "ArrowUp":
        nextDate = addDays(baseDate, -7);
        break;
      case "ArrowDown":
        nextDate = addDays(baseDate, 7);
        break;
      case "Home": {
        const firstDayOfWeek = baseDate.getDate() - baseDate.getDay();
        nextDate = new Date(
          baseDate.getFullYear(),
          baseDate.getMonth(),
          firstDayOfWeek
        );
        break;
      }
      case "End": {
        const lastDayOfWeek = baseDate.getDate() + (6 - baseDate.getDay());
        nextDate = new Date(
          baseDate.getFullYear(),
          baseDate.getMonth(),
          lastDayOfWeek
        );
        break;
      }
      case "PageUp":
        nextDate = addMonths(baseDate, -1);
        break;
      case "PageDown":
        nextDate = addMonths(baseDate, 1);
        break;
      case "Enter":
      case " ":
        handleSelectDate(baseDate);
        return;
    }

    const iso = toISODate(nextDate);
    setFocusedISO(iso);

    // if we moved out of the visible month, adjust
    if (
      nextDate.getFullYear() !== currentMonth.getFullYear() ||
      nextDate.getMonth() !== currentMonth.getMonth()
    ) {
      const first = new Date(nextDate.getFullYear(), nextDate.getMonth(), 1);
      setCurrentMonth(first);
    }
  };

  /* ---------- Derived for Week / Day view ---------- */

  const selectedWeekStart = React.useMemo(() => {
    const d = new Date(selectedDate);
    const diff = d.getDay(); // Sunday as start
    return addDays(d, -diff);
  }, [selectedDate]);

  const weekDates: Date[] = React.useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(selectedWeekStart, i)),
    [selectedWeekStart]
  );

  const selectedDayLabel = formatDateLabel(selectedDate);

  /* ---------- Render helpers ---------- */

  const renderDayEvents = (iso: string) => {
    const dayEvents = eventsByDate[iso] ?? [];
    if (!dayEvents.length) return null;

    return (
      <div className="mt-1 space-y-0.5">
        {dayEvents.slice(0, 3).map((evt) => (
          <div
            key={evt.id}
            className={classNames(
              "truncate rounded border px-1 py-[1px] text-[0.65rem]",
              eventTypeClass[evt.type]
            )}
          >
            {evt.time && <span className="mr-1">{evt.time}</span>}
            <span>{evt.title}</span>
          </div>
        ))}
        {dayEvents.length > 3 && (
          <div className="text-[0.65rem] text-slate-500">
            +{dayEvents.length - 3} more
          </div>
        )}
      </div>
    );
  };

  /* ---------- JSX ---------- */

  return (
    <div className="mx-auto my-6 max-w-5xl rounded-xl border border-slate-200 bg-white px-4 py-5 shadow-md">
      {/* Header: title + view toggle + month nav */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Calendar</h1>
          <p className="text-[0.75rem] text-slate-500">
            Monthly grid with events, keyboard navigation, and basic week/day
            views.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          {/* View switcher */}
          <div className="inline-flex overflow-hidden rounded-full border border-slate-200 bg-slate-50">
            {(["month", "week", "day"] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setView(mode)}
                className={classNames(
                  "px-3 py-1 text-[0.7rem]",
                  view === mode
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                )}
              >
                {mode[0].toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>

          {/* Month navigation */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePrev}
              className="rounded-full border border-slate-300 px-2 py-1 text-[0.7rem] text-slate-700 hover:bg-slate-100"
            >
              ‹
            </button>
            <div className="min-w-[8rem] text-center text-[0.8rem] font-semibold text-slate-800">
              {formatMonthYear(currentMonth)}
            </div>
            <button
              type="button"
              onClick={handleNext}
              className="rounded-full border border-slate-300 px-2 py-1 text-[0.7rem] text-slate-700 hover:bg-slate-100"
            >
              ›
            </button>
            <button
              type="button"
              onClick={handleToday}
              className="ml-2 rounded-full border border-slate-300 px-3 py-1 text-[0.7rem] text-slate-700 hover:bg-slate-100"
            >
              Today
            </button>
          </div>
        </div>
      </div>

      {/* Main content: left = calendar, right = selected-day panel */}
      <div className="flex flex-col gap-4 md:flex-row">
        {/* Calendar area */}
        <div className="flex-1">
          {view === "month" && (
            <div
              ref={calendarRef}
              tabIndex={0}
              onKeyDown={handleKeyDown}
              role="grid"
              aria-label="Monthly calendar"
              className="rounded-lg border border-slate-200 bg-slate-50 p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {/* Weekday header */}
              <div className="mb-1 grid grid-cols-7 text-center text-[0.7rem] font-medium text-slate-500">
                {Array.from({ length: 7 }, (_, i) => (
                  <div key={i} className="py-1">
                    {formatWeekdayShort(i)}
                  </div>
                ))}
              </div>

              {/* Grid */}
              <div className="grid grid-cols-7 gap-[2px] text-xs">
                {monthGrid.map((cell) => {
                  const iso = cell.iso;
                  const isToday = iso === todayISO;
                  const isSelected = iso === selectedISO;
                  const isFocused = iso === focusedISO;

                  const dayNum = cell.date.getDate();
                  const weekday = cell.date.getDay();
                  const isWeekend = weekday === 0 || weekday === 6;

                  return (
                    <button
                      key={iso}
                      type="button"
                      role="gridcell"
                      aria-selected={isSelected}
                      onClick={() => handleSelectDate(cell.date)}
                      className={classNames(
                        "min-h-[72px] min-w-[72px] rounded-md border px-1 py-1 text-left align-top transition-colors",
                        cell.isCurrentMonth
                          ? "border-slate-200 bg-white"
                          : "border-slate-100 bg-slate-50 text-slate-400",
                        isWeekend && "bg-slate-50",
                        isToday && !isSelected && "ring-1 ring-indigo-400",
                        isSelected && "border-indigo-600 bg-indigo-50",
                        isFocused && "outline outline-1 outline-indigo-500"
                      )}
                    >
                      <div
                        className={classNames(
                          "flex items-center justify-between text-[0.7rem]",
                          isWeekend && "text-rose-500",
                          !cell.isCurrentMonth && "text-slate-400"
                        )}
                      >
                        <span className="font-medium">{dayNum}</span>
                        {isToday && (
                          <span className="text-[0.6rem] text-indigo-600">
                            Today
                          </span>
                        )}
                      </div>
                      {renderDayEvents(iso)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {view === "week" && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
              <div className="mb-2 text-[0.8rem] font-semibold text-slate-700">
                Week of {formatDateLabel(selectedWeekStart)}
              </div>
              <div className="grid grid-cols-7 gap-2 text-xs">
                {weekDates.map((date) => {
                  const iso = toISODate(date);
                  const isToday = iso === todayISO;
                  const isSelected = iso === selectedISO;
                  const weekday = date.getDay();
                  const isWeekend = weekday === 0 || weekday === 6;
                  return (
                    <button
                      key={iso}
                      type="button"
                      onClick={() => handleSelectDate(date)}
                      className={classNames(
                        "min-h-[80px] rounded-md border px-1 py-1 text-left transition-colors",
                        "border-slate-200 bg-white",
                        isWeekend && "bg-slate-50",
                        isSelected && "border-indigo-600 bg-indigo-50"
                      )}
                    >
                      <div className="flex items-center justify-between text-[0.7rem]">
                        <span
                          className={classNames(
                            "font-medium",
                            isWeekend && "text-rose-500"
                          )}
                        >
                          {formatWeekdayShort(weekday)} {date.getDate()}
                        </span>
                        {isToday && (
                          <span className="text-[0.6rem] text-indigo-600">
                            Today
                          </span>
                        )}
                      </div>
                      {renderDayEvents(iso)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {view === "day" && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              <div className="mb-1 text-[0.85rem] font-semibold">
                {selectedDayLabel}
              </div>
              {selectedEvents.length === 0 ? (
                <p className="text-[0.8rem] text-slate-500">
                  No events for this day.
                </p>
              ) : (
                <ul className="space-y-1">
                  {selectedEvents.map((evt) => (
                    <li
                      key={evt.id}
                      className={classNames(
                        "flex items-center justify-between rounded border px-2 py-1 text-[0.8rem]",
                        eventTypeClass[evt.type]
                      )}
                    >
                      <div>
                        <div className="font-medium">{evt.title}</div>
                        {evt.time && (
                          <div className="text-[0.7rem] opacity-80">
                            {evt.time}
                          </div>
                        )}
                      </div>
                      <span className="text-[0.7rem] capitalize">
                        {evt.type}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Right side: selected date + event form */}
        <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-700 md:w-80">
          <div className="mb-2 text-[0.85rem] font-semibold">
            {selectedDayLabel}
          </div>

          {/* Existing events */}
          <div className="mb-3">
            <h2 className="mb-1 text-[0.75rem] font-semibold text-slate-600">
              Events
            </h2>
            {selectedEvents.length === 0 ? (
              <p className="text-[0.75rem] text-slate-500">
                No events yet. Add one below.
              </p>
            ) : (
              <ul className="space-y-1">
                {selectedEvents.map((evt) => (
                  <li
                    key={evt.id}
                    className={classNames(
                      "flex items-center justify-between rounded border px-2 py-1",
                      eventTypeClass[evt.type]
                    )}
                  >
                    <div>
                      <div className="text-[0.8rem] font-medium">
                        {evt.title}
                      </div>
                      {evt.time && (
                        <div className="text-[0.7rem] opacity-80">
                          {evt.time}
                        </div>
                      )}
                    </div>
                    <span className="text-[0.7rem] capitalize">{evt.type}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Add event form */}
          <div>
            <h2 className="mb-1 text-[0.75rem] font-semibold text-slate-600">
              Add Event
            </h2>
            <form onSubmit={handleAddEvent} className="space-y-2">
              <div>
                <input
                  className="w-full rounded-md border border-slate-300 px-2 py-1 text-[0.8rem] focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                  placeholder="Event title"
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <input
                  type="time"
                  className="w-24 rounded-md border border-slate-300 px-2 py-1 text-[0.8rem] focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                  value={newEventTime}
                  onChange={(e) => setNewEventTime(e.target.value)}
                />
                <select
                  className="flex-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-[0.8rem] focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                  value={newEventType}
                  onChange={(e) => setNewEventType(e.target.value as EventType)}
                >
                  <option value="meeting">Meeting</option>
                  <option value="personal">Personal</option>
                  <option value="reminder">Reminder</option>
                </select>
              </div>
              <button
                type="submit"
                className="w-full rounded-full bg-indigo-600 px-3 py-1 text-[0.8rem] font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                disabled={!newEventTitle.trim()}
              >
                Add event
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
