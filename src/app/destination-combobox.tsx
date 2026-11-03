"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type RefObject,
} from "react";
import styles from "./page.module.css";

export type DestinationOption = {
  id: string;
  name: string;
  province: string;
};

type Props = {
  inputRef: RefObject<HTMLInputElement | null>;
  value: string;
  onChange: (text: string) => void;
  onSelect: (destination: DestinationOption) => void;
  isOnline: boolean;
  invalid: boolean;
  describedBy?: string;
};

type Lookup =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "error" }
  | { state: "done"; items: DestinationOption[] };

const DEBOUNCE_MS = 250;

export function DestinationCombobox({
  inputRef,
  value,
  onChange,
  onSelect,
  isOnline,
  invalid,
  describedBy,
}: Props) {
  const listId = useId();
  const [lookup, setLookup] = useState<Lookup>({ state: "idle" });
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const controller = useRef<AbortController>(undefined);

  useEffect(
    () => () => {
      clearTimeout(timer.current);
      controller.current?.abort();
    },
    [],
  );

  function search(text: string) {
    clearTimeout(timer.current);
    controller.current?.abort();
    setActive(-1);

    if (text.trim().length < 2) {
      setLookup({ state: "idle" });
      return;
    }

    setLookup({ state: "loading" });
    timer.current = setTimeout(async () => {
      const abort = new AbortController();
      controller.current = abort;
      try {
        const response = await fetch(
          `/api/destinations?${new URLSearchParams({ q: text.trim() })}`,
          { signal: abort.signal },
        );
        if (!response.ok) throw new Error(String(response.status));
        const { destinations } = (await response.json()) as {
          destinations: DestinationOption[];
        };
        setLookup({ state: "done", items: destinations });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setLookup({ state: "error" });
      }
    }, DEBOUNCE_MS);
  }

  function choose(destination: DestinationOption) {
    clearTimeout(timer.current);
    controller.current?.abort();
    setLookup({ state: "idle" });
    setOpen(false);
    setActive(-1);
    onSelect(destination);
  }

  const items = lookup.state === "done" ? lookup.items : [];
  const showMenu = open && lookup.state !== "idle";
  const showList = showMenu && items.length > 0;

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape" && open) {
      event.preventDefault();
      setOpen(false);
      return;
    }

    if (!showList) return;

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((current) => (current + step + items.length) % items.length);
    } else if (event.key === "Enter" && active >= 0) {
      event.preventDefault();
      choose(items[active]);
    }
  }

  let message = "";
  if (lookup.state === "loading") message = "Mencari kota…";
  else if (lookup.state === "error") message = "Saran kota gagal dimuat.";
  else if (lookup.state === "done" && items.length === 0) {
    message = "Kota tidak ditemukan. Coba ejaan lain.";
  } else if (!isOnline && value.trim().length >= 2) {
    message = "Kamu sedang offline. Saran kota tidak tersedia.";
  }

  return (
    <div className={styles.inputShell}>
      <input
        ref={inputRef}
        className={styles.input}
        id="city"
        name="city"
        type="text"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={
          showList && active >= 0 ? `${listId}-${active}` : undefined
        }
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
          if (isOnline) search(event.target.value);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={handleKeyDown}
        placeholder="Ketik kota atau kabupaten tujuanmu..."
        autoComplete="off"
        enterKeyHint="next"
        spellCheck={false}
        aria-invalid={invalid}
        aria-describedby={describedBy}
      />

      {/* onMouseDown mencegah input kehilangan fokus sebelum klik terdaftar. */}
      <ul
        id={listId}
        className={styles.menu}
        role="listbox"
        aria-label="Saran kota tujuan"
        hidden={!showList}
        onMouseDown={(event) => event.preventDefault()}
      >
        {items.map((item, index) => (
          <li
            key={item.id}
            id={`${listId}-${index}`}
            className={styles.option}
            role="option"
            aria-selected={index === active}
            data-active={index === active}
            onClick={() => choose(item)}
            onMouseMove={() => setActive(index)}
          >
            <span className={styles.optionName}>{item.name}</span>
            <span className={styles.optionMeta}>{item.province}</span>
          </li>
        ))}
      </ul>

      {open && message && !showList && (
        <div className={styles.menu} role="status">
          <p className={styles.menuMessage}>{message}</p>
          {lookup.state === "error" && (
            <button
              className={styles.menuRetry}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => search(value)}
            >
              Coba lagi
            </button>
          )}
        </div>
      )}

      <span className={styles.srOnly} role="status">
        {showList ? `${items.length} saran kota tersedia.` : ""}
      </span>
    </div>
  );
}
