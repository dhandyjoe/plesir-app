"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { Brand } from "@/components/brand";
import {
  AccountIcon,
  ArrowForwardIcon,
  BookmarkIcon,
  BrainIcon,
  CarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CloseIcon,
  DirectionsIcon,
  FlagIcon,
  GridIcon,
  HotelIcon,
  LocationIcon,
  MapIcon,
  PanIcon,
  SaveIcon,
  ScheduleIcon,
  SendIcon,
  SparkleIcon,
} from "@/components/icons";
import { SiteFooter } from "@/components/site-footer";
import {
  MOCK_RUNDOWN,
  mapsRouteUrl,
  mapsStopUrl,
  type RundownStop,
} from "./mock-rundown";
import { buildRoad, CARD_H, ICON, MARKER_W } from "./road-layout";
import styles from "./rundown.module.css";

function dayCount(start: string, end: string) {
  const [sy, sm, sd] = start.split("-").map(Number);
  const [ey, em, ed] = end.split("-").map(Number);
  return Math.round((Date.UTC(ey, em - 1, ed) - Date.UTC(sy, sm - 1, sd)) / 86_400_000) + 1;
}

const NARROW = "(max-width: 47.999rem)";
const subscribeNarrow = (cb: () => void) => {
  const mq = window.matchMedia(NARROW);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};

type Props = { city: string; start: string; end: string; seed: number };

export function RundownView({ city, start, end, seed }: Props) {
  const totalDays = dayCount(start, end);
  const nights = totalDays - 1;

  const [day, setDay] = useState(0);
  // Tab hari yang muat: 5 di desktop, 3 di phone; selebihnya digeser lewat tombol ‹ ›.
  const narrow = useSyncExternalStore(
    subscribeNarrow,
    () => window.matchMedia(NARROW).matches,
    () => false,
  );
  const size = narrow ? 3 : 5;
  const paged = totalDays > size;
  // Jendela tab digeser terpisah dari hari aktif oleh tombol ‹ ›.
  const [offset, setOffset] = useState(0);
  const maxFirst = Math.max(totalDays - size, 0);
  const first = Math.min(offset, maxFirst);
  const last = Math.min(totalDays, first + size);
  const shiftBy = Math.max(size - 1, 1);

  const [selected, setSelected] = useState<RundownStop | null>(null);
  const [notice, setNotice] = useState("");
  const [prompt, setPrompt] = useState("");

  const viewportRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const detailRef = useRef<HTMLDialogElement>(null);
  const noticeRef = useRef<HTMLDialogElement>(null);

  const data = MOCK_RUNDOWN[day];
  // Seed berbeda tiap hari agar bentuk jalan Hari 1, 2, dst. tidak sama.
  const road = useMemo(
    () => buildRoad(data?.stops.length ?? 0, seed + day * 7919),
    [data, seed, day],
  );

  function centerViewport() {
    const el = viewportRef.current;
    el?.scrollTo({ left: 0, top: (el.scrollHeight - el.clientHeight) / 2 });
  }

  useEffect(centerViewport, []);

  function selectDay(next: number) {
    setDay(next);
    // Pastikan hari yang dipilih lewat keyboard tetap terlihat.
    if (next < first) setOffset(next);
    else if (next >= last) setOffset(next - size + 1);
    centerViewport();
  }

  function onTabKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const next = Math.min(Math.max(day + step, 0), totalDays - 1);
    selectDay(next);
    document.getElementById(`day-tab-${next}`)?.focus();
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    const el = viewportRef.current;
    if (!el || event.pointerType !== "mouse" || event.button !== 0) return;
    if ((event.target as HTMLElement).closest("button, a")) return;
    drag.current = { x: event.clientX, y: event.clientY, left: el.scrollLeft, top: el.scrollTop };
    el.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const el = viewportRef.current;
    if (!el || !drag.current) return;
    el.scrollLeft = drag.current.left - (event.clientX - drag.current.x);
    el.scrollTop = drag.current.top - (event.clientY - drag.current.y);
  }

  function endDrag() {
    drag.current = null;
  }

  function openStop(stop: RundownStop) {
    setSelected(stop);
    detailRef.current?.showModal();
  }

  function showNotice(message: string) {
    setNotice(message);
    noticeRef.current?.showModal();
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Brand />

          <nav className={styles.nav} aria-label="Menu utama">
            <Link className={`${styles.navItem} ${styles.navItemActive}`} href="/">
              <GridIcon />
              Main Menu
            </Link>
            <button
              className={styles.navItem}
              type="button"
              onClick={() => showNotice("Daftar rundown tersimpan belum tersedia di versi ini.")}
            >
              <BookmarkIcon />
              Rundown Tersimpan
            </button>
          </nav>

          <div className={styles.headerActions}>
            <button
              className={styles.secondaryAction}
              type="button"
              onClick={() => showNotice("Menyimpan rundown belum tersedia di versi ini.")}
              aria-label="Simpan Rundown"
            >
              <SaveIcon />
              <span className={styles.hideOnMobile}>Simpan Rundown</span>
            </button>
            <button
              className={styles.primaryAction}
              type="button"
              onClick={() => showNotice("Fitur akun belum tersedia pada tahap ini. Kamu tetap bisa melihat rundown sebagai tamu.")}
              aria-label="Masuk atau daftar"
            >
              <AccountIcon />
              <span className={styles.hideOnMobile}>Masuk / Daftar</span>
            </button>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        <p className={styles.panHint}>
          <PanIcon />
          Klik &amp; geser untuk panning canvas
        </p>

        <section className={styles.titleBar} aria-labelledby="rundown-title">
          <div className={styles.titleRow}>
            <h1 id="rundown-title">Rundown Liburan {city}</h1>
            <span className={styles.durationBadge}>
              {totalDays} Hari {nights > 0 ? `${nights} Malam` : ""}
            </span>
          </div>
          <p className={styles.subtitle}>
            Alur perjalanan horizontal disesuaikan dengan estimasi rute tercepat.
          </p>

          <div className={styles.dayTabs}>
            {paged && (
              <button
                className={styles.dayStep}
                type="button"
                aria-label="Geser ke hari sebelumnya"
                disabled={first === 0}
                onClick={() => setOffset(Math.max(first - shiftBy, 0))}
              >
                <ChevronLeftIcon />
              </button>
            )}
            <div className={styles.dayList} role="tablist" aria-label="Pilih hari">
              {Array.from({ length: last - first }, (_, i) => {
                const index = first + i;
                const title = MOCK_RUNDOWN[index]?.title;
                const active = index === day;
                return (
                  <button
                    key={index}
                    id={`day-tab-${index}`}
                    className={styles.dayTab}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    aria-controls="day-panel"
                    tabIndex={active ? 0 : -1}
                    title={title}
                    onClick={() => selectDay(index)}
                    onKeyDown={onTabKeyDown}
                  >
                    <span className={styles.dayDot} aria-hidden="true" />
                    <span className={styles.dayLabel}>
                      {active && title ? `Hari ke-${index + 1}: ${title}` : `Hari ke-${index + 1}`}
                    </span>
                    <span className={styles.srOnly}> dari {totalDays}</span>
                  </button>
                );
              })}
            </div>
            {paged && (
              <button
                className={styles.dayStep}
                type="button"
                aria-label="Geser ke hari berikutnya"
                disabled={last === totalDays}
                onClick={() => setOffset(Math.min(first + shiftBy, maxFirst))}
              >
                <ChevronRightIcon />
              </button>
            )}
          </div>
        </section>

        <div className={styles.canvasArea}>
          <div
            ref={viewportRef}
            id="day-panel"
            className={styles.viewport}
            role="tabpanel"
            aria-labelledby={`day-tab-${day}`}
            tabIndex={0}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          >
            {data ? (
              <div className={styles.flow}>
                <ol className={styles.road} style={{ width: road.width, height: road.height }}>
                  <svg className={styles.roadSvg} width={road.width} height={road.height} fill="none" aria-hidden="true">
                    <defs>
                      <marker id="road-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
                        <path className={styles.roadArrow} d="M 0 1 L 10 5 L 0 9 z" />
                      </marker>
                    </defs>
                    {road.segments.map((segment, i) => (
                      <path key={i} className={styles.roadPath} d={segment.d} markerEnd="url(#road-arrow)" />
                    ))}
                  </svg>

                  <li
                    className={`${styles.marker} ${styles.markerStart}`}
                    style={{ left: 0, top: road.startY - ICON / 2, width: MARKER_W }}
                  >
                    {data.startMarker.time && (
                      <span className={styles.markerTime}>{data.startMarker.time}</span>
                    )}
                    <span className={styles.markerIcon}>
                      {data.startMarker.photo ? (
                        <Image src={data.startMarker.photo} alt="" width={48} height={48} />
                      ) : (
                        <LocationIcon />
                      )}
                      <span className={styles.markerBadge}>1</span>
                    </span>
                    <span className={styles.markerLabel}>Start Point</span>
                    <span className={styles.markerPlace}>{data.startMarker.place}</span>
                  </li>

                  {data.stops.map((stop, index) => (
                    <li key={stop.name}>
                      <button
                        className={styles.card}
                        style={{ left: road.cards[index].x, top: road.cards[index].cy - CARD_H / 2 }}
                        type="button"
                        onClick={() => openStop(stop)}
                        aria-haspopup="dialog"
                      >
                        <span className={styles.cardTop}>
                          <span className={styles.pointBadge}>
                            <span className={styles.pointDot} aria-hidden="true" />
                            Titik {index + 1}
                          </span>
                          <span className={styles.cardTime}>{stop.time}</span>
                        </span>
                        <span className={styles.photo}>
                          {stop.photo ? (
                            <>
                              <Image src={stop.photo} alt="" fill sizes="288px" />
                              <span className={styles.photoLabel}>Ilustrasi AI</span>
                            </>
                          ) : (
                            <LocationIcon />
                          )}
                          <span className={styles.categoryChip}>{stop.category}</span>
                        </span>
                        <span className={styles.cardName}>{stop.name}</span>
                        <span className={styles.cardAddress}>
                          <LocationIcon />
                          <span>{stop.address}</span>
                        </span>
                        <span className={styles.cardFoot}>
                          <span>
                            <BrainIcon />
                            Tips AI Siap
                          </span>
                          <ArrowForwardIcon />
                        </span>
                      </button>
                    </li>
                  ))}

                  {road.segments.map((segment, i) => {
                    const label = i === 0 ? data.startMarker.toFirst : data.stops[i - 1]?.toNext;
                    return (
                      label && (
                        <li
                          key={`chip-${i}`}
                          className={styles.chip}
                          style={{ left: segment.midX, top: segment.midY }}
                        >
                          <CarIcon />
                          {label}
                          <span className={styles.srOnly}> (estimasi)</span>
                        </li>
                      )
                    );
                  })}

                  <li
                    className={`${styles.marker} ${styles.markerFinish}`}
                    style={{ left: road.finishX, top: road.endY - ICON / 2, width: MARKER_W }}
                  >
                    {data.finishMarker.time && (
                      <span className={styles.markerTime}>{data.finishMarker.time}</span>
                    )}
                    <span className={styles.markerIcon}>
                      <HotelIcon />
                      <span className={styles.markerBadge}>
                        <FlagIcon />
                      </span>
                    </span>
                    <span className={styles.markerLabel}>Rest &amp; Selesai</span>
                    <span className={styles.markerPlace}>{data.finishMarker.place}</span>
                  </li>
                </ol>
              </div>
            ) : (
              <p className={styles.empty}>Belum ada rundown untuk hari ini.</p>
            )}
          </div>
        </div>

        <div className={styles.promptDock}>
            <form
              className={styles.promptBar}
              onSubmit={(event) => {
                event.preventDefault();
                showNotice("Revisi rundown lewat prompt belum tersedia di versi ini. Instruksimu belum dikirim ke mana pun.");
              }}
            >
              <span className={styles.promptIcon} aria-hidden="true">
                <SparkleIcon />
              </span>
              <input
                className={styles.promptInput}
                type="text"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                maxLength={300}
                aria-label="Instruksi untuk mengubah rencana"
                placeholder="Tulis instruksi untuk ubah rencana destinasi... (misal: ganti makan siang, tambah spot kopi)"
              />
              {data && (
                <a
                  className={styles.mapsButton}
                  href={mapsRouteUrl(data)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MapIcon />
                  <span>
                    <span className={styles.hideOnMobile}>Buka di </span>Maps
                  </span>
                </a>
              )}
              <button className={styles.generateButton} type="submit">
                <SendIcon />
                <span className={styles.hideOnMobile}>Generate</span>
                <span className={styles.srOnly}>Kirim instruksi</span>
              </button>
            </form>
        </div>

        <SiteFooter />
      </main>

      <dialog
        ref={detailRef}
        className={`${styles.dialog} ${styles.detailDialog}`}
        aria-labelledby="stop-title"
        onClose={() => setSelected(null)}
        onClick={(event) => {
          if (event.target === event.currentTarget) detailRef.current?.close();
        }}
      >
        {selected && (
          <>
            <div className={styles.detailPhoto}>
              {selected.photo ? (
                <>
                  <Image src={selected.photo} alt="" fill sizes="448px" />
                  <span className={styles.photoLabel}>Ilustrasi AI</span>
                </>
              ) : (
                <LocationIcon />
              )}
              <span className={styles.detailCategory}>{selected.category}</span>
              <button
                className={styles.detailClose}
                type="button"
                onClick={() => detailRef.current?.close()}
                aria-label="Tutup"
              >
                <CloseIcon />
              </button>
            </div>
            <div className={styles.detailBody}>
              <h2 id="stop-title">{selected.name}</h2>
              <p className={styles.detailTime}>
                <ScheduleIcon />
                {selected.time}
              </p>
              <p className={styles.detailAddress}>
                <LocationIcon />
                {selected.address}
              </p>
              <div className={styles.detailNote}>
                <p>
                  <BrainIcon />
                  Catatan Algoritma plesir.app
                </p>
                <p>{selected.note}</p>
              </div>
              <div className={styles.detailActions}>
                <a
                  className={styles.mapsPrimary}
                  href={mapsStopUrl(selected)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <DirectionsIcon />
                  Buka di Google Maps
                </a>
                <button
                  className={styles.closeButton}
                  type="button"
                  onClick={() => detailRef.current?.close()}
                >
                  Tutup
                </button>
              </div>
            </div>
          </>
        )}
      </dialog>

      <dialog
        ref={noticeRef}
        className={`${styles.dialog} ${styles.noticeDialog}`}
        aria-labelledby="notice-title"
        onClick={(event) => {
          if (event.target === event.currentTarget) noticeRef.current?.close();
        }}
      >
        <h2 id="notice-title">Belum tersedia</h2>
        <p>{notice}</p>
        <button
          className={styles.closeButton}
          type="button"
          onClick={() => noticeRef.current?.close()}
        >
          Kembali
        </button>
      </dialog>
    </div>
  );
}
