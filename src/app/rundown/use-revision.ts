"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { authFetch } from "@/lib/firebase/auth";
import type { ItineraryView, RevisionOutcome } from "@/lib/itinerary";
import type { RundownDay } from "@/lib/rundown";

const POLL_MS = 3000;

export type RevisionStatus =
  | { kind: "idle" }
  /** `startedAt` (ms epoch) ada untuk revisi AI; apply/undo cepat tanpa progress. */
  | { kind: "working"; startedAt?: number }
  | { kind: "login" }
  | { kind: "result"; outcome: RevisionOutcome }
  | { kind: "error"; message: string };

type Args = {
  dest: string;
  start: string;
  end: string;
  days: RundownDay[];
  warnings: string[];
  /** Itinerary yang sudah tersimpan (halaman dibuka dengan ?plan=). */
  saved: ItineraryView | null;
};

export type Reply<T> = { ok: true; data: T } | { ok: false; error: string; unauthorized?: boolean };

async function request<T>(url: string, init?: RequestInit): Promise<Reply<T>> {
  try {
    const response = await authFetch(url, init);
    const body: unknown = await response.json().catch(() => null);
    if (response.ok) return { ok: true, data: body as T };
    const error = (body as { error?: unknown } | null)?.error;
    return {
      ok: false,
      error: typeof error === "string" ? error : "Layanan revisi sedang tidak tersedia.",
      unauthorized: response.status === 401,
    };
  } catch {
    return { ok: false, error: "Koneksi terputus. Periksa jaringanmu lalu coba lagi." };
  }
}

/** 401 berarti belum login (atau sesi habis): minta masuk, bukan tampilkan error. */
const failed = (reply: { error: string; unauthorized?: boolean }): RevisionStatus =>
  reply.unauthorized ? { kind: "login" } : { kind: "error", message: reply.error };

const send = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

/**
 * Revisi rundown lewat prompt: buat itinerary (sekali), kirim instruksi, pantau usulan AI, lalu terapkan atau batalkan.
 * Server memvalidasi semuanya; hook ini hanya menyimpan keadaan tampilan.
 */
export function useRevision({ dest, start, end, days, warnings, saved }: Args) {
  const [view, setView] = useState<ItineraryView | null>(saved);
  const [status, setStatus] = useState<RevisionStatus>(() =>
    saved?.revision?.status === "running"
      ? { kind: "working", startedAt: Date.now() - saved.revision.elapsedMs }
      : { kind: "idle" },
  );
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Revisi pertama dan Simpan bisa bersamaan; keduanya memakai satu itinerary yang sama.
  const creating = useRef<Promise<Reply<ItineraryView>> | null>(null);

  const watch = useCallback((id: string) => {
    clearTimeout(timer.current);
    const tick = async () => {
      const next = await request<ItineraryView>(`/api/itineraries/${id}`, { cache: "no-store" });
      if (!next.ok) return setStatus(failed(next));
      setView(next.data);
      const { revision } = next.data;
      if (revision?.status === "running") timer.current = setTimeout(tick, POLL_MS);
      else if (revision) setStatus({ kind: "result", outcome: revision.outcome });
      else setStatus({ kind: "error", message: "Revisi terhenti. Coba kirim ulang instruksimu." });
    };
    timer.current = setTimeout(tick, POLL_MS);
  }, []);

  // Halaman dimuat ulang saat revisi masih berjalan: lanjutkan memantau.
  useEffect(() => {
    if (saved?.revision?.status === "running") watch(saved.id);
    return () => clearTimeout(timer.current);
  }, [saved, watch]);

  /** Itinerary yang sedang dilihat, dibuat sekali bila belum ada (`save` langsung menyimpannya). */
  function ensureView(save: boolean): Promise<Reply<ItineraryView>> {
    if (view) return Promise.resolve({ ok: true, data: view });
    creating.current ??= request<ItineraryView>("/api/itineraries", send("POST", { dest, start, end, save })).then(
      (created) => {
        creating.current = null;
        if (created.ok) {
          setView(created.data);
          // id di URL: muat ulang halaman tetap menampilkan rundown ini.
          const url = new URL(window.location.href);
          url.searchParams.set("plan", created.data.id);
          window.history.replaceState(null, "", url);
        }
        return created;
      },
    );
    return creating.current;
  }

  async function submit(prompt: string) {
    setStatus({ kind: "working", startedAt: Date.now() });
    const created = await ensureView(false);
    if (!created.ok) return setStatus(failed(created));
    const current = created.data;
    const started = await request<unknown>(
      `/api/itineraries/${current.id}/revisions`,
      send("POST", { prompt, expectedVersion: current.version }),
    );
    if (!started.ok) return setStatus(failed(started));
    watch(current.id);
  }

  /** true bila usulan berhasil diterapkan. */
  async function apply() {
    if (!view || status.kind !== "result" || status.outcome.kind !== "proposal") return false;
    const { proposalId } = status.outcome;
    setStatus({ kind: "working" });
    const done = await request<ItineraryView>(
      `/api/itineraries/${view.id}`,
      send("PATCH", { action: "apply", proposalId, expectedVersion: view.version }),
    );
    if (!done.ok) {
      setStatus(failed(done));
      return false;
    }
    setView(done.data);
    setStatus({ kind: "idle" });
    return true;
  }

  async function undo() {
    if (!view) return;
    setStatus({ kind: "working" });
    const done = await request<ItineraryView>(
      `/api/itineraries/${view.id}`,
      send("PATCH", { action: "undo", expectedVersion: view.version }),
    );
    if (!done.ok) return setStatus(failed(done));
    setView(done.data);
    setStatus({ kind: "idle" });
  }

  /** Simpan ke Rundown Tersimpan; tidak mengubah status revisi yang sedang berjalan. */
  async function save(): Promise<Reply<ItineraryView>> {
    const current = await ensureView(true);
    if (!current.ok || current.data.saved) return current;
    const done = await request<ItineraryView>(`/api/itineraries/${current.data.id}`, send("PATCH", { action: "save" }));
    if (done.ok) setView(done.data);
    return done;
  }

  return {
    days: view?.days ?? days,
    warnings: view?.warnings ?? warnings,
    canUndo: view?.canUndo ?? false,
    saved: view?.saved ?? false,
    status,
    submit,
    apply,
    undo,
    save,
    dismiss: () => setStatus({ kind: "idle" }),
  };
}
