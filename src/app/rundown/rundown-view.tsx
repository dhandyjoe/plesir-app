"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import { AccountMenu } from "@/components/account-menu";
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
import { SiteNav } from "@/components/site-nav";
import { loginHref } from "@/lib/auth-form";
import { useAuthUser } from "@/lib/firebase/auth";
import type { ItineraryView } from "@/lib/itinerary";
import { formatLeg } from "@/lib/route";
import { mapsRouteUrl, mapsStopUrl, type Marker, type RundownDay, type RundownStop } from "@/lib/rundown";
import { buildRoad, CARD_H, ICON, MARKER_W } from "./road-layout";
import { LeaveDialog } from "./leave-dialog";
import { LoginDialog, SAVED_PATH, type LoginReason } from "./login-dialog";
import { RevisionPanel } from "./revision-panel";
import styles from "./rundown.module.css";
import { useRevision } from "./use-revision";

/** Penginapan jadi tautan ke Google Maps; marker tanpa koordinat (placeholder) tetap teks biasa. */
function MarkerBody({ marker, children }: { marker: Marker; children: ReactNode }) {
  if (marker.lat == null || marker.lng == null) return children;
  return (
    <a className={styles.markerLink} href={mapsStopUrl(marker)} target="_blank" rel="noopener noreferrer">
      {children}
      <span className={styles.srOnly}> (buka di Google Maps)</span>
    </a>
  );
}

/** Foto dengan atribusi berasal dari Wikimedia Commons; tanpa itu ilustrasi mock. */
const photoLabel = (stop: RundownStop) => (stop.photoCredit ? "Foto: Wikimedia" : "Ilustrasi AI");

const NARROW ="(max-width: 47.999rem)";
const subscribeNarrow = (cb: () => void) => {
  const mq = window.matchMedia(NARROW);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};

type Props = {
  dest: string;
  city: string;
  start: string;
  end: string;
  seed: number;
  days: RundownDay[];
  warnings: string[];
  /** Itinerary tersimpan bila halaman dibuka dengan ?plan=. */
  saved: ItineraryView | null;
  attribution: string;
};

export function RundownView({ dest, city, start, end, seed, days: initialDays, warnings: initialWarnings, saved, attribution }: Props) {
  const user = useAuthUser();
  const revision = useRevision({ dest, start, end, days: initialDays, warnings: initialWarnings, saved });
  const { days } = revision;
  // shortcut: rencana lama masih menyimpan warning ini; hapus filter bila job/itinerary lama sudah kedaluwarsa semua.
  const warnings = revision.warnings.filter((warning) => !warning.startsWith("Jam buka belum terverifikasi"));
  const working = revision.status.kind === "working";
  const totalDays = days.length;
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
  const [notice, setNotice] = useState<{ title: string; message: string; saved?: boolean } | null>(null);
  const [saving, setSaving] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [loginReason, setLoginReason] = useState<LoginReason | null>(null);
  const here = loginHref(usePathname(), useSearchParams().toString());
  // 401 dari server (mis. sesi habis) juga membuka dialog yang sama.
  const dialogReason = loginReason ?? (revision.status.kind === "login" ? "edit" : null);
  const canSend = !working && prompt.trim().length >= 3;

  const viewportRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const detailRef = useRef<HTMLDialogElement>(null);
  const noticeRef = useRef<HTMLDialogElement>(null);

  const data = days[day];
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

  function showNotice(next: NonNullable<typeof notice>) {
    setNotice(next);
    noticeRef.current?.showModal();
  }

  async function save() {
    if (user === null) return setLoginReason("save");
    setSaving(true);
    const result = await revision.save();
    setSaving(false);
    if (result.ok) {
      showNotice({
        title: "Rundown tersimpan",
        message: `Rundown ${city} ada di Rundown Tersimpan dan tidak kedaluwarsa. Kamu tetap bisa mengubahnya lewat instruksi AI.`,
        saved: true,
      });
    } else if (result.unauthorized) setLoginReason("save");
    else showNotice({ title: "Belum bisa menyimpan", message: result.error });
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Brand />

          <SiteNav />

          <div className={styles.headerActions}>
            <button
              className={styles.secondaryAction}
              type="button"
              onClick={save}
              disabled={saving}
              aria-label={revision.saved ? "Rundown tersimpan" : "Simpan Rundown"}
            >
              {revision.saved ? <BookmarkIcon /> : <SaveIcon />}
              <span className={styles.hideOnMobile}>
                {revision.saved ? "Tersimpan" : saving ? "Menyimpan…" : "Simpan Rundown"}
              </span>
            </button>
            <AccountMenu
              className={styles.primaryAction}
              guest={
                <>
                  <AccountIcon />
                  <span className={styles.hideOnMobile}>Masuk / Daftar</span>
                </>
              }
            />
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
          {warnings.length > 0 && (
            <ul className={styles.warnings} aria-label="Catatan data">
              {warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          )}

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
                const title = days[index]?.title;
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
          <p className={styles.attribution}>{attribution}</p>
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
                    <MarkerBody marker={data.startMarker}>
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
                    </MarkerBody>
                  </li>

                  {data.stops.map((stop, index) => (
                    <li key={stop.placeId ?? stop.name}>
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
                              {/* alt kosong: nama tempat sudah dibaca dari teks kartu yang sama. */}
                              <Image src={stop.photo} alt="" fill sizes="288px" />
                              <span className={styles.photoLabel}>{photoLabel(stop)}</span>
                            </>
                          ) : (
                            <span className={styles.photoEmpty}>
                              <LocationIcon />
                              Foto belum tersedia
                            </span>
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
                    const leg = i < data.stops.length ? data.stops[i].fromPrev : data.finishMarker.fromPrev;
                    return (
                      leg && (
                        <li
                          key={`chip-${i}`}
                          className={styles.chip}
                          style={{ left: segment.midX, top: segment.midY }}
                        >
                          <CarIcon />
                          {formatLeg(leg)}
                          <span className={styles.srOnly}> (estimasi berkendara)</span>
                        </li>
                      )
                    );
                  })}

                  <li
                    className={`${styles.marker} ${styles.markerFinish}`}
                    style={{ left: road.finishX, top: road.endY - ICON / 2, width: MARKER_W }}
                  >
                    <MarkerBody marker={data.finishMarker}>
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
                    </MarkerBody>
                  </li>
                </ol>
              </div>
            ) : (
              <p className={styles.empty}>Belum ada rundown untuk hari ini.</p>
            )}
          </div>
        </div>

        <div className={styles.promptDock}>
            <RevisionPanel
              status={revision.status}
              canUndo={revision.canUndo}
              onApply={async () => {
                if (await revision.apply()) setPrompt("");
              }}
              onDismiss={revision.dismiss}
              onUndo={revision.undo}
            />
            <form
              className={styles.promptBar}
              onSubmit={(event) => {
                event.preventDefault();
                if (!canSend) return;
                if (user === null) setLoginReason("edit");
                else revision.submit(prompt.trim());
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
                disabled={working}
                aria-label="Instruksi untuk mengubah rencana"
                placeholder="Tulis instruksi untuk ubah rencana destinasi... (misal: ganti makan siang hari 2 dengan kafe)"
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
              <button className={styles.generateButton} type="submit" disabled={!canSend}>
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
                  <Image src={selected.photo} alt={`Foto ${selected.name}`} fill sizes="448px" />
                  <span className={styles.photoLabel}>{photoLabel(selected)}</span>
                </>
              ) : (
                <span className={styles.photoEmpty}>
                  <LocationIcon />
                  Foto belum tersedia
                </span>
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
              {selected.photoCredit && (
                <p className={styles.photoCredit}>
                  Foto: {selected.photoCredit.author} · {selected.photoCredit.license} ·{" "}
                  <a href={selected.photoCredit.source} target="_blank" rel="noopener noreferrer">
                    Sumber di Wikimedia Commons
                  </a>
                </p>
              )}
              <div className={styles.detailNote}>
                <p>
                  <BrainIcon />
                  Catatan AI plesir.app
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

      <LeaveDialog active={!revision.saved} />

      <LoginDialog
        reason={dialogReason}
        href={here}
        onClose={() => {
          setLoginReason(null);
          if (revision.status.kind === "login") revision.dismiss();
        }}
      />

      <dialog
        ref={noticeRef}
        className={`${styles.dialog} ${styles.noticeDialog}`}
        aria-labelledby="notice-title"
        onClick={(event) => {
          if (event.target === event.currentTarget) noticeRef.current?.close();
        }}
      >
        <h2 id="notice-title">{notice?.title}</h2>
        <p>{notice?.message}</p>
        <div className={styles.noticeActions}>
          {notice?.saved && (
            <Link className={styles.primaryLink} href={SAVED_PATH}>
              Lihat Rundown Tersimpan
            </Link>
          )}
          <button
            className={styles.closeButton}
            type="button"
            onClick={() => noticeRef.current?.close()}
          >
            Kembali
          </button>
        </div>
      </dialog>
    </div>
  );
}
