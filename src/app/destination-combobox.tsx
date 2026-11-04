"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type RefObject,
  type UIEvent,
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
  | { state: "done"; items: DestinationOption[]; hasMore: boolean; loadingMore: boolean };

const DEBOUNCE_MS = 250;
const LOAD_MORE_THRESHOLD_PX = 48;

async function fetchPage(query: string, offset: number, signal: AbortSignal) {
  const response = await fetch(
    `/api/destinations?${new URLSearchParams({ q: query, offset: String(offset) })}`,
    { signal },
  );
  if (!response.ok) throw new Error(String(response.status));
  return (await response.json()) as { destinations: DestinationOption[]; hasMore: boolean };
}

const isAbort = (error: unknown) => error instanceof DOMException && error.name === "AbortError";

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
  const menuRef = useRef<HTMLUListElement>(null);
  const query = useRef("");
  const loadingMore = useRef(false);

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
    // Huruf kecil agar "Papua" dan "papua" memakai satu entri cache browser.
    query.current = text.trim().toLowerCase();
    timer.current = setTimeout(async () => {
      const abort = new AbortController();
      controller.current = abort;
      loadingMore.current = false;
      try {
        const page = await fetchPage(query.current, 0, abort.signal);
        setLookup({ state: "done", items: page.destinations, hasMore: page.hasMore, loadingMore: false });
      } catch (error) {
        if (isAbort(error)) return;
        setLookup({ state: "error" });
      }
    }, DEBOUNCE_MS);
  }

  /** Muat halaman berikutnya (10 data); gagal berarti gulir lagi untuk mencoba ulang. */
  async function loadMore() {
    if (lookup.state !== "done" || !lookup.hasMore || loadingMore.current) return;
    const current = lookup;
    const abort = new AbortController();
    controller.current = abort;
    loadingMore.current = true;
    setLookup({ ...current, loadingMore: true });
    try {
      const page = await fetchPage(query.current, current.items.length, abort.signal);
      setLookup({
        state: "done",
        items: [...current.items, ...page.destinations],
        hasMore: page.hasMore,
        loadingMore: false,
      });
    } catch (error) {
      if (isAbort(error)) return; // pencarian baru mengambil alih state
      setLookup({ ...current, loadingMore: false });
    } finally {
      loadingMore.current = false;
    }
  }

  function handleScroll(event: UIEvent<HTMLUListElement>) {
    const menu = event.currentTarget;
    if (menu.scrollHeight - menu.scrollTop - menu.clientHeight < LOAD_MORE_THRESHOLD_PX) void loadMore();
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
  const hasMore = lookup.state === "done" && lookup.hasMore;

  // .main memotong isinya (overflow: hidden); tanpa batas ini bagian bawah menu keluar area dan tak bisa digulir.
  useLayoutEffect(() => {
    const menu = menuRef.current;
    if (!showList || !menu) return;
    const fit = () => {
      const bottom = Math.min(inputRef.current?.closest("main")?.getBoundingClientRect().bottom ?? Infinity, window.innerHeight);
      const room = Math.max(bottom - menu.getBoundingClientRect().top - 8, 88);
      menu.style.maxHeight = `min(18rem, 45dvh, ${room}px)`;
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [showList, inputRef]);

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape" && open) {
      event.preventDefault();
      setOpen(false);
      return;
    }

    if (!showList) return;

    if (event.key === "ArrowDown" && active === items.length - 1 && hasMore) {
      event.preventDefault();
      void loadMore();
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      const next = (active + step + items.length) % items.length;
      setActive(next);
      document.getElementById(`${listId}-${next}`)?.scrollIntoView({ block: "nearest" });
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
        placeholder="Ketik kota, kabupaten, atau kawasan tujuanmu..."
        autoComplete="off"
        enterKeyHint="next"
        spellCheck={false}
        aria-invalid={invalid}
        aria-describedby={describedBy}
      />

      {/* onMouseDown mencegah input kehilangan fokus sebelum klik terdaftar. */}
      <ul
        ref={menuRef}
        id={listId}
        className={styles.menu}
        role="listbox"
        aria-label="Saran kota tujuan"
        hidden={!showList}
        onMouseDown={(event) => event.preventDefault()}
        onScroll={handleScroll}
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
        {lookup.state === "done" && lookup.loadingMore && (
          <li className={styles.menuMessage} role="presentation">
            Memuat lagi…
          </li>
        )}
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
        {showList ? `${items.length} saran kota tersedia${hasMore ? ", gulir untuk memuat lebih banyak" : ""}.` : ""}
      </span>
    </div>
  );
}
