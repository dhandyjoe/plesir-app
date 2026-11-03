"use client";

import { useEffect, useRef } from "react";
import type { RevisionOutcome } from "@/lib/itinerary";
import type { Change } from "@/lib/plan";
import { ProgressBar } from "./progress";
import styles from "./rundown.module.css";
import type { RevisionStatus } from "./use-revision";

export const wibTime = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  hour: "2-digit",
  minute: "2-digit",
});

const CHANGE_LABEL: Record<Change["kind"], string> = {
  added: "Ditambah",
  removed: "Dihapus",
  replaced: "Diganti",
  moved: "Dipindah",
  retimed: "Jam berubah",
  lodging: "Penginapan",
};

function describe(outcome: Exclude<RevisionOutcome, { kind: "proposal" }>) {
  if (outcome.kind !== "error") return outcome.message;
  switch (outcome.reason) {
    case "quota":
      return `Kuota AI hari ini sudah habis.${outcome.resetAt ? ` Coba lagi setelah pukul ${wibTime.format(new Date(outcome.resetAt))} WIB.` : ""}`;
    case "invalid":
      return "AI belum menghasilkan perubahan yang lolos pemeriksaan. Coba tulis instruksi dengan cara lain.";
    default:
      return "Layanan AI sedang tidak dapat dihubungi. Coba lagi beberapa saat lagi.";
  }
}

const REVISION_EXPECTED_MS = 60_000;
const REVISION_STAGES = [
  { from: 0, label: "Mengirim instruksi" },
  { from: 8, label: "AI menyusun perubahan" },
  { from: 75, label: "Memeriksa hasil" },
];

type Props = {
  status: RevisionStatus;
  canUndo: boolean;
  onApply: () => void;
  onDismiss: () => void;
  onUndo: () => void;
};

/** Status revisi di atas prompt bar, dan dialog preview "Sebelum → Sesudah" untuk usulan AI. */
export function RevisionPanel({ status, canUndo, onApply, onDismiss, onUndo }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const proposal = status.kind === "result" && status.outcome.kind === "proposal" ? status.outcome : null;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (proposal && !dialog.open) dialog.showModal();
    else if (!proposal && dialog.open) dialog.close();
  }, [proposal]);

  const startedAt = status.kind === "working" ? status.startedAt : undefined;
  const revising = startedAt !== undefined;
  let strip: string | null = null;
  if (status.kind === "working") {
    // Tanpa startedAt = apply/undo, yang selesai dalam sekejap.
    strip = status.startedAt ? null : "Menyimpan perubahan…";
  } else if (status.kind === "error") {
    strip = status.message;
  } else if (status.kind === "result" && status.outcome.kind !== "proposal") {
    strip = describe(status.outcome);
  }

  return (
    <>
      {(strip || revising || (status.kind === "idle" && canUndo)) && (
        <div className={styles.revisionStrip} role={revising ? undefined : "status"}>
          {strip ? <p>{strip}</p> : null}
          {revising && (
            <ProgressBar
              label="Kemajuan revisi rundown"
              startedAt={startedAt}
              expectedMs={REVISION_EXPECTED_MS}
              stages={REVISION_STAGES}
            />
          )}
          {status.kind === "idle" && canUndo && (
            <button className={styles.stripButton} type="button" onClick={onUndo}>
              Batalkan perubahan terakhir
            </button>
          )}
          {status.kind !== "idle" && status.kind !== "working" && (
            <button className={styles.stripButton} type="button" onClick={onDismiss}>
              Tutup
            </button>
          )}
        </div>
      )}

      <dialog
        ref={dialogRef}
        className={`${styles.dialog} ${styles.revisionDialog}`}
        aria-labelledby="revision-title"
        onClose={() => {
          // Esc menutup dialog; saat ditutup oleh kode (usulan sudah diterapkan) proposal sudah null.
          if (proposal) onDismiss();
        }}
      >
        {proposal && (
          <>
            <h2 id="revision-title">Usulan perubahan</h2>
            <p className={styles.revisionSummary}>{proposal.summary}</p>
            <ul className={styles.changeList}>
              {proposal.changes.map((change, i) => (
                <li key={i}>
                  <span className={styles.changeKind}>{CHANGE_LABEL[change.kind]}</span>
                  <span>
                    {change.day > 0 ? `Hari ${change.day} · ` : ""}
                    {change.to ? `${change.name} → ${change.to}` : change.name}
                    {change.detail ? ` (${change.detail})` : ""}
                  </span>
                </li>
              ))}
            </ul>
            <div className={styles.revisionActions}>
              <button className={styles.closeButton} type="button" onClick={onDismiss}>
                Batal
              </button>
              <button className={styles.applyButton} type="button" onClick={onApply}>
                Terapkan
              </button>
            </div>
          </>
        )}
      </dialog>
    </>
  );
}
