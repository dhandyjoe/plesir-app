"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { ArrowForwardIcon, CalendarIcon, PlusIcon, TrashIcon } from "@/components/icons";
import { loginHref } from "@/lib/auth-form";
import { formatDateRange, localDateString, rangeInDays, tripPhase, type TripPhase } from "@/lib/calendar";
import { authFetch, useAuthUser } from "@/lib/firebase/auth";
import { MAX_SAVED, type ItinerarySummary } from "@/lib/itinerary";
import styles from "./saved.module.css";

const PATH = "/rundown-tersimpan";

type Load =
  | { kind: "loading" }
  | { kind: "guest" }
  | { kind: "error"; message: string }
  | { kind: "ready"; items: ItinerarySummary[] };

type Trip = { item: ItinerarySummary; phase: TripPhase };

const rundownHref = ({ id, dest, start, end }: ItinerarySummary) =>
  `/rundown?${new URLSearchParams({ dest, start, end, plan: id })}`;

const totalStops = (item: ItinerarySummary) => item.stopsPerDay.reduce((sum, n) => sum + n, 0);

/** "Kota Malang" → "M": inisial sampul bila rundown tidak punya foto. */
const initial = (city: string) => city.replace(/^(Kota|Kabupaten|Kab\.)\s+/i, "").charAt(0).toUpperCase();

/** Kalimat status perjalanan; dipakai di kartu dan baris pembuka. */
function phaseText({ item, phase }: Trip, today: string) {
  if (phase.kind === "upcoming") return phase.days === 1 ? "Berangkat besok" : `Berangkat ${phase.days} hari lagi`;
  if (phase.kind === "ongoing") return `Hari ke-${rangeInDays(item.start, today)} dari ${item.stopsPerDay.length}`;
  return "Sudah lewat";
}

/** Daftar rundown tersimpan; tamu melihat ajakan masuk, bukan daftar kosong. */
export function SavedList() {
  const user = useAuthUser();
  if (user === undefined) return <Skeleton />;
  if (user === null) return <GuestGate />;
  // Ganti akun tanpa muat ulang: mulai dari state baru agar daftar akun lama tidak sempat tampil.
  return <SavedItems key={user.uid} />;
}

function Title({ lead, action }: { lead: ReactNode; action?: ReactNode }) {
  return (
    <div className={styles.titleRow}>
      <div>
        <h1 className={styles.title}>Rundown Tersimpan</h1>
        <p className={styles.lead}>{lead}</p>
      </div>
      {action}
    </div>
  );
}

const newRundown = (
  <Link className={styles.primary} href="/">
    <span className={styles.plus}>
      <PlusIcon />
    </span>
    Buat rundown baru
  </Link>
);

function SavedItems() {
  const [load, setLoad] = useState<Load>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [target, setTarget] = useState<ItinerarySummary | null>(null);

  useEffect(() => {
    let cancelled = false;
    authFetch("/api/itineraries", { cache: "no-store" })
      .then(async (response): Promise<Load> => {
        // Sesi habis atau token ditolak: sama seperti tamu.
        if (response.status === 401) return { kind: "guest" };
        const body: unknown = await response.json().catch(() => null);
        if (response.ok && Array.isArray(body)) return { kind: "ready", items: body as ItinerarySummary[] };
        const error = (body as { error?: unknown } | null)?.error;
        return { kind: "error", message: typeof error === "string" ? error : "Daftar rundown belum bisa dimuat." };
      })
      .catch(
        (): Load => ({
          kind: "error",
          message: navigator.onLine
            ? "Daftar rundown belum bisa dimuat."
            : "Kamu sedang offline. Sambungkan internet lalu coba lagi.",
        }),
      )
      .then((next) => {
        if (!cancelled) setLoad(next);
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  if (load.kind === "loading") return <Skeleton />;
  if (load.kind === "guest") return <GuestGate />;
  if (load.kind === "error") {
    return (
      <>
        <Title lead="Rundown yang kamu simpan dari halaman rundown." action={newRundown} />
        <section className={styles.state} aria-live="polite">
          <div>
            <h2 className={styles.stateTitle}>Daftar belum bisa dimuat</h2>
            <p className={styles.stateText}>{load.message}</p>
          </div>
          <button
            className={styles.secondary}
            type="button"
            onClick={() => {
              setLoad({ kind: "loading" });
              setAttempt((n) => n + 1);
            }}
          >
            Coba lagi
          </button>
        </section>
      </>
    );
  }

  const remove = (id: string) =>
    setLoad((current) =>
      current.kind === "ready" ? { kind: "ready", items: current.items.filter((item) => item.id !== id) } : current,
    );

  return (
    <>
      <TripList items={load.items} onDelete={setTarget} />
      <DeleteDialog target={target} onClose={() => setTarget(null)} onDeleted={remove} />
    </>
  );
}

/** Isi daftar tanpa pengambilan data; `today` bisa diisi untuk pratinjau. */
export function TripList({
  items,
  onDelete,
  today = localDateString(),
}: {
  items: ItinerarySummary[];
  onDelete: (item: ItinerarySummary) => void;
  today?: string;
}) {
  const trips = items.map((item) => ({ item, phase: tripPhase(item.start, item.end, today) }));
  // Yang sedang berjalan punya tanggal mulai paling awal, jadi otomatis jadi "berikutnya".
  const [next, ...upcoming] = trips
    .filter((trip) => trip.phase.kind !== "past")
    .sort((a, b) => a.item.start.localeCompare(b.item.start));
  const past = trips
    .filter((trip) => trip.phase.kind === "past")
    .sort((a, b) => b.item.start.localeCompare(a.item.start));

  if (items.length === 0) {
    return (
      <>
        <Title lead="Belum ada rundown yang kamu simpan." />
        <Gate
          title="Simpan rundown favoritmu di sini"
          body="Susun rundown dari Main Menu, lalu tekan Simpan Rundown di halaman rundown. Rundown yang disimpan tidak kedaluwarsa dan tetap bisa kamu ubah lewat instruksi AI."
        >
          <Link className={styles.primary} href="/">
            Buat rundown
            <ArrowForwardIcon />
          </Link>
        </Gate>
      </>
    );
  }

  const lead = !next
    ? "Belum ada perjalanan yang akan datang"
    : next.phase.kind === "ongoing"
      ? `Kamu sedang di ${next.item.city}`
      : `${next.item.city}, ${phaseText(next, today).toLowerCase()}`;

  return (
    <>
      <Title
        lead={lead}
        action={
          <div className={styles.titleActions}>
            <Meter count={items.length} />
            {newRundown}
          </div>
        }
      />

      {next && (
        <section className={styles.section} aria-labelledby="next-title">
          <h2 id="next-title" className={styles.sectionTitle}>
            {next.phase.kind === "ongoing" ? "Sedang berjalan" : "Perjalanan berikutnya"}
          </h2>
          <Featured trip={next} today={today} onDelete={onDelete} />
        </section>
      )}

      {upcoming.length > 0 && (
        <TripGroup id="upcoming" title="Akan datang" trips={upcoming} today={today} onDelete={onDelete} />
      )}
      {past.length > 0 && <TripGroup id="past" title="Sudah lewat" trips={past} today={today} onDelete={onDelete} />}
    </>
  );
}

/** Kuota rundown tersimpan; teksnya sudah memuat angka, jadi bar hanya hiasan. */
function Meter({ count }: { count: number }) {
  return (
    <div className={styles.meter}>
      <span className={styles.meterText}>
        {count} dari {MAX_SAVED} rundown tersimpan
      </span>
      <div className={styles.meterTrack} aria-hidden="true">
        <div className={styles.meterFill} style={{ width: `${(count / MAX_SAVED) * 100}%` }} />
      </div>
    </div>
  );
}

function TripGroup({
  id,
  title,
  trips,
  today,
  onDelete,
}: {
  id: string;
  title: string;
  trips: Trip[];
  today: string;
  onDelete: (item: ItinerarySummary) => void;
}) {
  return (
    <section className={styles.section} aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`} className={styles.sectionTitle}>
        {title} <span className={styles.sectionCount}>{trips.length}</span>
      </h2>
      <ul className={styles.grid}>
        {trips.map((trip) => (
          <li key={trip.item.id}>
            <Ticket trip={trip} today={today} onDelete={onDelete} />
          </li>
        ))}
      </ul>
    </section>
  );
}

type CardProps = { trip: Trip; today: string; onDelete: (item: ItinerarySummary) => void };

/** Perjalanan terdekat (atau yang sedang berjalan): foto besar dan hitung mundur sebagai angka utama layar. */
function Featured({ trip, today, onDelete }: CardProps) {
  const { item, phase } = trip;
  return (
    <article className={styles.featured} aria-labelledby={`trip-${item.id}`}>
      <Cover item={item} sizes="(min-width: 64rem) 640px, 100vw" large />
      <div className={styles.featuredBody}>
        <h3 id={`trip-${item.id}`} className={styles.featuredCity}>
          {item.city}
        </h3>
        <ul className={styles.chips}>
          <li className={styles.chip}>
            <CalendarIcon />
            {formatDateRange(item.start, item.end)}
          </li>
          <li className={styles.chip}>{item.stopsPerDay.length} hari</li>
          <li className={styles.chip}>{totalStops(item)} tempat</li>
        </ul>
        <p className={styles.countdown}>
          {phase.kind === "upcoming" ? (
            <>
              <span className={styles.countdownValue}>{phase.days}</span> hari lagi
            </>
          ) : (
            phaseText(trip, today)
          )}
        </p>
        <DayStrip stopsPerDay={item.stopsPerDay} strong />
        <Actions item={item} onDelete={onDelete} primary />
      </div>
    </article>
  );
}

function Ticket({ trip, today, onDelete }: CardProps) {
  const { item, phase } = trip;
  return (
    <article className={`${styles.ticket} ${phase.kind === "past" ? styles.ticketPast : ""}`} aria-labelledby={`trip-${item.id}`}>
      <div className={styles.ticketMain}>
        <Cover item={item} sizes="132px" />
        <div className={styles.ticketBody}>
          <h3 id={`trip-${item.id}`} className={styles.ticketCity}>
            {item.city}
          </h3>
          <p className={styles.meta}>{formatDateRange(item.start, item.end)}</p>
          <p className={phase.kind === "upcoming" ? styles.status : styles.statusMuted}>{phaseText(trip, today)}</p>
          <DayStrip stopsPerDay={item.stopsPerDay} />
        </div>
      </div>
      <div className={styles.ticketFoot}>
        <Credit item={item} />
        <Actions item={item} onDelete={onDelete} compact />
      </div>
    </article>
  );
}

function Cover({ item, sizes, large }: { item: ItinerarySummary; sizes: string; large?: boolean }) {
  return (
    <div className={large ? styles.coverLarge : styles.cover}>
      {item.cover ? (
        <Image src={item.cover.src} alt="" fill sizes={sizes} />
      ) : (
        <span className={styles.coverInitial} aria-hidden="true">
          {initial(item.city)}
        </span>
      )}
      {large && <Credit item={item} overlay />}
    </div>
  );
}

/** Atribusi wajib untuk foto CC dari Wikimedia Commons. */
function Credit({ item, overlay }: { item: ItinerarySummary; overlay?: boolean }) {
  if (!item.cover) return null;
  const { author, license, source } = item.cover.credit;
  return (
    <p className={overlay ? styles.creditOverlay : styles.credit}>
      Foto: {author} · {license} ·{" "}
      <a href={source} target="_blank" rel="noopener noreferrer">
        Wikimedia Commons
      </a>
    </p>
  );
}

/** Elemen khas: kepadatan rencana per hari, satu titik per tempat. */
function DayStrip({ stopsPerDay, strong }: { stopsPerDay: number[]; strong?: boolean }) {
  return (
    <ol className={`${styles.strip} ${strong ? styles.stripStrong : ""}`} aria-label="Jumlah tempat per hari">
      {stopsPerDay.map((stops, index) => (
        <li key={index} className={styles.stripDay}>
          <span className={styles.stripLabel} aria-hidden="true">
            H{index + 1}
          </span>
          <span className={styles.dots} aria-hidden="true">
            {Array.from({ length: stops }, (_, dot) => (
              <i key={dot} style={{ "--n": dot } as CSSProperties} />
            ))}
          </span>
          <span className={styles.srOnly}>
            Hari {index + 1}: {stops} tempat
          </span>
        </li>
      ))}
    </ol>
  );
}

function Actions({
  item,
  onDelete,
  primary,
  compact,
}: {
  item: ItinerarySummary;
  onDelete: (item: ItinerarySummary) => void;
  primary?: boolean;
  compact?: boolean;
}) {
  const remove = (
    <button className={styles.delete} type="button" onClick={() => onDelete(item)}>
      {!compact && <TrashIcon />}
      Hapus<span className={styles.srOnly}> rundown {item.city}</span>
    </button>
  );
  const open = (
    <Link className={primary ? styles.primary : styles.open} href={rundownHref(item)}>
      Buka &amp; edit
      <ArrowForwardIcon />
    </Link>
  );
  return (
    <div className={compact ? styles.actionsCompact : styles.actions}>
      {compact ? remove : open}
      {compact ? open : remove}
    </div>
  );
}

function DeleteDialog({
  target,
  onClose,
  onDeleted,
}: {
  target: ItinerarySummary | null;
  onClose: () => void;
  onDeleted: (id: string) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (target && !dialog.open) dialog.showModal();
    else if (!target && dialog.open) dialog.close();
  }, [target]);

  async function confirm() {
    if (!target) return;
    setBusy(true);
    setError("");
    try {
      const response = await authFetch(`/api/itineraries/${target.id}`, { method: "DELETE" });
      // 404: sudah terhapus (mis. dari tab lain), hasil akhirnya sama.
      if (response.ok || response.status === 404) {
        onDeleted(target.id);
        ref.current?.close();
      } else {
        setError(
          response.status === 401
            ? "Sesi masuk sudah habis. Muat ulang halaman lalu masuk lagi."
            : "Rundown belum bisa dihapus. Coba lagi beberapa saat lagi.",
        );
      }
    } catch {
      setError("Koneksi terputus. Periksa jaringanmu lalu coba lagi.");
    }
    setBusy(false);
  }

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby="delete-title"
      aria-describedby="delete-body"
      onClose={() => {
        setError("");
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) ref.current?.close();
      }}
    >
      {target && (
        <>
          <h2 id="delete-title">Hapus rundown {target.city}?</h2>
          <p id="delete-body">
            Rundown {formatDateRange(target.start, target.end)} beserta semua perubahannya dihapus permanen dan tidak
            bisa dibatalkan.
          </p>
          {error && (
            <p className={styles.dialogError} role="alert">
              {error}
            </p>
          )}
          <div className={styles.dialogActions}>
            <button className={styles.danger} type="button" onClick={confirm} disabled={busy}>
              {busy ? "Menghapus…" : "Hapus permanen"}
            </button>
            <button className={styles.secondary} type="button" onClick={() => ref.current?.close()} disabled={busy} autoFocus>
              Batal
            </button>
          </div>
        </>
      )}
    </dialog>
  );
}

/** Panel ajakan: tamu (dengan gembok) dan daftar kosong. */
function Gate({ title, body, locked, children }: { title: string; body: string; locked?: boolean; children: ReactNode }) {
  return (
    <section className={styles.gate} aria-labelledby="gate-title">
      <div className={styles.gateArt} aria-hidden="true">
        <svg viewBox="0 0 320 200" focusable="false">
          <path className={styles.artRoute} d="M24 160 C 70 160, 64 92, 112 92 S 168 150, 206 128 S 238 52, 288 46" />
          <circle className={styles.artStop} cx="24" cy="160" r="10" />
          <circle className={styles.artStop} cx="112" cy="92" r="10" />
          <circle className={styles.artStop} cx="206" cy="128" r="10" />
          {locked ? (
            <g>
              <circle className={styles.artBadge} cx="270" cy="62" r="34" />
              <rect className={styles.artLock} x="254" y="60" width="32" height="25" rx="6" />
              <path className={styles.artShackle} d="M261 60 v-8 a9 9 0 0 1 18 0 v8" />
              <circle className={styles.artBadge} cx="270" cy="72" r="3.5" />
            </g>
          ) : (
            <circle className={styles.artStopSoft} cx="288" cy="46" r="12" />
          )}
        </svg>
      </div>
      <div className={styles.gateBody}>
        <h2 id="gate-title" className={styles.gateTitle}>
          {title}
        </h2>
        <p className={styles.gateText}>{body}</p>
        <div className={styles.gateActions}>{children}</div>
      </div>
    </section>
  );
}

function GuestGate() {
  return (
    <>
      <Title lead="Rundown yang kamu simpan, siap dibuka dari perangkat mana pun." />
      <Gate
        locked
        title="Masuk untuk membuka rundown tersimpanmu"
        body="Rundown Tersimpan terikat ke akunmu. Setelah masuk, kamu bisa membuka lagi, mengubah lewat instruksi AI, dan menghapus rundown yang sudah kamu simpan."
      >
        <Link className={styles.primary} href={loginHref(PATH)}>
          Masuk / Daftar
          <ArrowForwardIcon />
        </Link>
        <Link className={styles.secondary} href="/">
          Buat rundown tanpa akun
        </Link>
      </Gate>
    </>
  );
}

/** Tata letak final dengan bar abu-abu, supaya halaman tidak bergeser saat data tiba. */
function Skeleton() {
  return (
    <div aria-busy="true" aria-label="Memuat rundown tersimpan">
      <div className={styles.titleRow}>
        <div>
          <h1 className={styles.title}>Rundown Tersimpan</h1>
          <p className={styles.lead}>
            <span className={styles.bar} style={{ width: "16rem" }} />
          </p>
        </div>
      </div>
      <div className={styles.section}>
        <span className={`${styles.bar} ${styles.barHeading}`} />
        <div className={styles.featured}>
          <div className={`${styles.coverLarge} ${styles.coverLoading}`} />
          <div className={styles.featuredBody}>
            <span className={`${styles.bar} ${styles.barCity}`} />
            <span className={styles.bar} style={{ width: "60%" }} />
            <span className={`${styles.bar} ${styles.barCountdown}`} />
          </div>
        </div>
      </div>
    </div>
  );
}
