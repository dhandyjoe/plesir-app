"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useState } from "react";
import { authFetch } from "@/lib/firebase/auth";
import type { ItineraryView } from "@/lib/itinerary";
import type { PlanJob } from "@/lib/plan-job";
import { Notice } from "./notice";
import { ProgressBar } from "./progress";
import { wibTime } from "./revision-panel";
import { RundownView } from "./rundown-view";
import styles from "./rundown.module.css";

const POLL_MS = 3000;
const EXPECTED_MS = 120_000;
/** Jeda singkat di 100% sebelum rundown muncul. */
const DONE_MS = 600;
const STAGES = [
  { from: 0, label: "Mengambil data tempat dari OpenStreetMap" },
  { from: 10, label: "AI memilih tempat dan menyusun jadwal" },
  { from: 70, label: "Memeriksa jam buka dan waktu makan" },
  { from: 88, label: "Menambahkan foto dan estimasi rute" },
];
const UNAVAILABLE: PlanJob = { status: "finished", result: { ok: false, reason: "unavailable" } };

type Props = {
  dest: string;
  city: string;
  start: string;
  end: string;
  seed: number;
  /** Itinerary hasil revisi sebelumnya (?plan=); dipakai alih-alih menyusun ulang. */
  planId?: string;
  attribution: string;
};

export function PlanLoader({ dest, city, start, end, seed, planId, attribution }: Props) {
  const [job, setJob] = useState<PlanJob>({ status: "running" });
  const [saved, setSaved] = useState<ItineraryView | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    // POST memulai (atau memakai ulang) job; GET memantau sampai selesai.
    async function check(first: boolean) {
      if (first && planId) {
        // Rencana hasil revisi tersimpan: tampilkan langsung. Bila hilang/kedaluwarsa, bukan milik akun ini, atau
        // pengguna belum login, jatuh ke penyusunan biasa (tamu tetap bisa melihat rundown; mengedit meminta login).
        const itinerary = await authFetch(`/api/itineraries/${planId}`, { cache: "no-store" })
          .then((response) => (response.ok ? (response.json() as Promise<ItineraryView>) : null))
          .catch(() => null);
        if (cancelled) return;
        if (itinerary) {
          setSaved(itinerary);
          setJob({ status: "finished", result: { ok: true, days: itinerary.days, warnings: itinerary.warnings } });
          return;
        }
      }
      let next = UNAVAILABLE;
      try {
        const response = first
          ? await fetch("/api/plans", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ dest, start, end }),
            })
          : await fetch(`/api/plans?${new URLSearchParams({ dest, start, end })}`, {
              cache: "no-store",
            });
        if (response.ok) next = (await response.json()) as PlanJob;
      } catch {
        // Jaringan putus: tampil sebagai "tidak tersedia" dengan tombol coba lagi.
      }
      if (cancelled) return;
      if (first && next.status === "running" && next.elapsedMs) setStartedAt(Date.now() - next.elapsedMs);
      if (next.status === "running") {
        setJob(next);
        timer = setTimeout(() => check(false), POLL_MS);
      } else if (!first && next.result.ok) {
        // Hasil baru selesai di depan mata pengguna: tunjukkan 100% sebentar.
        setDone(true);
        timer = setTimeout(() => setJob(next), DONE_MS);
      } else setJob(next);
    }

    check(true);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [dest, start, end, planId, attempt]);

  // Rundown tidak disimpan di klien. Next.js (cacheComponents) menyembunyikan halaman lama alih-alih membuangnya,
  // dan props baru tidak mereset state; cleanup ini berjalan saat halaman disembunyikan, perjalanan berganti, atau coba lagi.
  useLayoutEffect(
    () => () => {
      setJob({ status: "running" });
      setStartedAt(Date.now());
      setDone(false);
      setSaved(null);
    },
    [dest, start, end, planId, attempt],
  );

  const retry = () => setAttempt((n) => n + 1);

  if (job.status === "running") {
    return (
      <Notice title={`Menyusun rundown destinasi ke ${city}…`} busy>
        <ProgressBar
          label="Kemajuan penyusunan rundown"
          startedAt={startedAt}
          expectedMs={EXPECTED_MS}
          stages={STAGES}
          done={done}
        />
        <p>Persentase adalah perkiraan. Halaman ini akan terbarui sendiri.</p>
      </Notice>
    );
  }

  const { result } = job;
  if (result.ok) {
    return (
      <RundownView
        dest={dest}
        city={city}
        start={start}
        end={end}
        seed={seed}
        saved={saved}
        days={result.days}
        warnings={result.warnings}
        attribution={attribution}
      />
    );
  }

  const back = (
    <Link className={styles.primaryLink} href="/">
      Kembali ke Main Menu
    </Link>
  );
  const tryAgain = (
    <button className={styles.primaryLink} type="button" onClick={retry}>
      Coba lagi
    </button>
  );

  switch (result.reason) {
    case "quota":
      return (
        <Notice title="Kuota harian sudah habis">
          <p>
            Batas penyusunan rencana hari ini sudah tercapai. Coba lagi setelah pukul{" "}
            {wibTime.format(new Date(result.resetAt))} WIB.
          </p>
          {back}
        </Notice>
      );
    case "no_places":
      return (
        <Notice title={`Data tempat di ${city} belum cukup`}>
          <p>
            Tempat wisata dan kuliner yang tercatat di OpenStreetMap untuk wilayah ini terlalu
            sedikit untuk menyusun rundown yang layak. Coba kota lain atau perjalanan yang lebih
            singkat.
          </p>
          {back}
        </Notice>
      );
    case "invalid":
      return (
        <Notice title="Rencana belum berhasil disusun">
          <p>AI belum menghasilkan jadwal yang lolos pemeriksaan. Coba lagi beberapa saat lagi.</p>
          {tryAgain}
        </Notice>
      );
    default:
      return (
        <Notice title="Layanan sedang tidak tersedia">
          <p>Data tempat atau layanan AI sedang tidak dapat dihubungi. Coba lagi beberapa saat lagi.</p>
          {tryAgain}
        </Notice>
      );
  }
}
