"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import {
  addDays,
  addMonths,
  addMonthsKeepDay,
  formatDate,
  formatDateRange,
  formatDayLabel,
  formatMonth,
  localDateString,
  monthCells,
  monthStart,
  parseDateKey,
  rangeInDays,
} from "@/lib/calendar";
import { ChevronLeftIcon, ChevronRightIcon, CloseIcon } from "./icons";
import styles from "./date-range-picker.module.css";

const WEEKDAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

type Props = {
  start: string;
  end: string;
  onApply: (start: string, end: string) => void;
  onClose: () => void;
};

// Dipasang hanya saat dibuka (`{open && <DateRangePicker />}`), jadi state awal
// selalu dihitung ulang dari nilai terpilih dan "hari ini" saat itu.
export function DateRangePicker({ start, end, onApply, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [today] = useState(() => localDateString());
  const currentMonth = monthStart(today);
  const [draftStart, setDraftStart] = useState(start);
  const [draftEnd, setDraftEnd] = useState(end);
  const [hover, setHover] = useState("");
  const [focusDay, setFocusDay] = useState(start >= today ? start : today);
  const [leftMonth, setLeftMonth] = useState(monthStart(start >= today ? start : today));
  const rightMonth = addMonths(leftMonth, 1);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  // Fokus mengikuti hari aktif (roving tabindex); juga memberi fokus awal setelah dialog terbuka.
  useEffect(() => {
    dialogRef.current?.querySelector<HTMLButtonElement>(`[data-day="${focusDay}"]`)?.focus();
  }, [focusDay]);

  const focusMonth = monthStart(focusDay);
  const tabDay =
    focusMonth === leftMonth || focusMonth === rightMonth
      ? focusDay
      : leftMonth === currentMonth
        ? today
        : leftMonth;

  // Saat tanggal selesai belum dipilih, hari yang di-hover menjadi pratinjau pita.
  const bandEnd = draftEnd || (draftStart && hover > draftStart ? hover : "");
  const nights = draftStart && draftEnd ? rangeInDays(draftStart, draftEnd) - 1 : 0;
  const summary =
    draftStart && draftEnd
      ? formatDateRange(draftStart, draftEnd)
      : draftStart
        ? `${formatDate(draftStart)} – pilih tanggal selesai`
        : "Pilih tanggal mulai dan selesai";

  function shiftMonth(offset: number) {
    const next = addMonths(leftMonth, offset);
    if (next >= currentMonth) setLeftMonth(next);
  }

  function selectDay(day: string) {
    setFocusDay(day);
    if (!draftStart || draftEnd || day < draftStart) {
      setDraftStart(day);
      setDraftEnd("");
    } else {
      setDraftEnd(day);
    }
  }

  function moveFocus(target: string) {
    const next = target < today ? today : target;
    const month = monthStart(next);
    setFocusDay(next);
    if (month < leftMonth) setLeftMonth(month);
    else if (month > rightMonth) setLeftMonth(addMonths(month, -1));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!(event.target as HTMLElement).dataset.day) return;
    const column = (parseDateKey(focusDay).getDay() + 6) % 7;
    const targets: Record<string, string> = {
      ArrowLeft: addDays(focusDay, -1),
      ArrowRight: addDays(focusDay, 1),
      ArrowUp: addDays(focusDay, -7),
      ArrowDown: addDays(focusDay, 7),
      Home: addDays(focusDay, -column),
      End: addDays(focusDay, 6 - column),
      PageUp: addMonthsKeepDay(focusDay, -1),
      PageDown: addMonthsKeepDay(focusDay, 1),
    };
    const target = targets[event.key];
    if (!target) return;
    event.preventDefault();
    moveFocus(target);
  }

  function apply() {
    if (!draftStart || !draftEnd) return;
    onApply(draftStart, draftEnd);
    dialogRef.current?.close();
  }

  function renderMonth(monthKey: string) {
    const { leading, days } = monthCells(monthKey);

    return (
      <div className={styles.month} role="group" aria-label={formatMonth(monthKey)}>
        <p className={styles.monthTitle}>{formatMonth(monthKey)}</p>
        <div className={styles.grid}>
          {WEEKDAYS.map((weekday) => (
            <span key={weekday} className={styles.weekday} aria-hidden="true">
              {weekday}
            </span>
          ))}
          {Array.from({ length: leading }, (_, index) => (
            <span key={`blank-${index}`} aria-hidden="true" />
          ))}
          {days.map((day, index) => {
            const isStart = day === draftStart;
            const isEnd = day === (draftEnd || (bandEnd ? bandEnd : ""));
            const band =
              draftStart && bandEnd && draftStart !== bandEnd
                ? isStart
                  ? "start"
                  : isEnd
                    ? "end"
                    : day > draftStart && day < bandEnd
                      ? "mid"
                      : undefined
                : undefined;

            return (
              <span
                key={day}
                className={styles.cell}
                data-band={band}
                data-preview={!draftEnd}
                data-column={(leading + index) % 7}
              >
                <button
                  className={styles.day}
                  type="button"
                  data-day={day}
                  tabIndex={day === tabDay ? 0 : -1}
                  disabled={day < today}
                  aria-label={formatDayLabel(day)}
                  aria-pressed={isStart || day === draftEnd}
                  aria-current={day === today ? "date" : undefined}
                  data-selected={isStart || day === draftEnd}
                  data-today={day === today}
                  onClick={() => selectDay(day)}
                  onMouseEnter={() => setHover(day)}
                  onFocus={() => setHover(day)}
                >
                  {index + 1}
                </button>
              </span>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <dialog
      className={styles.dialog}
      ref={dialogRef}
      aria-labelledby="calendar-title"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) dialogRef.current?.close();
      }}
    >
      <div className={styles.header}>
        <div>
          <h2 id="calendar-title">Tanggal perjalanan</h2>
          <p className={styles.summary} aria-live="polite">
            {summary}
          </p>
        </div>
        <button
          className={styles.iconButton}
          type="button"
          onClick={() => dialogRef.current?.close()}
          aria-label="Tutup"
        >
          <CloseIcon />
        </button>
      </div>

      <div className={styles.body}>
        <div className={styles.months} onKeyDown={handleKeyDown} onMouseLeave={() => setHover("")}>
          <div className={styles.nav}>
            <button
              className={styles.iconButton}
              type="button"
              onClick={() => shiftMonth(-1)}
              disabled={leftMonth <= currentMonth}
              aria-label="Bulan sebelumnya"
            >
              <ChevronLeftIcon />
            </button>
            <button
              className={styles.iconButton}
              type="button"
              onClick={() => shiftMonth(1)}
              aria-label="Bulan berikutnya"
            >
              <ChevronRightIcon />
            </button>
          </div>
          {renderMonth(leftMonth)}
          {renderMonth(rightMonth)}
        </div>
      </div>

      <div className={styles.footer}>
        <p className={styles.duration}>
          {nights > 0 || (draftStart && draftEnd)
            ? `${nights + 1} hari · ${nights} malam`
            : "Tanggal sebelum hari ini tidak bisa dipilih"}
        </p>
        <div className={styles.actions}>
          <button
            className={styles.reset}
            type="button"
            onClick={() => {
              setDraftStart("");
              setDraftEnd("");
            }}
          >
            Atur ulang
          </button>
          <button
            className={styles.apply}
            type="button"
            onClick={apply}
            disabled={!draftStart || !draftEnd}
          >
            Terapkan
          </button>
        </div>
      </div>
    </dialog>
  );
}
