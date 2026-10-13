"use client";

import { useState } from "react";
import { monthWeeks, shiftMonth } from "@/lib/dates";

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];
const monthName = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
const dayName = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
const formatDay = (day: string) => dayName.format(new Date(`${day}T00:00:00Z`));

// Pick arrival then departure on a month grid. Nights already taken by a confirmed guest are
// crossed out and can't be picked, though a stay may end on the day the next guest arrives.
// `booked` holds dates only, never who is staying.
export function StayPicker({
  booked,
  today,
  defaultArrival,
  defaultDeparture,
  invalid,
}: {
  booked: string[];
  today: string;
  defaultArrival?: string;
  defaultDeparture?: string;
  invalid?: boolean;
}) {
  const [arrival, setArrival] = useState(defaultArrival ?? "");
  const [departure, setDeparture] = useState(defaultDeparture ?? "");
  const [month, setMonth] = useState((defaultArrival || today).slice(0, 7));

  const taken = new Set(booked);
  const pickingDeparture = arrival !== "" && departure === "";
  // The first booked night on or after arrival; the stay has to end by that day
  const nextBooked = pickingDeparture ? booked.find((night) => night >= arrival) : undefined;
  const canDepart = (day: string) => pickingDeparture && day >= arrival && (!nextBooked || day <= nextBooked);
  const canArrive = (day: string) => day >= today && !taken.has(day);

  function pick(day: string) {
    if (canDepart(day)) {
      setDeparture(day);
    } else {
      setArrival(day);
      setDeparture("");
    }
  }

  const weeks = monthWeeks(month);
  const atFirstMonth = month <= today.slice(0, 7);

  return (
    <div>
      <input type="hidden" name="arrivalDate" value={arrival} />
      <input type="hidden" name="departureDate" value={departure} />

      <div className={`rounded-[2px] border bg-paper/70 p-2 ${invalid ? "border-danger" : "border-rule"}`}>
        <div className="mb-1 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setMonth(shiftMonth(month, -1))}
            disabled={atFirstMonth}
            aria-label="Previous month"
            className="rounded-[2px] px-2 py-0.5 hover:bg-rule/40 disabled:opacity-30 disabled:hover:bg-transparent"
          >
            ←
          </button>
          <span className="hand" aria-live="polite">
            {monthName.format(new Date(`${month}-01T00:00:00Z`))}
          </span>
          <button
            type="button"
            onClick={() => setMonth(shiftMonth(month, 1))}
            aria-label="Next month"
            className="rounded-[2px] px-2 py-0.5 hover:bg-rule/40"
          >
            →
          </button>
        </div>

        <div className="grid grid-cols-7 text-center text-xs text-ink-soft">
          {WEEKDAYS.map((day, i) => (
            <div key={i} className="py-1">
              {day}
            </div>
          ))}
        </div>
        {weeks.map((week) => (
          <div key={week[0]} className="grid grid-cols-7">
            {week.map((day) => {
              if (day.slice(0, 7) !== month) return <div key={day} />;
              const isBooked = taken.has(day);
              const enabled = canArrive(day) || canDepart(day);
              const isEnd = day === arrival || day === departure;
              const inRange = arrival && departure && day > arrival && day < departure;
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => pick(day)}
                  disabled={!enabled}
                  aria-pressed={isEnd || !!inRange}
                  aria-label={`${formatDay(day)}${isBooked ? ", already booked" : ""}`}
                  className={`my-0.5 py-1.5 text-sm ${
                    isEnd
                      ? "rounded-[2px] bg-tile font-medium text-white"
                      : inRange
                        ? "bg-tile/15"
                        : enabled
                          ? "rounded-[2px] hover:bg-rule/40"
                          : "text-ink-soft/40"
                  } ${isBooked && !isEnd && day >= today ? "line-through" : ""}`}
                >
                  {Number(day.slice(8))}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <p className="mt-2 text-sm text-ink-soft">
        {!arrival
          ? "Tap the day you'd arrive. Crossed-out days are already booked."
          : !departure
            ? `Arriving ${formatDay(arrival)}. Now tap the day you'd leave.`
            : `${formatDay(arrival)} to ${formatDay(departure)}`}
      </p>
    </div>
  );
}
